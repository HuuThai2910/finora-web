import { syncLabel, syncTone } from '../mappers/productDisplay';
import type { CoreSyncStatus } from '../types';

/** Chấm 6px trước chữ: xám khi hệ thống đang xử lý, xanh khi xong (`ok`), đỏ cả chữ khi lỗi (`err`). */
const SYNC =
  "prod-sync inline-flex items-center gap-1.5 text-secondary text-[12px] whitespace-nowrap before:content-[''] before:flex-none"
  + ' before:w-1.5 before:h-1.5 before:rounded-[50%] before:bg-[#9ca3af] [&.ok]:before:bg-success [&.err]:text-danger'
  + ' [&.err]:before:bg-danger';

/** Trạng thái đồng bộ sang Fineract: chấm tròn kèm chữ, xanh khi xong, đỏ khi lỗi, còn lại xám. */
export function SyncState({ status }: { status: CoreSyncStatus }) {
  const tone = syncTone(status);
  return <span className={tone ? `${SYNC} ${tone}` : SYNC}>{syncLabel(status)}</span>;
}
