import type { TradeStep } from '../../mappers/tradeSteps';
import { CopyIconButton } from '../CopyIconButton';

interface Props {
  steps: TradeStep[];
  tradeReference: string;
  /** Có khi bằng chứng đã được sổ cái xác nhận và tài khoản được xem: mở ngăn Kiểm toán. */
  onAudit?: () => void;
}

const svgProps = {
  viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 3,
  strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true,
} as const;

/*
 * Cùng kiểu cột Tiến trình của trang Gọi vốn: vạch nối xuống bước sau là ::before (bỏ ở bước cuối), bước xong vạch xanh;
 * bước đang chạy tô cam, trạng thái còn đọc được bằng chữ và `aria-current`.
 */
const STEP_LI =
  "relative grid grid-cols-[20px_minmax(0,1fr)] gap-2.5 pb-3 last:pb-0 not-last:before:absolute not-last:before:top-5.5 " +
  "not-last:before:bottom-0.5 not-last:before:left-2.25 not-last:before:w-0.5 not-last:before:bg-line not-last:before:content-[''] " +
  '[&.done]:not-last:before:bg-brand';
const DOT =
  'grid size-5 place-items-center rounded-full border-2 border-line-strong bg-white text-[10.5px] font-semibold text-muted ' +
  '[&_svg]:size-2.5 in-[li.done]:border-brand in-[li.done]:bg-brand in-[li.done]:text-white ' +
  'in-[li.current]:border-warning in-[li.current]:text-warning in-[li.current]:shadow-[0_0_0_3px_var(--color-warning-bg)]';
const NAME = 'text-[13px] text-secondary in-[li.done]:text-primary in-[li.current]:font-semibold in-[li.current]:text-warning';

/**
 * Cột phải của chi tiết giao dịch: bốn bước của lần khớp (mốc giờ chỉ ở đây), nút Kiểm toán ngay dưới khi đã lưu bằng
 * chứng lên blockchain, cuối cùng là mã đối soát với dịch vụ thanh toán (chính là mã lần khớp gửi sang Payment).
 */
export function TradeProgressSlip({ steps, tradeReference, onAudit }: Props) {
  return (
    <aside
      className="sticky top-[calc(var(--header-height)+16px)] grid max-h-[calc(100vh-var(--header-height)-32px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden max-[1180px]:static max-[1180px]:-order-1 max-[1180px]:max-h-none"
      aria-label="Tiến trình giao dịch"
    >
      <section className="ui-card px-4.5 py-4">
        <h2 className="text-[14px] font-semibold">Tiến trình</h2>
        <ol className="mt-3 grid list-none">
          {steps.map((step, index) => (
            <li key={step.name} className={`${step.state} ${STEP_LI}`} aria-current={step.state === 'current' ? 'step' : undefined}>
              <span className={DOT}>
                {step.state === 'done' ? <svg {...svgProps}><path d="M20 6 9 17l-5-5" /></svg> : index + 1}
              </span>
              <div className="min-w-0">
                <span className={NAME}>{step.name}</span>
                {step.lines.map((line) => (
                  <span key={line} className="block text-muted text-[12px] tabular-nums">{line}</span>
                ))}
              </div>
            </li>
          ))}
        </ol>
        {onAudit && (
          <button type="button" className="ui-btn ghost mt-3.5 h-9 w-full" onClick={onAudit}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7" />
              <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7" />
            </svg>
            Kiểm toán
          </button>
        )}
        <p className="mt-3.5 border-t border-t-divider pt-3 text-muted text-[12px]">
          Mã đối soát với dịch vụ thanh toán
          <span className="mt-0.5 flex items-center gap-1">
            <span className="ui-mono text-[12.5px] text-primary">{tradeReference}</span>
            <CopyIconButton value={tradeReference} what="mã đối soát" />
          </span>
        </p>
      </section>
    </aside>
  );
}
