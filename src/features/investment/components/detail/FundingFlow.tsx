import type { ReactNode } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { formatNumber } from '@/utils';
import type { FundingActionKind } from '../../hooks/useFundingActions';
import { FUNDING_STAGES, STAGE_INDEX, describeFundingWindow, isOverdue, type ListingStageView } from '../../stage';
import type { ApproveListingRequest, FundingProgress, InvestmentNote, ListingInvestor, MarketListing } from '../../types';
import { formatDateTime } from '../../formatters';
import { ApproveForm } from './ApproveForm';

interface Props {
  listing: MarketListing;
  stage: ListingStageView;
  investors: ListingInvestor[];
  investorsError: unknown;
  onRetryInvestors: () => void;
  progress: FundingProgress | undefined;
  probeNotes: InvestmentNote[] | undefined;
  defaultFundingDays: number;
  busy: FundingActionKind | null;
  errorOf: (kind: FundingActionKind) => unknown;
  onApprove: (request: ApproveListingRequest) => void;
  onFinalize: () => void;
  onActivate: () => void;
  onCloseExpired: () => void;
}

const svgProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 3,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
} as const;

const CheckIcon = () => <svg {...svgProps}><path d="M20 6 9 17l-5-5" /></svg>;
const CrossIcon = () => <svg {...svgProps}><path d="M18 6 6 18M6 6l12 12" /></svg>;

/** Nút hành động của một bước, kèm lỗi của đúng thao tác đó. */
function StepButton({ kind, label, busyLabel, tone = 'primary', hint, props }: {
  kind: FundingActionKind;
  label: string;
  busyLabel: string;
  tone?: 'primary' | 'danger';
  hint?: string;
  props: Pick<Props, 'busy' | 'errorOf'> & { onClick: () => void };
}) {
  const error = props.errorOf(kind);
  return (
    <div className="fd-work">
      <button type="button" className={`ui-btn ${tone} fd-block`} disabled={props.busy !== null} onClick={props.onClick}>
        {props.busy === kind ? busyLabel : label}
      </button>
      {hint && <p className="fd-hint">{hint}</p>}
      {error ? <ErrorNotice error={error} /> : null}
    </div>
  );
}

/**
 * Tiến trình năm bước của một khoản vay trên sàn, vẽ dọc. Bước nào đang chờ quản trị thì
 * nút của bước đó nằm ngay bên dưới; chỉ bước kế tiếp bấm được, đúng thứ tự backend nhận.
 * Trạng thái bước không chỉ đọc bằng màu: bước xong có dấu tick, bước đang tới có
 * `aria-current`, khoản dừng giữa chừng có dấu chéo và chữ giải thích.
 */
export function FundingFlow(props: Props) {
  const { listing, stage, investors, progress, probeNotes } = props;
  const overdue = isOverdue(listing);
  const stopAt = stage.terminal === 'CLOSED' ? STAGE_INDEX.FUNDED : stage.terminal === 'CANCELLED' ? STAGE_INDEX.OPEN : -1;
  const liveNotes = investors.filter((item) => item.status !== 'CANCELLED').reduce((sum, item) => sum + item.noteCount, 0);

  const stepTime = (index: number): ReactNode => {
    if (index === STAGE_INDEX.OPEN && listing.status === 'OPEN') {
      const tone = describeFundingWindow(listing.fundingClosesAt).tone;
      return <span className={tone === 'normal' ? undefined : tone}>Hạn {formatDateTime(listing.fundingClosesAt)}</span>;
    }
    if (index === STAGE_INDEX.FUNDED && progress?.fullyFundedAt) return formatDateTime(progress.fullyFundedAt);
    if (index === STAGE_INDEX.NOTES_ISSUED && probeNotes?.[0]) return formatDateTime(probeNotes[0].issuedAt);
    return null;
  };

  const stepWork = (index: number): ReactNode => {
    if (index === STAGE_INDEX.DRAFT && stage.nextAction === 'APPROVE') {
      return (
        <ApproveForm
          key={props.defaultFundingDays}
          listing={listing}
          defaultFundingDays={props.defaultFundingDays}
          submitting={props.busy === 'approve'}
          disabled={props.busy !== null}
          error={props.errorOf('approve')}
          onSubmit={props.onApprove}
        />
      );
    }
    if (index === STAGE_INDEX.OPEN && overdue) {
      return (
        <StepButton
          kind="close" label="Đóng khoản quá hạn" busyLabel="Đang đóng..." tone="danger"
          hint="Đóng mọi khoản đã quá hạn gọi vốn; tiền giữ chỗ trả về ví nhà đầu tư."
          props={{ ...props, onClick: props.onCloseExpired }}
        />
      );
    }
    if (index === STAGE_INDEX.FINALIZED) {
      if (props.investorsError) return <div className="fd-work"><ErrorNotice error={props.investorsError} onRetry={props.onRetryInvestors} /></div>;
      if (listing.status === 'FULLY_FUNDED' && stage.pending && stage.steps[index] !== 'done') {
        return <p className="fd-hint" aria-busy="true">Đang kiểm tra phần vốn...</p>;
      }
      if (stage.nextAction === 'FINALIZE') {
        return (
          <StepButton
            kind="finalize" label="Khóa vốn" busyLabel="Đang khóa vốn..."
            hint="Sau bước này nhà đầu tư không hủy lệnh được nữa."
            props={{ ...props, onClick: props.onFinalize }}
          />
        );
      }
    }
    if (index === STAGE_INDEX.NOTES_ISSUED && stage.nextAction === 'ACTIVATE_NOTES') {
      return (
        <StepButton
          kind="activate" label={`Phát hành ${formatNumber(liveNotes)} Note`} busyLabel="Đang phát hành..."
          props={{ ...props, onClick: props.onActivate }}
        />
      );
    }
    return null;
  };

  return (
    <aside className="ui-card fd-flow" aria-labelledby="fdFlowTitle">
      <h2 id="fdFlowTitle">Tiến trình</h2>
      <ol>
        {FUNDING_STAGES.map((step, index) => {
          if (index === stopAt) {
            return (
              <li key={step.key} className="stop" aria-current="step">
                <span className="dot"><CrossIcon /></span>
                <div className="fd-step-body">
                  <span className="fd-step-name">{stage.terminal === 'CLOSED' ? 'Đã đóng vì hết hạn' : 'Đã hủy'}</span>
                  <span className="fd-step-time">
                    {stage.terminal === 'CLOSED'
                      ? `Hạn ${formatDateTime(listing.fundingClosesAt)}, chưa gọi đủ vốn`
                      : 'Khoản vay đã bị rút khỏi sàn'}
                  </span>
                </div>
              </li>
            );
          }
          if (stopAt !== -1 && index > stopAt) {
            return (
              <li key={step.key} className="skip">
                <span className="dot">{index + 1}</span>
                <div className="fd-step-body"><span className="fd-step-name">{step.label}</span></div>
              </li>
            );
          }
          const state = overdue && index === STAGE_INDEX.OPEN ? 'late' : stage.steps[index] ?? 'todo';
          const time = stepTime(index);
          return (
            <li key={step.key} className={state} aria-current={state === 'current' || state === 'late' ? 'step' : undefined}>
              <span className="dot">{state === 'done' ? <CheckIcon /> : index + 1}</span>
              <div className="fd-step-body">
                <span className="fd-step-name">{step.label}</span>
                {time && <span className="fd-step-time">{time}</span>}
                {stepWork(index)}
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
