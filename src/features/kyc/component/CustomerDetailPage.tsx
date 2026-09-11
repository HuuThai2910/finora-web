import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { userApi } from '@/features/user';
import type { UserItem } from '@/features/user';
import { useGetAdminApplicationsQuery } from '@/features/loan/api/loanReviewApi';
import { formatMoney, formatDateTime, APPLICATION_STATUS_LABELS } from '@/features/loan/formatters';
import type { AdminLoanReviewSummary } from '@/features/loan/types';
import './CustomerDetailPage.css';

type DetailTab = 'profile' | 'loans' | 'investments' | 'history';

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab: DetailTab = (searchParams.get('tab') as DetailTab) || 'profile';

  const [user, setUser] = useState<UserItem | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [userError, setUserError] = useState<string | null>(null);

  // Fetch loan applications from backend API
  const { data: loanData, isLoading: loadingLoans } = useGetAdminApplicationsQuery({
    page: 0,
    size: 100,
  });

  const fetchCustomerProfile = useCallback(async () => {
    if (!id) return;
    setLoadingUser(true);
    setUserError(null);
    try {
      const data = await userApi.getUserById(id);
      setUser(data);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setUserError(apiErr?.message || 'Không tìm thấy hồ sơ người dùng trong hệ thống.');
    } finally {
      setLoadingUser(false);
    }
  }, [id]);

  useEffect(() => {
    fetchCustomerProfile();
  }, [fetchCustomerProfile]);

  const handleTabChange = (tab: DetailTab) => {
    if (tab === 'profile') {
      searchParams.delete('tab');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ tab }, { replace: true });
    }
  };

  // Matched loans for this customer — chỉ lấy từ finora-loan, không dựng dữ liệu mẫu
  const customerLoans = useMemo<AdminLoanReviewSummary[]>(() => {
    if (!user) return [];

    const realApplications = loanData?.data || [];
    return realApplications.filter(
      (app) => app.borrowerId === String(user.id) || app.borrowerId === user.email
    );
  }, [user, loanData]);

  if (loadingUser) {
    return (
      <div className="cust-detail-page">
        <div className="cust-state-box">Đang tải thông tin hồ sơ khách hàng...</div>
      </div>
    );
  }

  if (userError || !user) {
    return (
      <div className="cust-detail-page">
        <div className="cust-detail-nav">
          <Link to="/customers/kyc" className="cust-back-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            Quay lại danh sách khách hàng
          </Link>
        </div>
        <div className="cust-state-box error">
          {userError || 'Không tìm thấy hồ sơ khách hàng.'}
        </div>
      </div>
    );
  }

  const isVerified = user.ekycStatus === 'VERIFIED';
  const roleLabel =
    user.role === 'BORROWER'
      ? 'Khách vay'
      : user.role === 'INVESTOR'
      ? 'Nhà đầu tư'
      : user.role === 'ADMIN'
      ? 'Quản trị viên'
      : user.role;

  return (
    <div className="cust-detail-page">
      {/* Top Back Navigation */}
      <div className="cust-detail-nav">
        <Link to="/customers/kyc" className="cust-back-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Quay lại danh sách khách hàng
        </Link>
      </div>

      {/* Clean Enterprise Customer Header */}
      <header className="cust-header-card">
        <div className="cust-header-main">
          <div className="cust-header-title-row">
            <h1>{user.fullName || 'Chưa cập nhật họ tên'}</h1>
            <span className={`cust-role-badge ${user.role.toLowerCase()}`}>
              {roleLabel}
            </span>
            <span className={`cust-status-badge ${isVerified ? 'verified' : user.ekycStatus === 'FAILED' ? 'failed' : 'pending'}`}>
              {isVerified ? 'Đã xác thực eKYC' : user.ekycStatus === 'FAILED' ? 'eKYC thất bại' : 'Chưa định danh'}
            </span>
          </div>
          <div className="cust-header-meta">
            <span>Mã KH: <strong>CUST-{String(user.id).padStart(5, '0')}</strong></span>
            <span className="cust-meta-dot">·</span>
            <span>Email: <strong>{user.email}</strong></span>
            <span className="cust-meta-dot">·</span>
            <span>SĐT: <strong>{user.phone || 'Chưa cung cấp'}</strong></span>
            <span className="cust-meta-dot">·</span>
            <span>CCCD: <strong>{user.idNumber || 'Chưa cập nhật'}</strong></span>
          </div>
        </div>

        <div className="cust-header-actions">
          <button
            type="button"
            className="cust-btn"
            onClick={fetchCustomerProfile}
            title="Làm mới thông tin"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="23 4 23 10 17 10" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            Làm mới
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav className="cust-tabs-bar" role="tablist" aria-label="Phân hệ hồ sơ khách hàng">
        <button
          type="button"
          className={`cust-tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => handleTabChange('profile')}
        >
          Thông tin cá nhân & Tài khoản
        </button>
        <button
          type="button"
          className={`cust-tab-btn ${activeTab === 'loans' ? 'active' : ''}`}
          onClick={() => handleTabChange('loans')}
        >
          Hồ sơ vay & Hợp đồng
          <span className="cust-tab-count">{customerLoans.length}</span>
        </button>
        <button
          type="button"
          className={`cust-tab-btn ${activeTab === 'investments' ? 'active' : ''}`}
          onClick={() => handleTabChange('investments')}
        >
          Lệnh đầu tư &amp; Khớp vốn
        </button>
        <button
          type="button"
          className={`cust-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => handleTabChange('history')}
        >
          Nhật ký hoạt động
        </button>
      </nav>

      {/* Tab 1: Profile & Identity */}
      {activeTab === 'profile' && (
        <div className="cust-panel">
          <div className="cust-grid-2">
            {/* Card 1: Identity & Citizen Card */}
            <article className="cust-card">
              <div className="cust-card-title">
                <span>Thông tin định danh CCCD</span>
                <span className={`cust-status-badge ${isVerified ? 'verified' : user.ekycStatus === 'FAILED' ? 'failed' : 'pending'}`}>
                  {isVerified ? 'Đã xác thực CCCD' : user.ekycStatus === 'FAILED' ? 'Thất bại' : 'Chưa định danh'}
                </span>
              </div>
              <dl className="cust-dl">
                <div className="cust-field">
                  <dt>Họ và tên</dt>
                  <dd>{user.fullName || '—'}</dd>
                </div>
                <div className="cust-field">
                  <dt>Số CCCD định danh</dt>
                  <dd>{user.idNumber ? <strong>{user.idNumber}</strong> : '—'}</dd>
                </div>
                <div className="cust-field">
                  <dt>Ngày sinh</dt>
                  <dd>{user.dateOfBirth || '—'}</dd>
                </div>
                <div className="cust-field">
                  <dt>Giới tính</dt>
                  <dd>{user.gender === 'MALE' ? 'Nam' : user.gender === 'FEMALE' ? 'Nữ' : '—'}</dd>
                </div>
                <div className="cust-field">
                  <dt>Quê quán</dt>
                  <dd>{user.placeOfOrigin || '—'}</dd>
                </div>
                <div className="cust-field">
                  <dt>Trạng thái định danh</dt>
                  <dd>{isVerified ? 'Hồ sơ hợp lệ (CCCD gắn chip)' : 'Chưa hoàn thành eKYC'}</dd>
                </div>
                <div className="cust-field" style={{ gridColumn: 'span 2' }}>
                  <dt>Nơi thường trú</dt>
                  <dd>{user.address || 'Chưa cập nhật'}</dd>
                </div>
              </dl>
            </article>

            {/* Card 2: Account & System Info */}
            <article className="cust-card">
              <div className="cust-card-title">
                <span>Tài khoản & Phân quyền</span>
              </div>
              <dl className="cust-dl">
                <div className="cust-field">
                  <dt>Mã định danh nội bộ</dt>
                  <dd><strong>CUST-{String(user.id).padStart(5, '0')}</strong></dd>
                </div>
                <div className="cust-field">
                  <dt>Email đăng nhập</dt>
                  <dd>{user.email}</dd>
                </div>
                <div className="cust-field">
                  <dt>Số điện thoại</dt>
                  <dd>{user.phone || 'Chưa cập nhật'}</dd>
                </div>
                <div className="cust-field">
                  <dt>Vai trò người dùng</dt>
                  <dd>
                    <span className={`cust-role-badge ${user.role.toLowerCase()}`}>
                      {roleLabel} ({user.role})
                    </span>
                  </dd>
                </div>
                <div className="cust-field">
                  <dt>Trạng thái tài khoản</dt>
                  <dd><span className="cust-pill approved">Đang hoạt động (Active)</span></dd>
                </div>
                <div className="cust-field">
                  <dt>Cổng xác thực</dt>
                  <dd>Keycloak Single Sign-On</dd>
                </div>
                <div className="cust-field" style={{ gridColumn: 'span 2' }}>
                  <dt>Hồ sơ cá nhân</dt>
                  <dd>{user.profileCompleted ? 'Đã hoàn thiện hồ sơ' : 'Chưa hoàn tất thiết lập hồ sơ'}</dd>
                </div>
              </dl>
            </article>
          </div>
        </div>
      )}

      {/* Tab 2: Loans & Credit Contracts */}
      {activeTab === 'loans' && (
        <div className="cust-panel">
          <article className="cust-table-card">
            <div className="cust-table-card-header">
              <h2>Hồ sơ vay vốn & Hợp đồng tín dụng</h2>
            </div>

            {loadingLoans ? (
              <div className="cust-empty-state">Đang tải danh sách hồ sơ vay...</div>
            ) : customerLoans.length === 0 ? (
              <div className="cust-empty-state">Khách hàng chưa có hồ sơ vay vốn nào trong hệ thống.</div>
            ) : (
              <div className="cust-table-responsive">
                <table className="cust-table">
                  <thead>
                    <tr>
                      <th>Mã hồ sơ / Hợp đồng</th>
                      <th>Số tiền vay</th>
                      <th>Kỳ hạn & Lãi suất</th>
                      <th>Phương thức trả nợ</th>
                      <th>Điểm tín dụng</th>
                      <th>Trạng thái hồ sơ</th>
                      <th>Ngày gửi</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {customerLoans.map((app) => (
                      <tr key={app.applicationNumber}>
                        <td>
                          <strong>{app.applicationNumber}</strong>
                          <span className="cust-table-sub">
                            {app.status === 'APPROVED' ? `Hợp đồng CTR-${app.applicationNumber.replace('APP-', '')}` : 'Chưa tạo hợp đồng'}
                          </span>
                        </td>
                        <td><strong>{formatMoney(app.requestedAmount)}</strong></td>
                        <td>
                          <span>{app.requestedTermMonths} tháng</span>
                          <span className="cust-table-sub">{app.annualInterestRate}% / năm</span>
                        </td>
                        <td>
                          {app.repaymentMethod === 'EQUAL_PRINCIPAL' ? 'Gốc đều hàng tháng' : 'Dư nợ giảm dần'}
                        </td>
                        <td>
                          {app.assessment?.evaluationScore ? (
                            <div>
                              <strong>{app.assessment.evaluationScore} điểm</strong>
                              <span className="cust-table-sub">Hạng {app.assessment.creditGrade || '—'}</span>
                            </div>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={`cust-pill ${app.status === 'APPROVED' ? 'approved' : app.status === 'REJECTED' ? 'rejected' : 'pending'}`}>
                            {APPLICATION_STATUS_LABELS[app.status] || app.status}
                          </span>
                        </td>
                        <td>{formatDateTime(app.submittedAt)}</td>
                        <td>
                          <Link className="cust-table-link" to={`/loans/${app.applicationNumber}/review`}>
                            Chi tiết thẩm định →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </div>
      )}

      {/* Tab 3: P2P Investments & Order Matching */}
      {activeTab === 'investments' && (
        <div className="cust-panel">
          <article className="cust-table-card">
            <div className="cust-table-card-header">
              <h2>Lệnh đầu tư &amp; Khớp vốn P2P</h2>
            </div>
            <div className="cust-empty-state">
              Dịch vụ đầu tư (finora-investment) chưa cung cấp API truy vấn lệnh theo
              người dùng. Mục này sẽ hiển thị dữ liệu ngay khi API sẵn sàng.
            </div>
          </article>
        </div>
      )}

      {/* Tab 4: Audit Trail / Activity History */}
      {activeTab === 'history' && (
        <div className="cust-panel">
          <article className="cust-table-card">
            <div className="cust-table-card-header">
              <h2>Nhật ký hoạt động</h2>
            </div>
            <div className="cust-empty-state">
              Hệ thống chưa có API nhật ký kiểm toán cho người dùng. Mục này sẽ hiển
              thị dữ liệu ngay khi API sẵn sàng.
            </div>
          </article>
        </div>
      )}

    </div>
  );
}
