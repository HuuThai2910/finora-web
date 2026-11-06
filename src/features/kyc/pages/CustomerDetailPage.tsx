import { Link, useParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { useGetUserQuery } from '@/features/user';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { toUiApiError } from '@/lib/api/errors';
import { useBackToList } from '@/lib/navigation';
import { CustomerActions } from '../components/CustomerActions';
import { CustomerOverviewSections, LockReasonNotice } from '../components/CustomerOverviewSections';
import { CustomerProfileCards } from '../components/CustomerProfileCards';
import { ekycDisplay, roleLabel } from '../mappers/customerDisplay';

const TITLE = 'text-[20px] font-bold leading-[1.3] tracking-[-0.01em]';

/** Về đúng danh sách đã mở hồ sơ (tab, trang đang xem); mở thẳng bằng đường dẫn thì về trang Khách hàng. */
function BackLink() {
  const backUrl = useBackToList('/customers/kyc');
  return (
    <Link
      to={backUrl}
      className="cust-back inline-flex items-center gap-1.5 text-secondary text-[13px] font-medium hover:text-brand [&_svg]:size-3.5"
    >
      <Icon name="chevronLeft" />
      Quay lại danh sách khách hàng
    </Link>
  );
}

/**
 * Hồ sơ một khách hàng từ finora-user, kèm toàn cảnh: hồ sơ vay (Loan lọc theo `borrowerId`), Note đang giữ
 * (Investment lọc theo nhà đầu tư) và lịch sử các lượt xác minh danh tính. Nhật ký hoạt động của khách mở ở trang Nhật
 * ký (lọc theo email) từ menu "⋯", cùng các thao tác khóa, đổi vai trò, duyệt xác minh.
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
    // Mã không tồn tại: báo ngắn như màn duyệt xác minh, không đưa câu kỹ thuật của backend và nút "Thử lại" vô ích.
    if (toUiApiError(profile.error).status === 404) {
      return (
        <section className="ui-page">
          <div className="ui-alert" role="alert">Không tìm thấy khách hàng này.</div>
          <div><BackLink /></div>
        </section>
      );
    }
    return (
      <section className="ui-page">
        <div><BackLink /></div>
        <div className="ui-card cust-state p-4">
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
      <header className="ui-page-head cust-head items-start">
        <div className="cust-head-main flex flex-col gap-1 min-w-0">
          <div className="cust-title-row flex items-center gap-2 flex-wrap">
            <h1 className={customer.fullName ? `${TITLE} text-primary` : `empty ${TITLE} text-muted`}>
              {customer.fullName || 'Chưa cập nhật họ tên'}
            </h1>
            <StatusPill tone={ekyc.tone}>{ekyc.label}</StatusPill>
            {customer.locked === true && <StatusPill tone="danger">Đã khóa</StatusPill>}
          </div>
          {/* Các mục ngăn bằng vạch dọc; màn hẹp xuống dòng nên bỏ vạch, cách nhau bằng khoảng trống. */}
          <div
            className="cust-meta flex items-center flex-wrap gap-y-1 text-secondary text-[13px] max-[760px]:gap-x-3 [&>span]:inline-flex [&>span]:items-center [&>span]:gap-1 [&>span+span]:ml-3 [&>span+span]:pl-3 [&>span+span]:border-l [&>span+span]:border-l-line max-[760px]:[&>span+span]:ml-0 max-[760px]:[&>span+span]:pl-0 max-[760px]:[&>span+span]:[border-left:0]"
          >
            <span>{roleLabel(customer.role)}</span>
            <span className="ui-mono">#{customer.id}</span>
            <span>{customer.email}</span>
            <span><span className="k text-muted">SĐT</span> {customer.phone || '-'}</span>
            <span><span className="k text-muted">CCCD</span> {customer.idNumber ? <span className="ui-mono">{customer.idNumber}</span> : '-'}</span>
          </div>
        </div>
        <div className="cust-head-actions flex flex-none items-center gap-2">
          <button type="button" className="ui-btn ghost" onClick={() => void profile.refetch()} disabled={profile.isFetching}>
            <Icon name="refresh" />
            {profile.isFetching ? 'Đang tải...' : 'Làm mới'}
          </button>
          <CustomerActions customer={customer} />
        </div>
      </header>

      {profile.error ? <ErrorNotice error={profile.error} onRetry={profile.refetch} /> : null}

      <LockReasonNotice customer={customer} />

      <div className={profile.isFetching ? 'ui-busy' : undefined}>
        <CustomerProfileCards customer={customer} />
      </div>

      <CustomerOverviewSections customer={customer} />
    </section>
  );
}
