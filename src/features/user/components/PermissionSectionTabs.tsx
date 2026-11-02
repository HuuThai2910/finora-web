import { useLocation, useNavigate } from 'react-router-dom';

const SECTIONS = [
  { to: '/users', label: 'Người dùng' },
  { to: '/users/roles', label: 'Vai trò nhân viên' },
] as const;

/** Hai phần của trang Phân quyền: tài khoản (đổi vai trò, khóa) và vai trò nhân viên (bộ quyền Xem/Thao tác). */
export function PermissionSectionTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <div className="ui-tabs" role="tablist" aria-label="Phần của trang Phân quyền">
      {SECTIONS.map((section) => (
        <button
          key={section.to}
          type="button"
          role="tab"
          aria-selected={pathname === section.to}
          onClick={() => navigate(section.to)}
        >
          {section.label}
        </button>
      ))}
    </div>
  );
}
