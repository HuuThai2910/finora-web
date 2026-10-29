import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { useDeleteStaffRoleMutation } from '../api/userQueries';
import type { StaffRole } from '../types';

interface DeleteStaffRoleModalProps {
  role: StaffRole;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Xác nhận xóa vai trò nhân viên. Backend vẫn chặn vai trò mặc định và vai trò còn người dùng (409). */
export function DeleteStaffRoleModal({ role, onClose, onDone }: DeleteStaffRoleModalProps) {
  const [deleteRole, { isLoading, error }] = useDeleteStaffRoleMutation();

  const confirm = async () => {
    const result = await deleteRole(role.code);
    if ('error' in result) return;
    onDone(`Đã xóa vai trò ${role.name}.`);
  };

  return (
    <Modal
      title="Xóa vai trò nhân viên"
      subtitle={`${role.name}, mã ${role.code}`}
      onClose={onClose}
      busy={isLoading}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={isLoading}>Hủy</button>
          <button type="button" className="ui-btn danger" onClick={confirm} disabled={isLoading}>
            {isLoading ? 'Đang xóa...' : 'Xóa vai trò'}
          </button>
        </>
      )}
    >
      <p>Bạn có chắc muốn xóa vai trò này? Bộ quyền của vai trò bị xóa khỏi hệ thống và không khôi phục được.</p>
      {error ? <div className="user-modal-error"><ErrorNotice error={error} /></div> : null}
    </Modal>
  );
}
