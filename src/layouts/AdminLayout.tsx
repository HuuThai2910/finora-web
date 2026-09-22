import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/app/store';
import { logoutUser } from '@/features/auth';
import { ADMIN_NAV_SECTIONS, getAdminPageTitle, type AdminNavigationItem } from './adminNavigation';
import { SidebarIcon } from './SidebarIcon';
import './AdminLayout.css';

function NavigationLabel({ item }: { item: AdminNavigationItem }) {
  return (
    <>
      <SidebarIcon name={item.icon} />
      <span className="sidebar-item-label">{item.label}</span>
      {!item.isAvailable && <span className="sidebar-item-status">Sắp triển khai</span>}
    </>
  );
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { profile, user } = useSelector((state: RootState) => state.auth);

  const pageTitle = getAdminPageTitle(location.pathname);
  const displayName = profile?.fullName || user?.fullName || 'Quản trị viên';
  const selectedStatus = new URLSearchParams(location.search).get('status');

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  };

  const isNavigationItemActive = (item: AdminNavigationItem, routerActive: boolean) => {
    if (item.to === '/loans?status=PENDING_REVIEW') {
      return location.pathname === '/loans' && selectedStatus === 'PENDING_REVIEW';
    }
    if (item.to === '/loans') {
      return routerActive && selectedStatus !== 'PENDING_REVIEW';
    }
    if (item.to === '/customers/kyc') {
      return location.pathname.startsWith('/customers/kyc');
    }
    return routerActive;
  };

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2 3 7v10l9 5 9-5V7l-9-5z" />
              <path d="M12 22V12" />
              <path d="m3 7 9 5 9-5" />
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <h1>FINORA</h1>
            <span>P2P LENDING</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Điều hướng quản trị">
          {ADMIN_NAV_SECTIONS.map((section) => (
            <div className="sidebar-section" key={section.label}>
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => item.isAvailable ? (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  className={({ isActive }) =>
                    `sidebar-item${isNavigationItemActive(item, isActive) ? ' active' : ''}`
                  }
                >
                  <NavigationLabel item={item} />
                </NavLink>
              ) : (
                <button
                  key={item.to}
                  type="button"
                  className="sidebar-item disabled"
                  disabled
                  title={`${item.label} chưa được kết nối chức năng`}
                >
                  <NavigationLabel item={item} />
                </button>
              ))}
            </div>
          ))}
        </nav>

        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
          Đổi vai trò / Đăng xuất
        </button>
      </aside>

      <div className="main-area">
        <header className="admin-header">
          <div className="header-breadcrumb">
            <div className="header-title">{pageTitle}</div>
            <div className="header-path">FINORA / Quản trị / {pageTitle}</div>
          </div>
          <div className="header-actions">
            {/* Trạng thái hệ thống gộp thành một chip mờ: thông tin nền, không tranh chú ý với nội dung trang. */}
            <div className="header-status" title="Đang đồng bộ với Hyperledger Fabric">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              <span>Fabric #48210</span>
              <span className="header-live-dot" aria-label="Đang trực tuyến" />
            </div>
            <button type="button" className="header-icon-btn" aria-label="Chế độ tối">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </button>
            <span className="header-divider" />
            {/* Ai đang thao tác. Đăng xuất nằm ở đáy sidebar, không lặp lại ở đây. */}
            <div className="header-user" title={displayName}>
              <div className="header-user-avatar" aria-hidden="true">
                {displayName.charAt(0).toUpperCase()}
              </div>
              <div className="header-user-info">
                <span className="header-user-name">{displayName}</span>
                <span className="header-user-role">{profile?.role || 'ADMIN'}</span>
              </div>
            </div>
          </div>
        </header>

        <main className="admin-content">
          <div className="admin-page">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
