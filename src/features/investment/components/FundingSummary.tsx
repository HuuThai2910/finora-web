import { ErrorNotice } from '@/components/ErrorNotice';
import { moneyShort } from '@/lib/charts/theme';
import type { AmountSample, FundingSummary as Summary } from '../hooks/useFundingSummary';

interface Props {
  summary: Summary | null;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
  /** Có thì dòng "quá hạn chờ đóng" thành nút mở hộp xác nhận đóng (cần quyền Thao tác "Gọi vốn"). */
  onCloseExpired?: () => void;
}

/**
 * Bốn ô một hàng (ba ô khi không có khoản chờ duyệt); dưới 900px thành lưới hai cột, hàng dưới có vạch ngăn phía trên.
 * Số cột là chuỗi tĩnh để Tailwind sinh được lớp.
 */
const STRIP_BASE = 'fu-strip grid bg-card border border-line rounded-lg shadow-card max-[900px]:grid-cols-2';
const STRIP = `${STRIP_BASE} grid-cols-4`;
const STRIP_3 = `${STRIP_BASE} grid-cols-3`;
const ITEM =
  'fu-strip-item grid [align-content:start] gap-0.5 min-w-0 py-3.5 px-4.5 border-l border-l-divider ' +
  'first:[border-left:0] max-[900px]:nth-3:[border-left:0] max-[900px]:nth-[n+3]:border-t max-[900px]:nth-[n+3]:border-t-divider';
const LABEL = 'text-muted text-[12px]';
/** Con số chính; ô "Chờ duyệt" có khoản chờ (`hot`) thì tô cam. */
const VALUE = 'text-[18px] font-semibold tabular-nums in-[.fu-strip-item.hot]:text-warning';
const SUB = 'sub text-muted text-[12px] font-normal tabular-nums';
/** Dòng "quá hạn chờ đóng" khi bấm được: chữ đỏ gạch chân, focus bàn phím có viền. */
const LATE_BUTTON =
  'late fu-late-btn text-danger underline underline-offset-2 rounded-sm hover:decoration-2 ' +
  'focus-visible:outline-2 focus-visible:outline-brand focus-visible:outline-offset-1';

/** Ghi chú phạm vi khi nhóm dài hơn số khoản đã tải để cộng tiền. */
const scopeNote = (sample: AmountSample) =>
  sample.sampled < sample.total ? `, tính trên ${sample.sampled} khoản mới nhất` : '';

/**
 * Dải bốn con số chính của sàn gọi vốn trong một thẻ, ngăn bằng vạch mảnh.
 *
 * Số khoản lấy từ `totalElements` nên luôn đúng trên toàn sàn; tổng tiền cộng từ mẫu tối đa
 * 100 khoản và ghi rõ khi chưa phủ hết.
 */
export function FundingSummary({ summary, isLoading, error, onRetry, onCloseExpired }: Props) {
  if (error) return <ErrorNotice error={error} onRetry={onRetry} />;

  if (isLoading || !summary) {
    return (
      <dl className={STRIP} aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className={ITEM}>
            <dt className={LABEL}><span className="ui-skeleton fu-skel-label w-20" /></dt>
            <dd className={VALUE}><span className="ui-skeleton fu-skel-value w-27.5 h-4.5 mt-1" /></dd>
          </div>
        ))}
      </dl>
    );
  }

  const { counts, open, funded } = summary;
  const left = counts.CLOSED + counts.CANCELLED;
  const lateText = `${open.overdue} khoản quá hạn chờ đóng`;

  // Backend không còn tạo bản nháp (khoản vay lên sàn ngay), nên ô "Chờ duyệt" chỉ hiện khi dữ liệu cũ còn bản nháp.
  return (
    <dl className={counts.DRAFT > 0 ? STRIP : STRIP_3}>
      {counts.DRAFT > 0 && (
        <div className={`${ITEM} hot`}>
          <dt className={LABEL}>Chờ duyệt</dt>
          <dd className={VALUE}>{counts.DRAFT} khoản</dd>
          <dd className={SUB}>bản nháp từ luồng cũ</dd>
        </div>
      )}
      <div className={ITEM}>
        <dt className={LABEL}>Đang gọi vốn</dt>
        <dd className={VALUE}>{moneyShort(open.committed)} / {moneyShort(open.target)}</dd>
        <dd className={SUB}>
          {open.overdue > 0 && onCloseExpired ? (
            <button type="button" className={LATE_BUTTON} onClick={onCloseExpired}>{lateText}</button>
          ) : open.overdue > 0 ? (
            <span className="late text-danger">{lateText}</span>
          ) : (
            `${open.total} khoản đang nhận lệnh`
          )}
          {scopeNote(open)}
        </dd>
      </div>
      <div className={ITEM}>
        <dt className={LABEL}>Đã đủ vốn</dt>
        <dd className={VALUE}>{moneyShort(funded.committed)}</dd>
        <dd className={SUB}>{funded.total} khoản{scopeNote(funded)}</dd>
      </div>
      <div className={ITEM}>
        <dt className={LABEL}>Rời sàn</dt>
        <dd className={VALUE}>{left} khoản</dd>
        <dd className={SUB}>đóng vì hết hạn hoặc đã hủy</dd>
      </div>
    </dl>
  );
}
