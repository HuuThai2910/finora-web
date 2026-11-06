import { Modal } from '@/components/Modal';
import type { ThayDoi } from '../mappers/policyDiff';

interface Props {
  title: string;
  /** Phiên bản đang áp dụng, đã đổi sang nhãn đọc được ("v12"); `null` thì không nhắc. */
  phienBan: string | null;
  changes: ThayDoi[];
  saving: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/**
 * Bước xác nhận trước khi lưu cấu hình chấm điểm: liệt kê từng thay đổi cũ → mới. Lưu xong finora-ai tăng phiên bản
 * chính sách và mọi hồ sơ chấm sau đó theo bản mới, nên quản trị viên cần đọc lại trước khi áp dụng. Hộp không có ô nhập
 * nên bấm ra nền vẫn đóng được; trong lúc gửi thì khóa.
 */
export function SaveConfirmModal({ title, phienBan, changes, saving, onConfirm, onClose }: Props) {
  return (
    <Modal
      title={title}
      subtitle={`${changes.length} thay đổi`}
      onClose={onClose}
      busy={saving}
      wide
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={saving}>Xem lại</button>
          <button type="button" className="ui-btn primary aip-confirm-save" onClick={onConfirm} disabled={saving}>
            {saving ? 'Đang lưu...' : 'Lưu và áp dụng'}
          </button>
        </>
      )}
    >
      <div className="aip-confirm grid gap-3">
        <ul className="aip-changes grid gap-2">
          {changes.map((item, i) => (
            <li key={i} className="grid gap-0.5 border-b border-b-divider pb-2 last:[border-bottom:0] last:pb-0">
              <span className="text-[13px] font-medium text-primary">{item.muc}</span>
              {(item.cu != null || item.moi != null) && (
                <span className="text-[13px] wrap-anywhere tabular-nums">
                  {item.cu != null && <s className="text-muted">{item.cu}</s>}
                  {item.cu != null && item.moi != null && <span className="text-muted"> → </span>}
                  {item.moi != null && <span className="text-primary">{item.moi}</span>}
                </span>
              )}
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-muted">
          {phienBan ? `Đang áp dụng chính sách tín dụng ${phienBan}. ` : ''}
          Sau khi lưu, hệ thống tạo phiên bản mới và các hồ sơ chấm điểm từ lúc đó theo cấu hình này.
        </p>
      </div>
    </Modal>
  );
}
