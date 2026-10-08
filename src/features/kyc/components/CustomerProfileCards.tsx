import type { ReactNode } from 'react';
import { StatusPill } from '@/components/StatusPill';
import type { UserItem } from '@/features/user';
import {
  accountState,
  ekycDisplay,
  formatBirthDate,
  formatDayTime,
  genderLabel,
  roleLabel,
} from '../mappers/customerDisplay';

/** Giá trị trống hiện chữ mờ "Chưa cập nhật" thay vì ô rỗng. */
function orMissing(value: ReactNode, missing = 'Chưa cập nhật') {
  return value ? value : <span className="cust-missing">{missing}</span>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="cust-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

/** Hai thẻ hồ sơ khách hàng: thông tin định danh (từ eKYC) và tài khoản. Chỉ hiện field `UserProfileResponse` có. */
export function CustomerProfileCards({ customer }: { customer: UserItem }) {
  const ekyc = ekycDisplay(customer.ekycStatus);
  const account = accountState(customer.locked);
  return (
    <div className="cust-grid">
      <article className="ui-card cust-card" aria-labelledby="custIdentityTitle">
        <div className="cust-card-title">
          <h2 id="custIdentityTitle">Thông tin định danh</h2>
          <StatusPill tone={ekyc.tone}>{ekyc.label}</StatusPill>
        </div>
        <dl className="cust-dl">
          <Field label="Họ và tên">{orMissing(customer.fullName)}</Field>
          <Field label="Số CCCD">{orMissing(customer.idNumber && <span className="ui-mono">{customer.idNumber}</span>)}</Field>
          <Field label="Ngày sinh">{orMissing(customer.dateOfBirth && formatBirthDate(customer.dateOfBirth))}</Field>
          <Field label="Giới tính">{genderLabel(customer.gender)}</Field>
          <Field label="Quê quán">{orMissing(customer.placeOfOrigin)}</Field>
          <Field label="Nơi thường trú">{orMissing(customer.address)}</Field>
          <Field label="Giấy tờ CCCD">{customer.documentVerified ? 'Đã xác minh' : 'Chưa xác minh'}</Field>
          <Field label="Xác minh xong lúc">{orMissing(customer.ekycCompletedAt && formatDayTime(customer.ekycCompletedAt), 'Chưa xác minh')}</Field>
        </dl>
      </article>

      <article className="ui-card cust-card" aria-labelledby="custAccountTitle">
        <div className="cust-card-title">
          <h2 id="custAccountTitle">Tài khoản và phân quyền</h2>
        </div>
        <dl className="cust-dl">
          <Field label="Mã người dùng"><span className="ui-mono">#{customer.id}</span></Field>
          <Field label="Email đăng nhập">{customer.email}</Field>
          <Field label="Số điện thoại">{orMissing(customer.phone)}</Field>
          <Field label="Vai trò">{roleLabel(customer.role)}</Field>
          <Field label="Trạng thái tài khoản"><StatusPill tone={account.tone}>{account.label}</StatusPill></Field>
          <Field label="Hồ sơ cá nhân">{customer.profileCompleted ? 'Đã hoàn thiện' : 'Chưa hoàn tất'}</Field>
          <Field label="Ngày đăng ký">{orMissing(customer.createdAt && formatDayTime(customer.createdAt), 'Không rõ')}</Field>
        </dl>
      </article>
    </div>
  );
}
