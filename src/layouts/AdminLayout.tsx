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

        <div className="sidebar-user">
          <div className="sidebar-user-avatar">
            {profile?.fullName ? (
              <span style={{ fontWeight: 700, fontSize: 16, color: '#22d3ee' }}>
                {profile.fullName.charAt(0).toUpperCase()}
              </span>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" />
              </svg>
            )}
          </div>
          <div className="sidebar-user-info">
            <h3 style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 160 }}>
              {profile?.fullName || user?.fullName || 'Quản trị viên'}
            </h3>
            <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                background: 'rgba(34, 211, 238, 0.15)',
                color: '#22d3ee',
                padding: '1px 6px',
                borderRadius: 4,
                fontSize: 11,
                fontWeight: 600
              }}>
                {profile?.role || 'ADMIN'}
              </span>
              <span>Hệ thống FINORA</span>
            </p>
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
            <div className="header-badge">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              Fabric block #48210
            </div>
            <div className="header-live">
              <span className="header-live-dot" />
              LIVE
            </div>
            <span className="header-divider" />
            <button type="button" className="header-icon-btn" aria-label="Chế độ tối">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
              </svg>
            </button>
            <button type="button" className="header-logout-btn" onClick={handleLogout}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18.36 6.64A9 9 0 1 1 5.64 6.64" />
                <line x1="12" y1="2" x2="12" y2="12" />
              </svg>
              Đăng xuất
            </button>
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
