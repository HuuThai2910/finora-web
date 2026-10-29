import { useState, type FormEvent } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Modal } from '@/components/Modal';
import { useCreateStaffRoleMutation, useGetStaffPermissionsQuery, useUpdateStaffRoleMutation } from '../api/userQueries';
import type { StaffRole, StaffRoleRequest } from '../types';
import { PermissionMatrix } from './PermissionMatrix';

interface StaffRoleModalProps {
  /** Vai trò đang sửa; không có thì là tạo mới. */
  role: StaffRole | null;
  onClose: () => void;
  onDone: (message: string) => void;
}

const FORM_ID = 'staff-role-form';
const NAME_MAX = 80;
const DESCRIPTION_MAX = 255;

/**
 * Tạo hoặc sửa một vai trò nhân viên: tên, mô tả và ma trận quyền Xem/Thao tác theo danh mục chức năng của backend.
 * Mã vai trò do backend sinh từ tên khi tạo và không đổi khi sửa. Lỗi của backend (trùng tên, quyền không có trong
 * danh mục) hiện ngay trong hộp để sửa và gửi lại.
 */
export function StaffRoleModal({ role, onClose, onDone }: StaffRoleModalProps) {
  const catalog = useGetStaffPermissionsQuery();
  const [createRole, createState] = useCreateStaffRoleMutation();
  const [updateRole, updateState] = useUpdateStaffRoleMutation();
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selected, setSelected] = useState<Set<string>>(() => new Set(role?.permissions ?? []));
  const [touched, setTouched] = useState(false);

  const busy = createState.isLoading || updateState.isLoading;
  const serverError = role ? updateState.error : createState.error;
  const nameError = name.trim() ? null : 'Nhập tên vai trò.';
  const permissionError = selected.size > 0 ? null : 'Chọn ít nhất một quyền.';
  const viewCount = [...selected].filter((permission) => permission.endsWith(':view')).length;
  const actionCount = selected.size - viewCount;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (nameError || permissionError || busy) return;
    // Gửi theo thứ tự danh mục để backend lưu ổn định; quyền lạ (đã bỏ khỏi danh mục) giữ nguyên để backend báo lỗi.
    const ordered = (catalog.data ?? []).flatMap((item) => [item.view, item.action]).filter((permission): permission is string =>
      permission != null && selected.has(permission));
    const extra = [...selected].filter((permission) => !ordered.includes(permission));
    const request: StaffRoleRequest = {
      name: name.trim(),
      description: description.trim() || undefined,
      permissions: [...ordered, ...extra],
    };
    const result = role
      ? await updateRole({ code: role.code, request })
      : await createRole(request);
    if ('error' in result) return;
    onDone(role ? `Đã cập nhật vai trò ${request.name}.` : `Đã tạo vai trò ${request.name}.`);
  };

  return (
    <Modal
      wide
      title={role ? 'Sửa vai trò nhân viên' : 'Tạo vai trò nhân viên'}
      subtitle={role ? `Mã ${role.code}` : 'Nhân viên được gán vai trò chỉ thấy các màn và nút được cấp quyền.'}
      onClose={onClose}
      busy={busy}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={busy}>Hủy</button>
          <button type="submit" form={FORM_ID} className="ui-btn primary" disabled={busy || !catalog.data}>
            {busy ? 'Đang lưu...' : role ? 'Lưu thay đổi' : 'Tạo vai trò'}
          </button>
        </>
      )}
    >
      <form id={FORM_ID} className="staff-form" onSubmit={submit} noValidate>
        <label className="staff-field">
          <span>Tên vai trò <b className="user-required" aria-hidden="true">*</b></span>
          <input
            className="staff-input"
            value={name}
            maxLength={NAME_MAX}
            placeholder="Ví dụ: Chuyên viên thẩm định"
            aria-invalid={touched && nameError != null}
            disabled={busy}
            onChange={(event) => setName(event.target.value)}
            autoFocus
          />
          {touched && nameError && <small className="staff-err" role="alert">{nameError}</small>}
        </label>
        <label className="staff-field">
          <span>Mô tả</span>
          <textarea
            className="staff-input"
            value={description}
            maxLength={DESCRIPTION_MAX}
            rows={2}
            placeholder="Công việc của nhóm nhân viên này"
            disabled={busy}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <div className="staff-matrix-head">
          <span>Quyền theo chức năng</span>
          <span className="ui-tag">{viewCount} Xem, {actionCount} Thao tác</span>
        </div>
        <p className="staff-matrix-hint">Thao tác (duyệt, xử lý, lưu cấu hình) luôn kèm quyền Xem của cùng chức năng.</p>
        {catalog.error ? (
          <ErrorNotice error={catalog.error} onRetry={catalog.refetch} />
        ) : !catalog.data ? (
          <div className="ui-empty" aria-busy="true">Đang tải danh mục quyền...</div>
        ) : (
          <PermissionMatrix functions={catalog.data} selected={selected} disabled={busy} onChange={setSelected} />
        )}
        {touched && permissionError && <small className="staff-err" role="alert">{permissionError}</small>}

        {serverError ? <div className="user-modal-error"><ErrorNotice error={serverError} /></div> : null}
      </form>
    </Modal>
  );
}
