import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { userApi } from '@/features/user';
import type { UserItem, PageResponse } from '@/features/user';
import './CustomerKycPage.css';

type KycStatusFilter = 'ALL' | 'VERIFIED' | 'PENDING' | 'FAILED';

export default function CustomerKycPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

  // Search & Status Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<KycStatusFilter>('ALL');

  const loadCustomerList = useCallback(async () => {
    setLoadingUsers(true);
    setUserError(null);
    try {
      const res: PageResponse<UserItem> = await userApi.getUsers(0, 100);
      setUsers(res.content || []);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setUserError(apiErr?.message || 'Không thể tải danh sách hồ sơ khách hàng.');
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadCustomerList();
  }, [loadCustomerList]);

  // Status counts
  const totalCount = users.length;
  const verifiedCount = useMemo(
    () => users.filter((u) => u.ekycStatus === 'VERIFIED').length,
    [users]
  );
  const pendingCount = useMemo(
    () => users.filter((u) => u.ekycStatus === 'PENDING' || u.ekycStatus === 'MANUAL_REVIEW').length,
    [users]
  );
  const failedCount = useMemo(
    () => users.filter((u) => u.ekycStatus === 'FAILED').length,
    [users]
  );

  // Filtered list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const isVerified = u.ekycStatus === 'VERIFIED';
      const effectiveStatus: KycStatusFilter = isVerified
        ? 'VERIFIED'
        : u.ekycStatus === 'FAILED'
        ? 'FAILED'
        : 'PENDING';

      const matchStatus = statusFilter === 'ALL' || effectiveStatus === statusFilter;

      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.idNumber && u.idNumber.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q));

      return matchStatus && matchSearch;
    });
  }, [users, searchTerm, statusFilter]);

  return (
    <section className="kyc-page">
      {/* Page Header */}
      <header className="kyc-page-header">
        <div>
          <h1>Hồ sơ khách hàng & eKYC</h1>
          <p>Quản lý danh sách người dùng, tra cứu thông tin định danh, lịch sử hồ sơ vay, hợp đồng và lệnh khớp vốn.</p>
        </div>
        <button
          type="button"
          className="kyc-btn kyc-btn-secondary"
          onClick={loadCustomerList}
          disabled={loadingUsers}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {loadingUsers ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      {/* Toolbar: Status Tabs & Search */}
      <div className="kyc-toolbar">
        <div className="kyc-tabs" role="tablist" aria-label="Lọc trạng thái eKYC">
          <button
            type="button"
            className={`kyc-tab ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            Tất cả <span className="kyc-tab-count">{totalCount}</span>
          </button>
          <button
            type="button"
            className={`kyc-tab ${statusFilter === 'VERIFIED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('VERIFIED')}
          >
            Đã xác minh <span className="kyc-tab-count">{verifiedCount}</span>
          </button>
          <button
            type="button"
            className={`kyc-tab ${statusFilter === 'PENDING' ? 'active' : ''}`}
            onClick={() => setStatusFilter('PENDING')}
          >
            Chờ xác minh <span className="kyc-tab-count">{pendingCount}</span>
          </button>
          <button
            type="button"
            className={`kyc-tab ${statusFilter === 'FAILED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('FAILED')}
          >
            Thất bại <span className="kyc-tab-count">{failedCount}</span>
          </button>
        </div>

        <div className="kyc-search-wrap">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="kyc-search-input"
            placeholder="Tìm theo họ tên, email, số CCCD, SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button
              type="button"
              className="kyc-search-clear"
              onClick={() => setSearchTerm('')}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {userError && (
        <div className="kyc-error-notice">
          {userError}
        </div>
      )}

      {/* Main Table Card */}
      <div className="kyc-card kyc-table-wrap">
        <table className="kyc-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Số CCCD</th>
              <th>Liên hệ & Vai trò</th>
              <th>Ngày sinh & Giới tính</th>
              <th>Nơi thường trú</th>
              <th>Trạng thái eKYC</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loadingUsers ? (
              <tr>
                <td colSpan={7} className="kyc-empty-cell">
                  Đang tải danh sách hồ sơ...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="kyc-empty-cell">
                  Không tìm thấy hồ sơ khách hàng phù hợp.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isVerified = u.ekycStatus === 'VERIFIED';
                const statusType = isVerified
                  ? 'VERIFIED'
                  : u.ekycStatus === 'FAILED'
                  ? 'FAILED'
                  : 'PENDING';

                return (
                  <tr key={u.id}>
                    <td>
                      <div className="kyc-user-cell">
                        <strong>{u.fullName || 'Chưa cập nhật tên'}</strong>
                        <span className="kyc-muted">{u.email}</span>
                      </div>
                    </td>
                    <td>
                      {u.idNumber ? (
                        <span className="kyc-code">{u.idNumber}</span>
                      ) : (
                        <span className="kyc-muted">—</span>
                      )}
                    </td>
                    <td>
                      <div>{u.phone || '—'}</div>
                      <span className="kyc-muted">{u.role || 'USER'}</span>
                    </td>
                    <td>
                      <div>{u.dateOfBirth || '—'}</div>
                      <span className="kyc-muted">
                        {u.gender === 'MALE' ? 'Nam' : u.gender === 'FEMALE' ? 'Nữ' : '—'}
                      </span>
                    </td>
                    <td>
                      <div
                        className="kyc-address-cell"
                        title={u.address || u.placeOfOrigin || ''}
                      >
                        {u.address || u.placeOfOrigin || '—'}
                      </div>
                    </td>
                    <td>
                      <span className={`kyc-status-pill ${statusType.toLowerCase()}`}>
                        {statusType === 'VERIFIED'
                          ? 'Đã xác minh'
                          : statusType === 'FAILED'
                          ? 'Thất bại'
                          : 'Chờ xác minh'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <Link
                        to={`/customers/kyc/${u.id}`}
                        className="kyc-action-link"
                      >
                        Xem chi tiết →
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer Summary */}
        <footer className="kyc-pagination">
          <span>
            Hiển thị <strong>{filteredUsers.length}</strong> / <strong>{totalCount}</strong> hồ sơ
          </span>
          <span className="kyc-muted">
            Thu thập qua FINORA Mobile · Lưu trữ mã hóa AES-256
          </span>
        </footer>
      </div>
    </section>
  );
}
