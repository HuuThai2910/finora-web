import type { ReactNode } from 'react';
import type { FundingFacts } from '../../mappers/loanTimeline';
import type { SigningSummary } from '../../mappers/signing';
import {
  CANCELLATION_LABEL,
  FUNDING_STEPS,
  STEP,
  currentStep,
  describeTimeLeft,
  stopStep,
  type FundingStage,
} from '../../stage';
import type { FundingProgress, MarketListing } from '../../types';
import { formatDateTime, formatPercent } from '../../formatters';

interface Props {
  listing: MarketListing;
  stage: FundingStage;
  progress: FundingProgress | undefined;
  facts: FundingFacts | null;
  signing: SigningSummary | null;
  notesIssuedAt: string | null;
  /** Hạn ký của văn bản hợp đồng hiện hành (API hợp đồng quản trị); null khi chưa có hoặc thiếu quyền. */
  contractExpiresAt?: string | null;
}

const svgProps = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 3,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
} as const;
const CheckIcon = () => <svg {...svgProps}><path d="M20 6 9 17l-5-5" /></svg>;
const CrossIcon = () => <svg {...svgProps}><path d="M18 6 6 18M6 6l12 12" /></svg>;

type StepState = 'done' | 'current' | 'todo' | 'stop' | 'skip';

/*
 * Một bước (li) mang lớp trạng thái; vạch nối xuống bước sau là ::before (bỏ ở bước cuối), bước đã xong thì vạch xanh.
 * Đang chạy tô cam, dừng (hết hạn, hủy) tô đỏ kèm dấu ×; trạng thái còn đọc được bằng chữ và `aria-current`.
 */
const STEP_LI =
  "relative grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 pb-3 last:pb-0 not-last:before:absolute not-last:before:top-5.5 " +
  "not-last:before:bottom-0.5 not-last:before:left-2.25 not-last:before:w-0.5 not-last:before:bg-line not-last:before:content-[''] " +
  '[&.done]:not-last:before:bg-brand [&.skip]:opacity-45';
const DOT =
  'grid size-5 place-items-center rounded-full border-2 border-line-strong bg-white text-[10.5px] font-semibold text-muted ' +
  '[&_svg]:size-2.5 in-[li.done]:border-brand in-[li.done]:bg-brand in-[li.done]:text-white ' +
  'in-[li.current]:border-warning in-[li.current]:text-warning in-[li.current]:shadow-[0_0_0_3px_var(--color-warning-bg)] ' +
  'in-[li.stop]:border-danger in-[li.stop]:bg-danger in-[li.stop]:text-white';
const NAME =
  'text-[13px] text-secondary in-[li.done]:text-primary in-[li.current]:font-semibold in-[li.current]:text-warning ' +
  'in-[li.stop]:font-semibold in-[li.stop]:text-danger';
const TIME = 'block text-muted text-[12px] tabular-nums';

/** Dòng "hạn …, còn N ngày" dưới bước đang chạy; còn ít thời gian thì tô cam. */
function Deadline({ iso }: { iso: string }) {
  const left = describeTimeLeft(iso);
  return (
    <span className={left.warn ? 'text-warning' : undefined}>
      hạn {formatDateTime(iso)}{left.label ? `, ${left.label}` : ''}
    </span>
  );
}

/**
 * Tiến trình năm bước ở cột phải trang chi tiết: Gọi vốn → Đủ vốn → Ký hợp đồng → Giải ngân → Phát hành phần vốn.
 * Bước đang chạy ghi kèm hạn hoặc số người đã ký; gọi vốn bổ sung có nhãn vòng; đóng/hủy dừng ở bước gây ra. Chỉ để xem:
 * quản trị không có thao tác nào trên khoản gọi vốn nên không có khay nút.
 */
