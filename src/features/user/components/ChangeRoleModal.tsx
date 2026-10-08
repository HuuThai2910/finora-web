import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { useAssignUserRoleMutation } from '../api/userQueries';
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../constant';
import type { RoleType, UserItem } from '../types';

interface ChangeRoleModalProps {
  user: UserItem;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Hộp thoại đổi vai trò. Lỗi hiện ngay trong hộp để người dùng sửa và thử lại. */
export function ChangeRoleModal({ user, onClose, onDone }: ChangeRoleModalProps) {
  const [role, setRole] = useState<RoleType>(user.role);
  const [assignRole, { isLoading, error }] = useAssignUserRoleMutation();

  const save = async () => {
    const result = await assignRole({ id: user.id, role });
    if ('error' in result) return;
    onDone(`Đã đổi vai trò của ${user.fullName || user.email} thành ${ROLE_LABELS[role]}.`);
  };

  return (
    <Modal
      title="Đổi vai trò"
      subtitle={user.fullName ? `${user.fullName}, ${user.email}` : user.email}
      onClose={onClose}
      busy={isLoading}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={isLoading}>Hủy</button>
          <button type="button" className="ui-btn primary" onClick={save} disabled={isLoading || role === user.role}>
            {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </>
      )}
    >
      <p className="user-modal-lead">Quyền truy cập thay đổi ngay sau khi lưu.</p>
      <div className="user-role-options" role="radiogroup" aria-label="Vai trò">
        {ASSIGNABLE_ROLES.map((option) => (
          <label key={option} className={`user-role-option${role === option ? ' selected' : ''}`}>
            <input
              type="radio"
              name="userRole"
              value={option}
              checked={role === option}
              onChange={() => setRole(option)}
              disabled={isLoading}
            />
            <span>
              <strong>{ROLE_LABELS[option]}</strong>
              <span>{ROLE_DESCRIPTIONS[option]}</span>
            </span>
          </label>
        ))}
      </div>
      {error ? <div className="user-modal-error"><ErrorNotice error={error} /></div> : null}
    </Modal>
  );
}
