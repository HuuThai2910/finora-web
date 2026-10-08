import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { useSetUserLockedMutation } from '../api/userQueries';
import type { UserItem } from '../types';

interface LockUserModalProps {
  user: UserItem;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Xác nhận khóa hoặc mở khóa tài khoản; hành động suy ra từ trạng thái hiện tại của tài khoản. */
export function LockUserModal({ user, onClose, onDone }: LockUserModalProps) {
  const willLock = user.locked !== true;
  const [setLocked, { isLoading, error }] = useSetUserLockedMutation();
  const name = user.fullName || user.email;

  const confirm = async () => {
    const result = await setLocked({ id: user.id, locked: willLock });
    if ('error' in result) return;
    onDone(willLock ? `Đã khóa tài khoản ${name}.` : `Đã mở khóa tài khoản ${name}.`);
  };

  return (
    <Modal
      title={willLock ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
      subtitle={user.fullName ? `${user.fullName}, ${user.email}` : user.email}
      onClose={onClose}
      busy={isLoading}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={isLoading}>Hủy</button>
          <button type="button" className={`ui-btn ${willLock ? 'danger' : 'primary'}`} onClick={confirm} disabled={isLoading}>
            {isLoading ? 'Đang xử lý...' : willLock ? 'Khóa tài khoản' : 'Mở khóa'}
          </button>
        </>
      )}
    >
      <p>Bạn có chắc muốn {willLock ? 'khóa' : 'mở khóa'} tài khoản này?</p>
      {willLock && (
        <p className="user-lock-warning">
          Mọi phiên đăng nhập của tài khoản bị đăng xuất ngay. Người dùng không thể truy cập FINORA cho tới khi được mở khóa.
        </p>
      )}
      {error ? <div className="user-modal-error"><ErrorNotice error={error} /></div> : null}
    </Modal>
  );
}
