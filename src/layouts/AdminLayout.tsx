import { Suspense, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate, useNavigationType } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { resetApiCaches, type AppDispatch, type RootState } from '@/app/store';
import { logoutUser, usePermission } from '@/features/auth';
import { Icon } from '@/components/Icon';
import { RowMenu } from '@/components/RowMenu';
import { initials } from '@/components/Avatar';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';
import { backToListUrl } from '@/lib/navigation';
import { PageChunkFallback } from '@/components/GlobalProgressBar';
import { NotificationBell } from '@/features/staff-inbox';
import { AccountMenuHeader } from './AccountMenuHeader';
import { permissionSummary } from './accountSummary';
import { getAdminBreadcrumb, PAGE_ACCESS, visibleNavSections } from './adminNavigation';
import { AdminSidebar } from './AdminSidebar';
import { OpenApplicationBox } from './OpenApplicationBox';
import { useNavDrawer } from './useNavDrawer';
import '@/styles/ui.css';

/**
 * Khung trang quản trị, theo finora-web-mockup (SHELL + soft.css). Kích thước: sidebar 236px, mục menu 34px, header 56px.
 * Dưới 1024px sidebar thành ngăn trượt mở bằng nút menu ở header.
 */
export default function AdminLayout() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { profile, user } = useSelector((state: RootState) => state.auth);
  const { canAccess } = usePermission();
  // Nhân viên chỉ thấy mục có quyền Xem; quản trị viên thấy đủ.
  const navSections = visibleNavSections(canAccess);
  const roleLabel = profile?.role === 'STAFF' ? profile.staffRole?.name || profile.staffRoleName || 'Nhân viên' : 'Quản trị viên';
  const drawer = useNavDrawer(location.pathname);

  const breadcrumb = getAdminBreadcrumb(location.pathname);
  const displayName = profile?.fullName || user?.fullName || 'Quản trị viên';

  useEffect(() => {
    document.title = `${breadcrumb.current} | FINORA Quản trị`;
  }, [breadcrumb.current]);

  // Đổi trang thì mở trang mới từ đầu. Bấm Back/Forward (POP) thì để trình duyệt tự giữ vị trí cuộn cũ.
  useEffect(() => {
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [location.pathname, navigationType]);

  // Đăng xuất rồi bỏ cache API: tài khoản đăng nhập kế tiếp trên tab này không thấy dữ liệu của phiên trước.
  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate('/login', { replace: true });
    resetApiCaches();
  };

  return (
    <div className={`app-layout${drawer.open ? ' nav-open' : ''} flex min-h-dvh`}>
      <AdminSidebar
        sections={navSections}
        pathname={location.pathname}
        sidebarRef={drawer.sidebarRef}
        onClose={() => drawer.close()}
        onLogout={() => void handleLogout()}
      />

      <div
        className="nav-scrim hidden max-[1024px]:in-[.nav-open]:block max-[1024px]:in-[.nav-open]:fixed max-[1024px]:in-[.nav-open]:inset-0 max-[1024px]:in-[.nav-open]:z-89 max-[1024px]:in-[.nav-open]:bg-[rgba(12,29,67,0.45)]"
        onClick={() => drawer.close(false)}
        aria-hidden="true"
      />

      {/* Hai mảng tròn mờ ở góc trên (::before, ::after): chỉ là nền, không mang thông tin. */}
      <div className="main-area relative isolate flex flex-col flex-1 min-w-0 overflow-clip bg-page before:content-[''] before:absolute before:-z-1 before:-top-75 before:-right-40 before:size-140 before:rounded-[50%] before:bg-[radial-gradient(circle_at_40%_60%,#d8e2f1_0%,#e2e9f4_45%,rgba(226,233,244,0)_70%)] before:pointer-events-none after:content-[''] after:absolute after:-z-1 after:-top-62.5 after:left-[34%] after:size-90 after:rounded-[50%] after:bg-[radial-gradient(circle,rgba(216,226,241,0.9)_0%,rgba(216,226,241,0)_70%)] after:pointer-events-none">
        <header className="admin-header sticky top-0 z-40 flex items-center justify-between gap-3 h-(--header-height) px-(--admin-page-inline-padding) bg-[rgba(237,242,249,0.86)] backdrop-blur-sm max-[1024px]:justify-start">
          <button
            ref={drawer.toggleRef}
            type="button"
            className="nav-toggle hidden place-items-center flex-none size-8 -mr-1 rounded-sm text-secondary hover:bg-surface-muted hover:text-primary [&_svg]:size-4.5 max-[1024px]:grid"
            aria-label={drawer.open ? 'Đóng menu' : 'Mở menu'}
            aria-expanded={drawer.open}
            aria-controls="admin-sidebar"
            onClick={drawer.toggle}
          >
            <Icon name="menu" />
          </button>
          <nav className="header-breadcrumb flex items-center gap-1.5 min-w-0 text-secondary text-[13px] max-[760px]:text-[14px]" aria-label="Vị trí trang">
            {breadcrumb.section && (
              <>
                <span className="whitespace-nowrap max-[760px]:hidden">{breadcrumb.section}</span>
                <span className="sep text-line-strong max-[760px]:hidden" aria-hidden="true">/</span>
              </>
            )}
            {breadcrumb.parent && (
              <>
                {/* Về đúng danh sách đã mở trang chi tiết (giữ tab, bộ lọc, trang) nếu danh sách gửi kèm state. */}
                <Link className="whitespace-nowrap hover:text-primary" to={backToListUrl(location.state, breadcrumb.parent.to)}>{breadcrumb.parent.label}</Link>
                <span className="sep text-line-strong" aria-hidden="true">/</span>
              </>
            )}
            <span className="current truncate text-primary font-semibold" aria-current="page">{breadcrumb.current}</span>
          </nav>
          <div className="header-actions flex items-center gap-3 max-[1024px]:ml-auto max-[760px]:gap-1.5">
            {/* Ô mở hồ sơ theo mã: ai mở được trang hồ sơ vay (kể cả nhân viên thu hồi, cơ cấu, đối soát) đều dùng được. */}
            {canAccess(PAGE_ACCESS.loans) && <OpenApplicationBox />}
            <NotificationBell />
            {/* Menu tài khoản như mockup (soft.js): đầu menu là ai đang đăng nhập và quyền, dưới là Đăng xuất. */}
            <RowMenu
              label={`Tài khoản ${displayName}`}
              buttonClassName="header-user flex items-center gap-2.5 h-10 -mr-2 px-2 rounded-[10px] text-left transition-[background] duration-150 hover:bg-[rgba(255,255,255,0.7)] aria-expanded:bg-[rgba(255,255,255,0.7)]"
              buttonContent={(
                <>
                  <span className="header-user-avatar grid place-items-center size-7 rounded-[50%] bg-[#e3ecfd] text-brand text-[12px] font-bold" aria-hidden="true">
                    {initials(displayName)}
                  </span>
                  <span className="header-user-info flex flex-col leading-tight max-[760px]:hidden">
                    <span className="header-user-name text-primary text-[13px] font-semibold">{displayName}</span>
                    <span className="header-user-role text-secondary text-[12px]">{roleLabel}</span>
                  </span>
                  {/* Mũi tên lật lên khi menu đang mở (nút mở có aria-expanded). */}
                  <span className="header-user-chevron grid place-items-center text-muted transition-[transform] duration-150 in-aria-expanded:transform-[rotate(180deg)] [&_svg]:size-3.5">
                    <Icon name="chevronDown" />
                  </span>
                </>
              )}
              header={(
                <AccountMenuHeader
                  name={displayName}
                  email={profile?.email ?? user?.email ?? null}
                  roleLabel={roleLabel}
                  permissions={permissionSummary(profile)}
                />
              )}
              items={[{ key: 'logout', label: 'Đăng xuất', icon: 'logout', onSelect: () => void handleLogout() }]}
            />
          </div>
        </header>

        <main className="admin-content flex-1">
          <div className="admin-page w-full max-w-360 pt-5 px-(--admin-page-inline-padding) pb-8">
            <PageErrorBoundary resetKey={location.pathname}>
              <Suspense fallback={<PageChunkFallback />}>
                <Outlet />
              </Suspense>
            </PageErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