export function FundingSteps({ listing, stage, progress, facts, signing, notesIssuedAt, contractExpiresAt }: Props) {
  const stopAt = stopStep(stage, listing.cancellationReason);
  const current = currentStep(stage);
  const reopened = stage === 'REOPEN';
  const funding = stage === 'OPEN' || reopened;

  const stateOf = (index: number): StepState => {
    if (stopAt != null) return index < stopAt ? 'done' : index === stopAt ? 'stop' : 'skip';
    return index < current ? 'done' : index === current ? 'current' : 'todo';
  };

  const timeOf = (index: number): ReactNode => {
    switch (index) {
      case STEP.FUNDING: {
        const opened = reopened ? facts?.reopenedAt : facts?.openedAt ?? listing.fundingOpenedAt;
        const prefix = opened ? `${reopened ? 'mở lại' : 'mở'} ${formatDateTime(opened)}` : null;
        if (!funding) return prefix;
        return <>{prefix}{prefix ? <br /> : null}<Deadline iso={listing.fundingClosesAt} /></>;
      }
      case STEP.FUNDED: {
        // Gọi vốn bổ sung: mốc đủ vốn lần đầu vẫn còn ý nghĩa (các nhà đầu tư đã ký giữ nguyên chữ ký).
        if (reopened) return facts?.contractIssuedAt ? `vòng 1: ${formatDateTime(facts.contractIssuedAt)}` : null;
        // Khoản bị hủy sau đủ vốn có thể không còn mốc đủ vốn ở tiến độ: lấy lúc lập hợp đồng (cũng là lúc đủ vốn).
        const fundedAt = progress?.fullyFundedAt ?? facts?.contractIssuedAt;
        return fundedAt ? formatDateTime(fundedAt) : null;
      }
      case STEP.SIGNING:
        if (stage === 'SIGNING' && signing) {
          const text = signing.signedCount < signing.lenderCount
            ? `${signing.signedCount}/${signing.lenderCount} nhà đầu tư đã ký`
            : 'nhà đầu tư đã ký đủ, chờ người vay ký';
          return contractExpiresAt ? <>{text}<br /><Deadline iso={contractExpiresAt} /></> : text;
        }
        return facts?.effectiveAt ? formatDateTime(facts.effectiveAt) : null;
      case STEP.DISBURSEMENT:
        if (listing.disbursedAt) return formatDateTime(listing.disbursedAt);
        return stage === 'DISBURSING' && facts?.disbursementRequestedAt
          ? `yêu cầu giải ngân ${formatDateTime(facts.disbursementRequestedAt)}`
          : null;
      case STEP.NOTES: {
        const issued = notesIssuedAt ?? (stage === 'ISSUED' ? listing.disbursedAt : null);
        return issued ? formatDateTime(issued) : null;
      }
      default:
        return null;
    }
  };

  const stopLabel = stage === 'CLOSED' ? 'Hết hạn, chưa đủ vốn' : 'Đã hủy';
  const stopTime = stage === 'CLOSED'
    ? `hạn ${formatDateTime(listing.fundingClosesAt)}${listing.fundedPercent > 0 ? `, đạt ${formatPercent(listing.fundedPercent)}` : ''}`
    : [
        listing.cancellationReason
          ? CANCELLATION_LABEL[listing.cancellationReason] ?? listing.cancellationReason
          : 'Khoản vay đã rút khỏi sàn',
        listing.cancelledAt ? formatDateTime(listing.cancelledAt) : null,
      ].filter(Boolean).join(', ');

  return (
    // Dính khi cuộn, tự cuộn bên trong nếu cao hơn màn hình (ẩn thanh cuộn); dưới 1180px nằm trên cùng, không dính.
    <aside
      className="fd-flow sticky top-[calc(var(--header-height)+16px)] grid max-h-[calc(100vh-var(--header-height)-32px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[1180px]:static max-[1180px]:-order-1 max-[1180px]:max-h-none"
      aria-label="Tiến trình gọi vốn"
    >
      <section className="ui-card px-4.5 py-4">
        <h2 className="text-[14px] font-semibold">Tiến trình</h2>
        <ol className="mt-3 grid list-none">
          {FUNDING_STEPS.map((name, index) => {
            const state = stateOf(index);
            const stopped = state === 'stop';
            const time = stopped ? stopTime : timeOf(index);
            return (
              <li key={name} className={`${state} ${STEP_LI}`} aria-current={state === 'current' || stopped ? 'step' : undefined}>
                <span className={DOT}>{state === 'done' ? <CheckIcon /> : stopped ? <CrossIcon /> : index + 1}</span>
                <div className="min-w-0">
                  <span className={NAME}>{stopped ? stopLabel : name}</span>
                  {reopened && index === STEP.FUNDING ? (
                    <span className="ml-1.5 rounded-full bg-warning-bg px-1.5 py-px text-[10.5px] font-semibold text-warning">
                      {facts?.hasTimeline ? `Vòng ${facts.reopenCount + 1}` : 'Bổ sung'}
                    </span>
                  ) : null}
                  {time ? <span className={TIME}>{time}</span> : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </aside>
  );
}
