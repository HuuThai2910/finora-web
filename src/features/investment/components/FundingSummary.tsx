import { ErrorNotice } from '@/components/ErrorNotice';
import { moneyShort } from '@/lib/charts/theme';
import type { AmountSample, FundingSummary as Summary } from '../hooks/useFundingSummary';

interface Props {
  summary: Summary | null;
  isLoading: boolean;
  error: unknown;
  onRetry: () => void;
}

/** Ghi chú phạm vi khi nhóm dài hơn số khoản đã tải để cộng tiền. */
const scopeNote = (sample: AmountSample) =>
  sample.sampled < sample.total ? `, tính trên ${sample.sampled} khoản mới nhất` : '';

/**
 * Dải bốn con số chính của sàn gọi vốn trong một thẻ, ngăn bằng vạch mảnh.
 *
 * Số khoản lấy từ `totalElements` nên luôn đúng trên toàn sàn; tổng tiền cộng từ mẫu tối đa
 * 100 khoản và ghi rõ khi chưa phủ hết.
 */
export function FundingSummary({ summary, isLoading, error, onRetry }: Props) {
  if (error) return <ErrorNotice error={error} onRetry={onRetry} />;

  if (isLoading || !summary) {
    return (
      <dl className="fu-strip" aria-busy="true">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="fu-strip-item">
            <dt><span className="ui-skeleton fu-skel-label" /></dt>
            <dd><span className="ui-skeleton fu-skel-value" /></dd>
          </div>
        ))}
      </dl>
    );
  }

  const { counts, open, funded } = summary;
  const left = counts.CLOSED + counts.CANCELLED;

  return (
    <dl className="fu-strip">
      <div className={`fu-strip-item${counts.DRAFT > 0 ? ' hot' : ''}`}>
        <dt>Chờ duyệt</dt>
        <dd>{counts.DRAFT} khoản</dd>
        <dd className="sub">{counts.DRAFT > 0 ? 'chốt mệnh giá Note để mở gọi vốn' : 'không có khoản nào chờ duyệt'}</dd>
      </div>
      <div className="fu-strip-item">
        <dt>Đang gọi vốn</dt>
        <dd>{moneyShort(open.committed)} / {moneyShort(open.target)}</dd>
        <dd className="sub">
          {open.overdue > 0 ? (
            <span className="late">{open.overdue} khoản quá hạn chờ đóng</span>
          ) : (
            `${open.total} khoản đang nhận lệnh`
          )}
          {scopeNote(open)}
        </dd>
      </div>
      <div className="fu-strip-item">
        <dt>Đã đủ vốn</dt>
        <dd>{moneyShort(funded.committed)}</dd>
        <dd className="sub">{funded.total} khoản{scopeNote(funded)}</dd>
      </div>
      <div className="fu-strip-item">
        <dt>Rời sàn</dt>
        <dd>{left} khoản</dd>
        <dd className="sub">đóng vì hết hạn hoặc đã hủy</dd>
      </div>
    </dl>
  );
}
