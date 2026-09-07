import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { userApi } from '../api/userApi';
import type { UserItem, RoleType, EkycStatusType, PageResponse, UserStats } from '../types';
import './UserListPage.css';

type RoleFilterType = 'ALL' | 'ADMIN' | 'INVESTOR' | 'BORROWER';

export default function UserListPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [page, setPage] = useState(0);
  const [pageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<RoleFilterType>('ALL');
  const [ekycFilter, setEkycFilter] = useState<string>('ALL');

  // Modals state
  const [roleModalUser, setRoleModalUser] = useState<UserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleType>('BORROWER');
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  const [lockModalUser, setLockModalUser] = useState<{ user: UserItem; isLockAction: boolean } | null>(null);
  const [lockSubmitting, setLockSubmitting] = useState(false);

  const { profile: currentAdmin } = useSelector((state: RootState) => state.auth);

  const fetchUsers = useCallback(async (pageNum = 0) => {
    setLoading(true);
    setError(null);
    try {
      const res: PageResponse<UserItem> = await userApi.getUsers(pageNum, pageSize, {
        role: roleFilter,
        ekycStatus: ekycFilter as EkycStatusType | 'ALL',
      });
      setUsers(res.content || []);
      setPage(res.page || 0);
      setTotalPages(res.totalPages || 1);
      setTotalElements(res.totalElements || 0);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setError(apiErr?.message || 'Không thể tải danh sách người dùng.');
    } finally {
      setLoading(false);
    }
  }, [pageSize, roleFilter, ekycFilter]);

  const fetchStats = useCallback(async () => {
    try {
      setStats(await userApi.getStats());
    } catch {
      // Bộ đếm chỉ là thông tin phụ — lỗi ở đây không nên chặn bảng dữ liệu.
      setStats(null);
    }
  }, []);

  useEffect(() => {
    fetchUsers(page);
  }, [fetchUsers, page]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Đổi bộ lọc thì quay lại trang đầu, tránh rơi vào trang trống.
  useEffect(() => {
    setPage(0);
  }, [roleFilter, ekycFilter]);

  // Vai trò và eKYC đã lọc ở backend; ô tìm kiếm lọc thêm trong trang đang xem.
  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return users;

    return users.filter(
      (u) =>
        (u.fullName && u.fullName.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.phone && u.phone.includes(q)) ||
        (u.idNumber && u.idNumber.includes(q))
    );
  }, [users, searchTerm]);

  // Handle Role Assignment
  const handleOpenRoleModal = (u: UserItem) => {
    setRoleModalUser(u);
    setSelectedRole(u.role);
  };

  const handleSaveRole = async () => {
    if (!roleModalUser) return;
    setRoleSubmitting(true);
    try {
      await userApi.assignRole(roleModalUser.id, selectedRole);
      setRoleModalUser(null);
      fetchUsers(page);
      fetchStats();
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      alert(apiErr?.message || 'Không thể đổi vai trò');
    } finally {
      setRoleSubmitting(false);
    }
  };

  // Handle Lock / Unlock
  const handleOpenLockModal = (u: UserItem, isLock: boolean) => {
    if (currentAdmin && String(currentAdmin.id) === String(u.id)) {
      alert('Bạn không thể tự khóa tài khoản của chính mình!');
      return;
    }
    setLockModalUser({ user: u, isLockAction: isLock });
  };

  const handleConfirmLock = async () => {
    if (!lockModalUser) return;
    setLockSubmitting(true);
    try {
      if (lockModalUser.isLockAction) {
        await userApi.lockUser(lockModalUser.user.id);
      } else {
        await userApi.unlockUser(lockModalUser.user.id);
      }
      setLockModalUser(null);
      fetchUsers(page);
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      alert(apiErr?.message || 'Thao tác không thành công');
    } finally {
      setLockSubmitting(false);
    }
  };

  // Bộ đếm lấy từ thống kê toàn hệ thống, không phải trang đang tải.
  const totalAll = stats?.total ?? totalElements;
  const totalAdmins = stats?.byRole?.ADMIN ?? 0;
  const totalInvestors = stats?.byRole?.INVESTOR ?? 0;
  const totalBorrowers = stats?.byRole?.BORROWER ?? 0;

  return (
    <section className="user-page">
      {/* Page Header */}
      <header className="user-page-header">
        <div>
          <h1>Người dùng & Phân quyền</h1>
          <p>Quản lý danh sách tài khoản, phân quyền vai trò Keycloak (RBAC) và kiểm soát trạng thái truy cập.</p>
        </div>
        <button
          type="button"
          className="user-btn user-btn-secondary"
          onClick={() => fetchUsers(page)}
          disabled={loading}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {loading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </header>

      {/* Toolbar: Role Tabs, eKYC Filter & Search */}
      <div className="user-toolbar">
        <div className="user-tabs" role="tablist" aria-label="Lọc vai trò người dùng">
          <button
            type="button"
            className={`user-tab ${roleFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setRoleFilter('ALL')}
          >
            Tất cả <span className="user-tab-count">{totalAll}</span>
          </button>
          <button
            type="button"
            className={`user-tab ${roleFilter === 'ADMIN' ? 'active' : ''}`}
            onClick={() => setRoleFilter('ADMIN')}
          >
            Quản trị viên <span className="user-tab-count">{totalAdmins}</span>
          </button>
          <button
            type="button"
            className={`user-tab ${roleFilter === 'INVESTOR' ? 'active' : ''}`}
            onClick={() => setRoleFilter('INVESTOR')}
          >
            Nhà đầu tư <span className="user-tab-count">{totalInvestors}</span>
          </button>
          <button
            type="button"
            className={`user-tab ${roleFilter === 'BORROWER' ? 'active' : ''}`}
            onClick={() => setRoleFilter('BORROWER')}
          >
            Người vay <span className="user-tab-count">{totalBorrowers}</span>
          </button>
        </div>

        <div className="user-toolbar-right">
          <select
            className="user-select"
            value={ekycFilter}
            onChange={(e) => setEkycFilter(e.target.value)}
            aria-label="Lọc trạng thái eKYC"
          >
            <option value="ALL">Tất cả eKYC</option>
            <option value="VERIFIED">Đã xác minh</option>
            <option value="PENDING">Chờ xác minh</option>
            <option value="FAILED">Thất bại</option>
          </select>

          <div className="user-search-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className="user-search-input"
              placeholder="Tìm tên, email, CCCD, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="user-search-clear"
                onClick={() => setSearchTerm('')}
                aria-label="Xóa từ khóa"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="user-error-notice">
          {error}
        </div>
      )}

      {/* Main Table Card */}
      <div className="user-card user-table-wrap">
        <table className="user-table">
          <thead>
            <tr>
              <th>Người dùng</th>
              <th>Thông tin liên hệ</th>
              <th>Số CCCD</th>
              <th>Vai trò (Role)</th>
              <th>Trạng thái eKYC</th>
              <th style={{ textAlign: 'right' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && users.length === 0 ? (
              <tr>
                <td colSpan={6} className="user-empty-cell">
                  Đang tải danh sách người dùng...
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="user-empty-cell">
                  Không tìm thấy người dùng phù hợp.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const ekycStatus: EkycStatusType = u.ekycStatus;
                const isCurrentAdmin = Boolean(currentAdmin && String(currentAdmin.id) === String(u.id));
                const isLocked = u.locked === true;

                return (
                  <tr key={u.id}>
                    <td>
                      <div className="user-name-cell">
                        <div className="user-name-row">
                          <strong>{u.fullName || 'Chưa cập nhật tên'}</strong>
                          {isCurrentAdmin && (
                            <span className="user-you-badge">Bạn</span>
                          )}
                          {isLocked && (
                            <span className="user-locked-badge">Đã khóa</span>
                          )}
                        </div>
                        <span className="user-muted">{u.email}</span>
                      </div>
                    </td>
                    <td>
                      <div>{u.phone || '—'}</div>
                      <span className="user-muted">
                        {u.gender === 'MALE' ? 'Nam' : u.gender === 'FEMALE' ? 'Nữ' : '—'}
                      </span>
                    </td>
                    <td>
                      {u.idNumber ? (
                        <span className="user-code">{u.idNumber}</span>
                      ) : (
                        <span className="user-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`user-role-pill ${u.role?.toLowerCase()}`}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      <span className={`user-status-pill ${ekycStatus.toLowerCase()}`}>
                        {ekycStatus === 'VERIFIED'
                          ? 'Đã xác minh'
                          : ekycStatus === 'FAILED'
                          ? 'Thất bại'
                          : 'Chờ xác minh'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="user-actions-group">
                        <Link
                          to={`/customers/kyc/${u.id}`}
                          className="user-action-link"
                        >
                          Chi tiết
                        </Link>
                        <button
                          type="button"
                          className="user-action-link"
                          onClick={() => handleOpenRoleModal(u)}
                          disabled={isCurrentAdmin}
                          title={isCurrentAdmin ? 'Không thể đổi vai trò tài khoản hiện tại' : 'Đổi vai trò'}
                        >
                          Đổi Role
                        </button>
                        <button
                          type="button"
                          className={`user-action-link ${isLocked ? '' : 'user-action-danger'}`}
                          onClick={() => handleOpenLockModal(u, !isLocked)}
                          disabled={isCurrentAdmin}
                          title={
                            isCurrentAdmin
                              ? 'Không thể tự khóa tài khoản'
                              : isLocked
                              ? 'Mở khóa tài khoản'
                              : 'Khóa tài khoản'
                          }
                        >
                          {isLocked ? 'Mở khóa' : 'Khóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Footer Pagination */}
        <footer className="user-pagination">
          <span>
            Hiển thị <strong>{filteredUsers.length}</strong> / <strong>{totalElements}</strong> người dùng (Trang {page + 1} / {totalPages || 1})
          </span>
          <div className="user-pagination-controls">
            <button
              type="button"
              className="user-btn user-btn-secondary user-btn-sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Trang trước
            </button>
            <button
              type="button"
              className="user-btn user-btn-secondary user-btn-sm"
              disabled={page >= totalPages - 1 || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Trang sau
            </button>
          </div>
        </footer>
      </div>

      {/* Role Assignment Modal */}
      {roleModalUser && (
        <div className="user-modal-overlay" onClick={() => setRoleModalUser(null)}>
          <div className="user-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="user-modal-header">
              <div>
                <h2>Phân quyền vai trò Keycloak (RBAC)</h2>
                <span className="user-muted">{roleModalUser.email}</span>
              </div>
              <button
                type="button"
                className="user-modal-close"
                onClick={() => setRoleModalUser(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="user-modal-body">
              <p style={{ marginBottom: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
                Chọn vai trò mới cho tài khoản. Quyền hạn sẽ được đồng bộ ngay lập tức sang Keycloak:
              </p>
              <div className="user-role-options">
                {(['BORROWER', 'INVESTOR', 'ADMIN'] as RoleType[]).map((r) => (
                  <label
                    key={r}
                    className={`user-role-option ${selectedRole === r ? 'selected' : ''}`}
                  >
                    <input
                      type="radio"
                      name="userRole"
                      value={r}
                      checked={selectedRole === r}
                      onChange={() => setSelectedRole(r)}
                    />
                    <div>
                      <strong>{r}</strong>
                      <p>
                        {r === 'ADMIN'
                          ? 'Toàn quyền quản trị hệ thống FINORA'
                          : r === 'INVESTOR'
                          ? 'Nhà đầu tư cho vay P2P và quản lý danh mục'
                          : 'Người vay nộp hồ sơ và giải ngân tín dụng'}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div className="user-modal-footer">
              <button
                type="button"
                className="user-btn user-btn-secondary"
                onClick={() => setRoleModalUser(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="user-btn user-btn-primary"
                onClick={handleSaveRole}
                disabled={roleSubmitting}
              >
                {roleSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lock / Unlock Modal */}
      {lockModalUser && (
        <div className="user-modal-overlay" onClick={() => setLockModalUser(null)}>
          <div className="user-modal-card" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
            <div className="user-modal-header">
              <div>
                <h2>{lockModalUser.isLockAction ? 'Khóa tài khoản người dùng' : 'Mở khóa tài khoản'}</h2>
                <span className="user-muted">{lockModalUser.user.email}</span>
              </div>
              <button
                type="button"
                className="user-modal-close"
                onClick={() => setLockModalUser(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="user-modal-body">
              <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                Bạn có chắc chắn muốn {lockModalUser.isLockAction ? 'khóa' : 'mở khóa'} tài khoản <strong>{lockModalUser.user.email}</strong>?
              </p>
              {lockModalUser.isLockAction && (
                <div style={{ marginTop: 12, padding: '10px 14px', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 8, color: 'var(--danger)', fontSize: 12.5 }}>
                  Tài khoản bị khóa sẽ bị thu hồi phiên đăng nhập ngay lập tức trên Keycloak và không thể truy cập các dịch vụ FINORA.
                </div>
              )}
            </div>
            <div className="user-modal-footer">
              <button
                type="button"
                className="user-btn user-btn-secondary"
                onClick={() => setLockModalUser(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className={`user-btn ${lockModalUser.isLockAction ? 'user-btn-danger' : 'user-btn-primary'}`}
                onClick={handleConfirmLock}
                disabled={lockSubmitting}
              >
                {lockSubmitting ? 'Đang xử lý...' : lockModalUser.isLockAction ? 'Khóa tài khoản' : 'Mở khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

