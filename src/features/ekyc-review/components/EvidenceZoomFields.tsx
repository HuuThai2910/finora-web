import { toDraftRows } from '../mappers/draftDisplay';
import type { EkycDraft } from '../types';

/**
 * Danh sách trường đọc từ thẻ đặt cạnh ảnh phóng to, để đối chiếu chữ trên ảnh với dữ liệu sẽ ghi vào hồ sơ mà không
 * phải đóng hộp. Trường chỉ có nguồn AI/người dùng sửa giữ vạch cam như thẻ "Thông tin đọc từ thẻ".
 */
export function EvidenceZoomFields({ draft }: { draft: EkycDraft }) {
  const rows = toDraftRows(draft).filter((row) => row.collected);
  return (
    <dl className="ekr-zoom-fields grid content-start text-[13px]" aria-label="Thông tin đọc từ thẻ">
      {rows.map((row) => (
        <div
          key={row.key}
          className={row.unverified
            ? 'unverified py-1.5 pl-2 border-b border-b-divider shadow-[inset_3px_0_0_var(--color-warning)] last:[border-bottom:0]'
            : 'py-1.5 border-b border-b-divider last:[border-bottom:0]'}
        >
          <dt className="text-muted text-[12px]">{row.label}</dt>
          <dd className={row.value ? 'text-primary font-medium wrap-anywhere' : 'text-warning'}>
            {row.value || 'Không đọc được'}
          </dd>
        </div>
      ))}
    </dl>
  );
}
