import type { RefObject } from 'react';
import { NavLink } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import type { AdminNavigationSection } from './adminNavigation';
import { SidebarIcon } from './SidebarIcon';

/** Mục menu sidebar cao 34px; mục đang chọn tô màu nhấn (thắng cả nền khi rê chuột). */
const SIDEBAR_ITEM =
  'sidebar-item flex items-center gap-2.5 w-full h-8.5 mt-px px-2.5 rounded-md text-sidebar-text text-[13.5px] font-medium transition-[background,color] duration-150 ease-soft hover:bg-[rgba(255,255,255,0.06)] hover:text-white [&.active]:bg-brand [&.active]:text-white [&_svg]:flex-none [&_svg]:size-4 [&_svg]:opacity-90';

interface AdminSidebarProps {
  sections: AdminNavigationSection[];
  pathname: string;
  sidebarRef: RefObject<HTMLElement>;
  onClose: () => void;
  onLogout: () => void;
}

/**
 * Sidebar của khung quản trị: logo, menu theo quyền, nút đăng xuất. Màn rộng cố định bên trái; dưới 1024px là ngăn
 * trượt (lớp nav-open của khung trang) có nút đóng riêng ở đầu ngăn.
 */
export function AdminSidebar({ sections, pathname, sidebarRef, onClose, onLogout }: AdminSidebarProps) {
  return (
    <aside
      ref={sidebarRef}
      className="sidebar sticky top-0 flex flex-col flex-none w-(--sidebar-width) h-dvh bg-sidebar text-sidebar-text max-[1024px]:fixed max-[1024px]:left-0 max-[1024px]:z-90 max-[1024px]:shadow-pop max-[1024px]:transform-[translateX(-100%)] max-[1024px]:transition-[transform] max-[1024px]:duration-200 max-[1024px]:ease-soft max-[1024px]:in-[.nav-open]:transform-none"
      id="admin-sidebar"
    >
      <div className="sidebar-logo flex items-center gap-2.5 h-14 px-4 border-b border-b-[rgba(255,255,255,0.06)]">
        <div className="sidebar-logo-icon grid place-items-center flex-none size-6.5 rounded-[7px] bg-brand text-white">
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 2 3 7v10l9 5 9-5V7l-9-5z" />
            <path d="M12 22V12" />
            <path d="m3 7 9 5 9-5" />
          </svg>
        </div>
        <div className="sidebar-logo-text flex items-baseline gap-2">
          <span className="sidebar-brand text-white text-[15px] font-bold tracking-[0.02em]">FINORA</span>
          <span className="text-[#93a3c6] text-[12px]">Quản trị</span>
        </div>
        {/* Chỉ có ở ngăn trượt: đóng ngay trong ngăn, không phải tìm lại nút menu ở header bị che. */}
        <button
          type="button"
          className="sidebar-close hidden place-items-center flex-none size-8 ml-auto -mr-1.5 rounded-sm text-sidebar-muted hover:bg-[rgba(255,255,255,0.06)] hover:text-white [&_svg]:size-4.5 max-[1024px]:grid"
          aria-label="Đóng menu"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>

      <nav
        className="sidebar-nav flex-1 overflow-y-auto p-2 [&::-webkit-scrollbar-thumb]:[background:rgba(255,255,255,0.14)]"
        aria-label="Điều hướng quản trị"
      >
        {sections.map((section) => (
          <div className="sidebar-section mt-3" key={section.label || 'root'}>
            {section.label && (
              <div className="sidebar-section-label px-2.5 py-1 text-sidebar-muted text-[12px] font-medium">{section.label}</div>
            )}
            {section.items.map((item) => {
              const active = item.matches(pathname);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end
                  // Dùng hàm để NavLink không tự gắn lớp "active" theo tiền tố đường dẫn
                  // (/loans/operations nằm dưới /loans); mục đang chọn do `matches` quyết định.
                  className={() => `${SIDEBAR_ITEM}${active ? ' active' : ''}`}
                  aria-current={active ? 'page' : undefined}
                >
                  <SidebarIcon name={item.icon} />
                  <span className="sidebar-item-label flex-1 min-w-0 truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      <button
        type="button"
        className="sidebar-logout flex items-center gap-2.5 h-10 px-4.5 border-t border-t-[rgba(255,255,255,0.06)] text-[#c3cde3] text-[13px] hover:text-white [&_svg]:size-4"
        onClick={onLogout}
      >
        <Icon name="logout" />
        Đăng xuất
      </button>
    </aside>
  );
}
