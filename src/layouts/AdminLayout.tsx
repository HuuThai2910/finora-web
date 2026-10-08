import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '@/app/store';
import { logoutUser } from '@/features/auth';
import { Icon } from '@/components/Icon';
import { RowMenu } from '@/components/RowMenu';
import { initials } from '@/components/Avatar';
import { ADMIN_NAV_SECTIONS, getAdminBreadcrumb } from './adminNavigation';
import { SidebarIcon } from './SidebarIcon';
import '@/styles/ui.css';
import './AdminLayout.css';

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { profile, user } = useSelector((state: RootState) => state.auth);
  // Ngăn menu trượt chỉ dùng trên màn hẹp; trạng thái mở là chuyện riêng của khung trang.
  const [navOpen, setNavOpen] = useState(false);

  const breadcrumb = getAdminBreadcrumb(location.pathname);
  const displayName = profile?.fullName || user?.fullName || 'Quản trị viên';

  useEffect(() => {
    document.title = `${breadcrumb.current} | FINORA Quản trị`;
  }, [breadcrumb.current]);

  // Đổi trang thì đóng ngăn menu, nếu không ngăn sẽ che nội dung vừa mở.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setNavOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navOpen]);

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
  };

  return (
    <div className={`app-layout${navOpen ? ' nav-open' : ''}`}>
      <aside className="sidebar" id="admin-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 2 3 7v10l9 5 9-5V7l-9-5z" />
              <path d="M12 22V12" />
              <path d="m3 7 9 5 9-5" />
            </svg>
          </div>
          <div className="sidebar-logo-text">
            <span className="sidebar-brand">FINORA</span>
            <span>Quản trị</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Điều hướng quản trị">
          {ADMIN_NAV_SECTIONS.map((section) => (
            <div className="sidebar-section" key={section.label || 'root'}>
              {section.label && <div className="sidebar-section-label">{section.label}</div>}
              {section.items.map((item) => {
                const active = item.matches(location.pathname);
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    // Dùng hàm để NavLink không tự gắn lớp "active" theo tiền tố đường dẫn
                    // (/loans/operations nằm dưới /loans); mục đang chọn do `matches` quyết định.
                    className={() => `sidebar-item${active ? ' active' : ''}`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <SidebarIcon name={item.icon} />
                    <span className="sidebar-item-label">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        <button type="button" className="sidebar-logout" onClick={handleLogout}>
          <Icon name="logout" />
          Đăng xuất
        </button>
      </aside>

      <div className="nav-scrim" onClick={() => setNavOpen(false)} aria-hidden="true" />

      <div className="main-area">
        <header className="admin-header">
          <button
            type="button"
            className="nav-toggle"
            aria-label={navOpen ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={navOpen}
            aria-controls="admin-sidebar"
            onClick={() => setNavOpen((open) => !open)}
          >
            <Icon name="menu" />
          </button>
          <nav className="header-breadcrumb" aria-label="Vị trí trang">
            {breadcrumb.section && (
              <>
                <span>{breadcrumb.section}</span>
                <span className="sep" aria-hidden="true">/</span>
              </>
            )}
            {breadcrumb.parent && (
              <>
                <Link to={breadcrumb.parent.to}>{breadcrumb.parent.label}</Link>
                <span className="sep" aria-hidden="true">/</span>
              </>
            )}
            <span className="current" aria-current="page">{breadcrumb.current}</span>
          </nav>
          <div className="header-actions">
            {/* Menu tài khoản như mockup (soft.js): bấm tên mở danh sách; hiện chỉ có Đăng xuất. */}
            <RowMenu
              label={`Tài khoản ${displayName}`}
              buttonClassName="header-user"
              buttonContent={(
                <>
                  <span className="header-user-avatar" aria-hidden="true">{initials(displayName)}</span>
                  <span className="header-user-info">
                    <span className="header-user-name">{displayName}</span>
                    <span className="header-user-role">Quản trị viên</span>
                  </span>
                  <span className="header-user-chevron"><Icon name="chevronDown" /></span>
                </>
              )}
              items={[{ key: 'logout', label: 'Đăng xuất', icon: 'logout', onSelect: () => void handleLogout() }]}
            />
          </div>
        </header>

        <main className="admin-content">
          <div className="admin-page">
            <Suspense fallback={<div className="ui-empty" aria-busy="true">Đang tải trang...</div>}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
