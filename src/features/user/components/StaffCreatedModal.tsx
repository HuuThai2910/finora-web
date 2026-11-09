import { useState } from 'react';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';
import { ROLE_LABELS } from '../constant';
import type { StaffAccountCreated } from '../types';

interface StaffCreatedModalProps {
  account: StaffAccountCreated;
  onClose: () => void;
}

const ROW = 'grid grid-cols-[120px_minmax(0,1fr)] gap-2 py-2 border-b border-b-divider last:[border-bottom:0] max-[480px]:grid-cols-1 max-[480px]:gap-0.5';

/**
 * Kết quả tạo nhân viên: hiện mật khẩu tạm DUY NHẤT một lần (backend không lưu bản rõ, không có API đọc lại) kèm nút
 * sao chép. Đóng hộp là mất; quên thì nhân viên dùng "Quên mật khẩu" bằng email đăng nhập. Không đóng khi bấm ra nền
 * để quản trị viên không lỡ tay mất mật khẩu trước khi chép.
 */
export function StaffCreatedModal({ account, onClose }: StaffCreatedModalProps) {
  const [copied, setCopied] = useState(false);
  const roleLabel = account.role === 'STAFF' && account.staffRoleName
    ? `${ROLE_LABELS.STAFF} (${account.staffRoleName})`
    : ROLE_LABELS[account.role];

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('clipboard unavailable');
      await navigator.clipboard.writeText(account.temporaryPassword);
      setCopied(true);
      toast.success('Đã chép mật khẩu tạm vào bộ nhớ tạm.');
    } catch {
      toast.warning('Trình duyệt chặn chép tự động, hãy chọn mật khẩu và chép tay.');
    }
  };

  return (
    <Modal
      title="Đã tạo tài khoản"
      subtitle={`${account.fullName}, ${account.email}`}
      onClose={onClose}
      dismissOnBackdrop={false}
      footer={<button type="button" className="ui-btn primary" onClick={onClose}>Tôi đã lưu mật khẩu</button>}
    >
      <dl className="staff-created rounded-md border border-line px-3 py-0.5 text-[13px]">
        <div className={ROW}>
          <dt className="text-muted">Email đăng nhập</dt>
          <dd className="text-primary font-medium wrap-anywhere">{account.email}</dd>
        </div>
        <div className={ROW}>
          <dt className="text-muted">Vai trò</dt>
          <dd className="text-primary">{roleLabel}</dd>
        </div>
        <div className={ROW}>
          <dt className="text-muted">Mật khẩu tạm</dt>
          <dd className="flex items-center justify-between gap-2 flex-wrap">
            <code className="ui-mono select-all rounded-sm bg-surface-muted px-2 py-1 text-[15px] tracking-[0.5px] text-primary">
              {account.temporaryPassword}
            </code>
            <button type="button" className="ui-btn ghost" onClick={() => void copy()}>
              <Icon name={copied ? 'checkCircle' : 'file'} />
              {copied ? 'Đã chép' : 'Sao chép'}
            </button>
          </dd>
        </div>
      </dl>

      <p className="mt-3 rounded-md bg-warning-bg px-3 py-2.5 text-[13px] text-warning" role="alert">
        Mật khẩu tạm chỉ hiện một lần này. Hãy sao chép và giao trực tiếp cho nhân viên; nhân viên phải đổi mật khẩu ở lần
        đăng nhập đầu.
      </p>
      <p className="mt-2 text-[13px] text-secondary">
        {account.credentialsEmailSent
          ? `Đã gửi email thông tin đăng nhập tới ${account.email}.`
          : 'Chưa gửi được email thông tin đăng nhập; hãy giao mật khẩu tạm cho nhân viên theo cách khác.'}
      </p>
    </Modal>
  );
}
