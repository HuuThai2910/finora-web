import { formatNumber } from '@/utils';

/**
 * Cảnh báo dư nợ có thể cũ: số dư lấy từ bản sao đồng bộ của Fineract (`loan_servicing_projections`),
 * bản nào bị đánh dấu `stale` thì backend đếm vào `staleProjections` (STATS-001 §1). Bằng 0 thì không hiện.
 */
export function StaleProjectionNote({ count }: { count: number | undefined }) {
  if (!count) return null;
  return (
    <p className="ui-chart-warn" role="note">
      {formatNumber(count)} khoản vay chưa đồng bộ kịp từ Fineract, dư nợ có thể chưa cập nhật.
    </p>
  );
}
