import { Link, useParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { useGetUserQuery } from '@/features/user';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { CustomerProfileCards } from '../components/CustomerProfileCards';
import { ekycDisplay, roleLabel } from '../mappers/customerDisplay';
import './CustomerDetailPage.css';

function BackLink() {
  return (
    <Link to="/customers/kyc" className="cust-back">
      <Icon name="chevronLeft" />
      Quay lại danh sách khách hàng
    </Link>
  );
}

/**
 * Hồ sơ một khách hàng từ finora-user.
 *
 * Mockup có thêm tab hồ sơ vay, lệnh đầu tư và nhật ký hoạt động; đã bỏ vì backend chưa có API lọc theo
 * người dùng (`/admin/loan-applications` không nhận `borrowerId`, investment và nhật ký chưa có API quản trị).
 * Không tải một trang hồ sơ vay rồi lọc ở trình duyệt vì kết quả sẽ thiếu mà trông như đầy đủ.
 */
export default function CustomerDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  // Luôn đọc lại khi mở trang: trang Người dùng có thể vừa khóa tài khoản hoặc đổi vai trò.
  const profile = useGetUserQuery(id ?? '', { skip: !id });
  const customer = profile.data;

  if (profile.isLoading) {
    return (
      <section className="ui-page">
        <div className="ui-card ui-empty" aria-busy="true">Đang tải hồ sơ khách hàng...</div>
      </section>
    );
  }

  if (!customer) {
    return (
      <section className="ui-page">
        <div><BackLink /></div>
        <div className="ui-card cust-state">
          {profile.error
            ? <ErrorNotice error={profile.error} onRetry={profile.refetch} />
            : <p className="ui-empty">Không tìm thấy hồ sơ khách hàng.</p>}
        </div>
      </section>
    );
  }

  const ekyc = ekycDisplay(customer.ekycStatus);

  return (
    <section className="ui-page">
      <header className="ui-page-head cust-head">
        <div className="cust-head-main">
          <div className="cust-title-row">
            <h1 className={customer.fullName ? undefined : 'empty'}>{customer.fullName || 'Chưa cập nhật họ tên'}</h1>
            <StatusPill tone={ekyc.tone}>{ekyc.label}</StatusPill>
            {customer.locked === true && <StatusPill tone="danger">Đã khóa</StatusPill>}
          </div>
          <div className="cust-meta">
            <span>{roleLabel(customer.role)}</span>
            <span className="ui-mono">#{customer.id}</span>
            <span>{customer.email}</span>
            <span><span className="k">SĐT</span> {customer.phone || '-'}</span>
            <span><span className="k">CCCD</span> {customer.idNumber ? <span className="ui-mono">{customer.idNumber}</span> : '-'}</span>
          </div>
        </div>
        <button type="button" className="ui-btn ghost" onClick={() => void profile.refetch()} disabled={profile.isFetching}>
          <Icon name="refresh" />
          {profile.isFetching ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      {profile.error ? <ErrorNotice error={profile.error} onRetry={profile.refetch} /> : null}

      <div className={profile.isFetching ? 'ui-busy' : undefined}>
        <CustomerProfileCards customer={customer} />
      </div>
    </section>
  );
}
