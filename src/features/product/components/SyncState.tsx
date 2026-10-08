import { syncLabel, syncTone } from '../mappers/productDisplay';
import type { CoreSyncStatus } from '../types';

/** Trạng thái đồng bộ sang Fineract: chấm tròn kèm chữ, xanh khi xong, đỏ khi lỗi, còn lại xám. */
export function SyncState({ status }: { status: CoreSyncStatus }) {
  const tone = syncTone(status);
  return <span className={tone ? `prod-sync ${tone}` : 'prod-sync'}>{syncLabel(status)}</span>;
}
