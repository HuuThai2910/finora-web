import { useId, useState } from 'react';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';
import { useSetUserLockedMutation } from '../api/userQueries';
import type { UserItem } from '../types';

interface LockUserModalProps {
  user: UserItem;
  onClose: () => void;
  /** Gọi sau khi thao tác thành công; thông báo kết quả đã hiện bằng toast. */
  onDone: () => void;
}

const REASON_MAX = 500;

/** Xác nhận khóa hoặc mở khóa tài khoản; hành động suy ra từ trạng thái hiện tại của tài khoản. */
export function LockUserModal({ user, onClose, onDone }: LockUserModalProps) {
  const willLock = user.locked !== true;
  const [setLocked, { isLoading }] = useSetUserLockedMutation();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);
  const reasonId = useId();
  const name = user.fullName || user.email;
  const reasonMissing = willLock && reason.trim() === '';

  const confirm = async () => {
    if (reasonMissing) {
      setTouched(true);
      return;
    }
    const result = await setLocked({ id: user.id, locked: willLock, reason: willLock ? reason.trim() : undefined });
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    toast.success(willLock ? `Đã khóa tài khoản ${name}.` : `Đã mở khóa tài khoản ${name}.`);
    onDone();
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
      {willLock ? (
        <>
          <label htmlFor={reasonId} className="mb-1.5 block text-[13px] font-semibold">Lý do khóa</label>
          <textarea
            id={reasonId}
            className="ui-textarea user-lock-reason"
            value={reason}
            maxLength={REASON_MAX}
            placeholder="Ví dụ: Nghi dùng giấy tờ của người khác"
            aria-invalid={touched && reasonMissing}
            aria-describedby={touched && reasonMissing ? `${reasonId}-err` : undefined}
            onChange={(event) => setReason(event.target.value)}
            onBlur={() => setTouched(true)}
            autoFocus
          />
          {touched && reasonMissing && (
            <p id={`${reasonId}-err`} className="mt-1 text-[12px] text-danger">Vui lòng nhập lý do khóa.</p>
          )}
          {/*
            Backend tắt tài khoản rồi đăng xuất mọi phiên (thu hồi refresh token). Mã truy cập đã cấp vẫn còn hiệu lực
            tới khi hết hạn (tối đa 15 phút), nên câu chữ nói rõ để người khóa không tưởng mọi thao tác dừng ngay.
          */}
          <p className="user-lock-warning mt-3 py-2.5 px-3 rounded-md bg-danger-bg text-danger text-[13px]">
            Người dùng bị đăng xuất khỏi app và web ngay, và không đăng nhập lại được cho tới khi được mở khóa. Thao tác
            đang làm dở có thể còn chạy được thêm tối đa 15 phút.
          </p>
          <p className="mt-2 text-[12px] text-muted">Lý do được lưu và hiện ở trang khách hàng cho nhân viên khác xem.</p>
        </>
      ) : (
        <>
          {user.lockReason && (
            <p className="user-lock-reason-view mb-2 text-[13px]">
              <span className="text-muted">Lý do đã khóa: </span>{user.lockReason}
            </p>
          )}
          <p className="user-unlock-note text-[13px]">Người dùng đăng nhập lại được ngay sau khi mở khóa.</p>
        </>
      )}
    </Modal>
  );
}
