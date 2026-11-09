import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { ErrorToast } from '@/components/ErrorToast';
import { Modal } from '@/components/Modal';
import { useCreateStaffAccountMutation, useGetStaffRolesQuery } from '../api/userQueries';
import { ASSIGNABLE_ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from '../constant';
import type { InternalRoleType, StaffAccountCreated } from '../types';

interface CreateStaffModalProps {
  onClose: () => void;
  /** Tạo xong: trang mở hộp thoại hiện mật khẩu tạm (chỉ có một lần). */
  onCreated: (account: StaffAccountCreated) => void;
}

const FORM_ID = 'create-staff-form';
const NAME_MAX = 255;
const EMAIL_MAX = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^0\d{9}$/;

const FIELD = 'staff-field grid gap-1';
const FIELD_LABEL = 'text-secondary text-[13px] font-medium';
/** Cùng kiểu ô nhập với hộp tạo vai trò nhân viên; nhập sai (`aria-invalid`) thì viền đỏ. */
const INPUT = 'staff-input w-full min-h-8.5 py-1.75 px-2.5 border border-line-strong rounded-md bg-white text-primary'
  + ' font-[inherit] [font-style:inherit] [font-weight:inherit] leading-[inherit] text-[14px]'
  + ' focus:border-brand focus:shadow-[0_0_0_3px_rgba(29,86,196,0.15)] focus:[outline:0] aria-invalid:border-danger';
const ERROR = 'staff-err text-danger text-[12px]';
const HINT = 'text-muted text-[12px]';
/** Thẻ lựa chọn vai trò như hộp đổi vai trò; thẻ đang chọn viền và nền xanh. */
const OPTION = 'user-role-option flex items-start gap-2.5 py-2.5 px-3 border border-line-strong rounded-md bg-white cursor-pointer'
  + ' hover:bg-surface-muted [&.selected]:border-brand [&.selected]:bg-brand-50';

function Required() {
  return <b className="user-required text-danger font-bold" aria-hidden="true">*</b>;
}

/**
 * Tạo tài khoản nhân viên bằng thông tin riêng: họ tên, email đăng nhập, số điện thoại (tùy chọn), vai trò. Hệ thống
 * tự tạo tài khoản đăng nhập, hồ sơ và mật khẩu tạm; nhân viên phải đổi mật khẩu ở lần đăng nhập đầu. Lỗi của backend
 * (trùng email, trùng số điện thoại) hiện ngay trong hộp để sửa và gửi lại.
 */
export function CreateStaffModal({ onClose, onCreated }: CreateStaffModalProps) {
  const [createAccount, { isLoading, error }] = useCreateStaffAccountMutation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<InternalRoleType>('STAFF');
  const [staffRoleCode, setStaffRoleCode] = useState('');
  const [touched, setTouched] = useState(false);
  const staffRoles = useGetStaffRolesQuery(undefined, { skip: role !== 'STAFF' });

  const isStaff = role === 'STAFF';
  const nameError = fullName.trim() ? null : 'Nhập họ tên nhân viên.';
  const emailError = !email.trim()
    ? 'Nhập email đăng nhập.'
    : EMAIL_PATTERN.test(email.trim()) ? null : 'Email chưa đúng định dạng.';
  const phoneError = !phone.trim() || PHONE_PATTERN.test(phone.trim())
    ? null
    : 'Số điện thoại gồm 10 chữ số, bắt đầu bằng 0.';
  const staffRoleError = isStaff && !staffRoleCode ? 'Chọn vai trò nhân viên.' : null;
  const invalid = nameError != null || emailError != null || phoneError != null || staffRoleError != null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (invalid || isLoading) return;
    const result = await createAccount({
      fullName: fullName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      role,
      staffRoleCode: isStaff ? staffRoleCode : undefined,
    });
    if ('error' in result) return;
    onCreated(result.data);
  };

  return (
    <Modal
      title="Thêm nhân viên"
      subtitle="Tạo tài khoản đăng nhập web quản trị cho nhân viên mới."
      onClose={onClose}
      busy={isLoading}
      dismissOnBackdrop={false}
      footer={(
        <>
          <button type="button" className="ui-btn ghost" onClick={onClose} disabled={isLoading}>Hủy</button>
          <button type="submit" form={FORM_ID} className="ui-btn primary" disabled={isLoading}>
            {isLoading ? 'Đang tạo...' : 'Tạo tài khoản'}
          </button>
        </>
      )}
    >
      <form id={FORM_ID} className="staff-form grid gap-3" onSubmit={submit} noValidate>
        <label className={FIELD}>
          <span className={FIELD_LABEL}>Họ tên <Required /></span>
          <input
            className={INPUT}
            value={fullName}
            maxLength={NAME_MAX}
            placeholder="Ví dụ: Nguyễn Văn An"
            autoComplete="off"
            aria-invalid={touched && nameError != null}
            disabled={isLoading}
            onChange={(event) => setFullName(event.target.value)}
            autoFocus
          />
          {touched && nameError && <small className={ERROR} role="alert">{nameError}</small>}
        </label>
        <label className={FIELD}>
          <span className={FIELD_LABEL}>Email đăng nhập <Required /></span>
          <input
            className={INPUT}
            type="email"
            value={email}
            maxLength={EMAIL_MAX}
            placeholder="ten@finora.vn"
            autoComplete="off"
            aria-invalid={touched && emailError != null}
            disabled={isLoading}
            onChange={(event) => setEmail(event.target.value)}
          />
          {touched && emailError
            ? <small className={ERROR} role="alert">{emailError}</small>
            : <small className={HINT}>Nhân viên dùng email này để đăng nhập; thông tin đăng nhập được gửi tới đây.</small>}
        </label>
        <label className={FIELD}>
          <span className={FIELD_LABEL}>Số điện thoại</span>
          <input
            className={INPUT}
            type="tel"
            inputMode="numeric"
            value={phone}
            maxLength={10}
            placeholder="Không bắt buộc"
            autoComplete="off"
            aria-invalid={touched && phoneError != null}
            disabled={isLoading}
            onChange={(event) => setPhone(event.target.value.replace(/\D/g, ''))}
          />
          {touched && phoneError && <small className={ERROR} role="alert">{phoneError}</small>}
        </label>

        <div className={FIELD}>
          <span className={FIELD_LABEL} id="create-staff-role">Vai trò <Required /></span>
          <div className="user-role-options grid gap-2" role="radiogroup" aria-labelledby="create-staff-role">
            {ASSIGNABLE_ROLES.map((option) => (
              <label key={option} className={role === option ? `${OPTION} selected` : OPTION}>
                <input
                  className="mt-1 accent-brand"
                  type="radio"
                  name="createStaffRole"
                  value={option}
                  checked={role === option}
                  onChange={() => setRole(option)}
                  disabled={isLoading}
                />
                <span>
                  <strong className="block text-primary text-[14px] font-medium">{ROLE_LABELS[option]}</strong>
                  <span className="block text-muted text-[13px] leading-4.5">{ROLE_DESCRIPTIONS[option]}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        {isStaff && (
          <label className={FIELD}>
            <span className={FIELD_LABEL}>Vai trò nhân viên <Required /></span>
            {staffRoles.error ? (
              <ErrorNotice error={staffRoles.error} onRetry={staffRoles.refetch} />
            ) : (
              <select
                className="ui-select"
                value={staffRoleCode}
                aria-invalid={touched && staffRoleError != null}
                disabled={isLoading || staffRoles.isLoading}
                onChange={(event) => setStaffRoleCode(event.target.value)}
              >
                <option value="">{staffRoles.isLoading ? 'Đang tải vai trò...' : 'Chọn vai trò nhân viên'}</option>
                {(staffRoles.data ?? []).map((item) => (
                  <option key={item.code} value={item.code}>{item.name}</option>
                ))}
              </select>
            )}
            {staffRoles.data && staffRoles.data.length === 0 ? (
              <small className={HINT}>
                Chưa có vai trò nhân viên nào. <Link className="ui-link" to="/users/roles">Tạo vai trò</Link> trước khi thêm nhân viên.
              </small>
            ) : touched && staffRoleError ? (
              <small className={ERROR} role="alert">{staffRoleError}</small>
            ) : (
              <small className={HINT}>Nhân viên chỉ thấy các màn và nút thao tác mà vai trò này được cấp quyền.</small>
            )}
          </label>
        )}

        <p className="rounded-md bg-surface-muted px-3 py-2.5 text-[13px] text-secondary" role="note">
          Hệ thống tự tạo mật khẩu tạm và chỉ hiện một lần sau khi tạo. Nhân viên phải đổi mật khẩu ở lần đăng nhập đầu.
        </p>
        {error ? <ErrorToast error={error} /> : null}
      </form>
    </Modal>
  );
}
