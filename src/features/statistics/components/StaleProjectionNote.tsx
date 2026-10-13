import { formatNumber } from '@/utils';

const TEMPORARILY_HIDDEN = true;

/**
 * Cảnh báo dư nợ có thể cũ: số dư lấy từ bản sao đồng bộ của Fineract (`loan_servicing_projections`),
 * bản nào bị đánh dấu `stale` thì backend đếm vào `staleProjections` (STATS-001 §1). Bằng 0 thì không hiện.
 */
export function StaleProjectionNote({ count }: { count: number | undefined }) {
  // Tạm ẩn: còn 5 khoản vay của nhóm nằm trên Fineract máy khác nên luôn báo stale; đặt TEMPORARILY_HIDDEN = false để hiện lại.
  if (TEMPORARILY_HIDDEN) return null;
  if (!count) return null;
  return (
    <p className="ui-chart-warn" role="note">
      {formatNumber(count)} khoản vay chưa đồng bộ kịp từ Fineract, dư nợ có thể chưa cập nhật.
    </p>
  );
}
