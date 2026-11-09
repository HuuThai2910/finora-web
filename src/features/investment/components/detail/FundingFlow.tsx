import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { formatNumber } from '@/utils';
import type { FundingActionKind } from '../../hooks/useFundingActions';
import { FUNDING_STAGES, STAGE_INDEX, describeFundingWindow, isOverdue, type ListingStageView } from '../../stage';
import type { FundingProgress, InvestmentNote, ListingInvestor, MarketListing } from '../../types';
import { LISTING_CANCELLATION_LABEL } from '../../constants';
import { formatDateTime } from '../../formatters';
import { fundedWaitLabel } from '../../mappers/listingDisplay';
import { ErrorToast } from '@/components/ErrorToast';

interface Props {
  listing: MarketListing;
  stage: ListingStageView;
  investors: ListingInvestor[];
  investorsError: unknown;
  onRetryInvestors: () => void;
  progress: FundingProgress | undefined;
  probeNotes: InvestmentNote[] | undefined;
  busy: FundingActionKind | null;
  /** Có quyền Thao tác "Gọi vốn"; không có thì tiến trình chỉ để xem, không hiện nút sửa lỗi. */
  canAct: boolean;
  /** Có quyền Xem "Bằng chứng blockchain": hiện lối xác minh đợt phát hành Note. */
  canViewProofs: boolean;
  errorOf: (kind: FundingActionKind) => unknown;
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

/*
 * Một bước (li): lớp trạng thái `done`, `current`, `late`, `stop`, `skip` gắn từ JS. Vạch nối xuống bước sau là
 * ::before, bỏ ở bước cuối; bước đã xong thì vạch xanh.
 */
const STEP =
  "relative grid grid-cols-[22px_minmax(0,1fr)] gap-2.5 pb-4 last:pb-0 not-last:before:content-[''] " +
  'not-last:before:absolute not-last:before:top-6 not-last:before:bottom-0.5 not-last:before:left-2.5 ' +
  'not-last:before:w-0.5 not-last:before:bg-line [&.done]:not-last:before:bg-brand [&.skip]:opacity-45';
/** Chấm tròn đầu bước, đổi màu theo trạng thái của bước (li cha). */
const DOT =
  'dot grid place-items-center size-5.5 border-2 border-line-strong rounded-[50%] bg-white text-muted text-[11px] ' +
  'font-semibold [&_svg]:size-2.75 in-[li.done]:border-brand in-[li.done]:bg-brand in-[li.done]:text-white ' +
  'in-[li.current]:border-brand in-[li.current]:text-brand in-[li.late]:border-danger in-[li.late]:text-danger ' +
  'in-[li.stop]:border-danger in-[li.stop]:bg-danger in-[li.stop]:text-white';
const STEP_BODY = 'fd-step-body grid gap-0.5 min-w-0 pt-px';
const STEP_NAME =
  'fd-step-name text-secondary text-[14px] in-[li.done]:text-primary in-[li.current]:text-brand ' +
  'in-[li.current]:font-semibold in-[li.late]:text-danger in-[li.late]:font-semibold in-[li.stop]:text-danger ' +
  'in-[li.stop]:font-semibold';
const STEP_TIME = 'fd-step-time text-muted text-[12px] tabular-nums';
const HINT = 'fd-hint text-muted text-[12px]';

const CheckIcon = () => <svg {...svgProps}><path d="M20 6 9 17l-5-5" /></svg>;
const CrossIcon = () => <svg {...svgProps}><path d="M18 6 6 18M6 6l12 12" /></svg>;

/** Nút hành động của một bước, kèm lỗi của đúng thao tác đó. */
function StepButton({ kind, label, busyLabel, hint, props }: {
  kind: FundingActionKind;
  label: string;
  busyLabel: string;
  hint?: string;
  props: Pick<Props, 'busy' | 'errorOf' | 'canAct'> & { onClick: () => void };
}) {
  const error = props.errorOf(kind);
  if (!props.canAct) return null;
  return (
    <div className="fd-work grid gap-2.5 mt-2">
      <button type="button" className="ui-btn primary fd-block w-full h-9" disabled={props.busy !== null} onClick={props.onClick}>
        {props.busy === kind ? busyLabel : label}
      </button>
      {hint && <p className={HINT}>{hint}</p>}
      {error ? <ErrorToast error={error} /> : null}
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
  // Hủy sau khi đủ vốn (Loan gửi lý do) dừng ở bước khóa vốn; hủy không lý do giữ hành vi cũ ở bước gọi vốn.
  const cancelledAfterFunding = listing.cancellationReason != null;
  const stopAt = stage.terminal === 'CLOSED'
    ? STAGE_INDEX.FUNDED
    : stage.terminal === 'CANCELLED'
      ? (cancelledAfterFunding ? STAGE_INDEX.FINALIZED : STAGE_INDEX.OPEN)
      : -1;
  const cancelledDetail = cancelledAfterFunding
    ? [
        LISTING_CANCELLATION_LABEL[listing.cancellationReason ?? ''] ?? listing.cancellationReason,
        listing.cancelledAt ? formatDateTime(listing.cancelledAt) : null,
        'tiền giữ được trả lại ví nhà đầu tư',
      ].filter(Boolean).join(' · ')
    : 'Khoản vay đã bị rút khỏi sàn';
  const liveNotes = investors.filter((item) => item.status !== 'CANCELLED').reduce((sum, item) => sum + item.noteCount, 0);

  const stepTime = (index: number): ReactNode => {
    if (index === STAGE_INDEX.OPEN && listing.status === 'OPEN') {
      const tone = describeFundingWindow(listing.fundingClosesAt).tone;
      const toneClass = tone === 'warning' ? 'warning text-warning' : tone === 'expired' ? 'expired text-danger' : undefined;
      return <span className={toneClass}>Hạn {formatDateTime(listing.fundingClosesAt)}</span>;
    }
    if (index === STAGE_INDEX.FUNDED && progress?.fullyFundedAt) return formatDateTime(progress.fullyFundedAt);
    // Khóa vốn chạy ngay khi khoản vay giải ngân, nên mốc giải ngân đặt ở bước này.
    if (index === STAGE_INDEX.FINALIZED && listing.disbursedAt) return `Giải ngân ${formatDateTime(listing.disbursedAt)}`;
    if (index === STAGE_INDEX.NOTES_ISSUED && probeNotes?.[0]) return formatDateTime(probeNotes[0].issuedAt);
    return null;
  };

  const stepWork = (index: number): ReactNode => {
    if (index === STAGE_INDEX.DRAFT && listing.status === 'DRAFT') {
      return (
        <p className={HINT}>
          Bản nháp từ luồng cũ. Khoản vay hiện tự lên sàn và mở gọi vốn, không cần duyệt trên web.
        </p>
      );
    }
    // Đóng khoản quá hạn đi qua hộp xác nhận (liệt kê mọi khoản sẽ bị đóng, vì backend đóng cả loạt chứ không riêng khoản này).
    if (index === STAGE_INDEX.OPEN && overdue && props.canAct) {
      return (
        <div className="fd-work grid gap-2.5 mt-2">
          <button type="button" className="ui-btn danger fd-block w-full h-9" disabled={props.busy !== null} onClick={props.onCloseExpired}>
            Đóng khoản quá hạn
          </button>
          <p className={HINT}>Đóng mọi khoản đã quá hạn gọi vốn; tiền giữ chỗ trả về ví nhà đầu tư.</p>
        </div>
      );
    }
    if (index === STAGE_INDEX.FINALIZED) {
      if (props.investorsError) return <div className="fd-work grid gap-2.5 mt-2"><ErrorNotice error={props.investorsError} onRetry={props.onRetryInvestors} /></div>;
      if (listing.status === 'FULLY_FUNDED' && stage.pending && stage.steps[index] !== 'done') {
        return <p className={HINT} aria-busy="true">Đang kiểm tra các khoản góp vốn...</p>;
      }
      if (stage.awaitingDisbursement) {
        // Cùng câu với nhãn trạng thái ở đầu trang và bảng danh sách (`fundedWaitLabel`).
        return (
          <p className={HINT}>
            <b className="fd-wait text-secondary font-semibold">{fundedWaitLabel(listing) ?? 'Chờ giải ngân'}.</b>{' '}
            Hệ thống tự khóa vốn và phát hành phần vốn khi khoản vay được giải ngân; đến lúc đó tiền nhà đầu tư vẫn chỉ được
            giữ trong ví.
          </p>
        );
      }
      if (stage.nextAction === 'FINALIZE') {
        return (
          <StepButton
            kind="finalize" label="Khóa vốn (sửa lỗi)" busyLabel="Đang khóa vốn..."
            hint="Chỉ dùng khi khoản vay đã giải ngân mà các khoản góp vốn chưa được khóa tự động."
            props={{ ...props, onClick: props.onFinalize }}
          />
        );
      }
    }
    // Đợt phát hành Note được neo lên blockchain theo mã khoản gọi vốn (ProofMilestone NOTE_OWNERSHIP_CHANGED, ISSUED).
    if (index === STAGE_INDEX.NOTES_ISSUED && stage.steps[index] === 'done' && props.canViewProofs) {
      return (
        <Link
          className="ui-link fd-proof-link w-max text-[12px]"
          to={`/blockchain/proofs?referenceType=NOTE_ISSUANCE&referenceId=${listing.listingId}`}
        >
          Xác minh phát hành phần vốn
        </Link>
      );
    }
    if (index === STAGE_INDEX.NOTES_ISSUED && stage.nextAction === 'ACTIVATE_NOTES') {
      return (
        <StepButton
          kind="activate" label={`Phát hành ${formatNumber(liveNotes)} phần vốn (sửa lỗi)`} busyLabel="Đang phát hành..."
          props={{ ...props, onClick: props.onActivate }}
        />
      );
    }
    return null;
  };

  return (
    // Dính khi cuộn, tự cuộn bên trong nếu cao hơn màn hình; dưới 1180px (một cột) nằm trên cùng, không dính.
    <aside
      className="ui-card fd-flow sticky top-18 max-h-[calc(100vh-88px)] overflow-y-auto py-4 px-4.5 max-[1180px]:static max-[1180px]:max-h-none max-[1180px]:-order-1"
      aria-labelledby="fdFlowTitle"
    >
      <h2 id="fdFlowTitle" className="mb-3 text-[15px] font-semibold">Tiến trình</h2>
      <ol className="grid list-none">
        {FUNDING_STAGES.map((step, index) => {
          if (index === stopAt) {
            return (
              <li key={step.key} className={`stop ${STEP}`} aria-current="step">
                <span className={DOT}><CrossIcon /></span>
                <div className={STEP_BODY}>
                  <span className={STEP_NAME}>
                    {stage.terminal === 'CLOSED' ? 'Đã đóng vì hết hạn' : cancelledAfterFunding ? 'Đã hủy, không giải ngân' : 'Đã hủy'}
                  </span>
                  <span className={STEP_TIME}>
                    {stage.terminal === 'CLOSED'
                      ? `Hạn ${formatDateTime(listing.fundingClosesAt)}, chưa gọi đủ vốn`
                      : cancelledDetail}
                  </span>
                </div>
              </li>
            );
          }
          if (stopAt !== -1 && index > stopAt) {
            return (
              <li key={step.key} className={`skip ${STEP}`}>
                <span className={DOT}>{index + 1}</span>
                <div className={STEP_BODY}><span className={STEP_NAME}>{step.label}</span></div>
              </li>
            );
          }
          const state = overdue && index === STAGE_INDEX.OPEN ? 'late' : stage.steps[index] ?? 'todo';
          const time = stepTime(index);
          return (
            <li key={step.key} className={`${state} ${STEP}`} aria-current={state === 'current' || state === 'late' ? 'step' : undefined}>
              <span className={DOT}>{state === 'done' ? <CheckIcon /> : index + 1}</span>
              <div className={STEP_BODY}>
                <span className={STEP_NAME}>{step.label}</span>
                {time && <span className={STEP_TIME}>{time}</span>}
                {stepWork(index)}
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
