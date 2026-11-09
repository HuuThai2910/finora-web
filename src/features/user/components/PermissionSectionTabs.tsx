import { useLocation, useNavigate } from 'react-router-dom';

const SECTIONS = [
  { to: '/users', label: 'Người dùng' },
  { to: '/users/roles', label: 'Phân quyền' },
] as const;

/**
 * Hai tab gạch chân của trang Phân quyền (cùng kiểu tab lọc trong thẻ bảng): "Người dùng" là danh sách tài khoản (tạo
 * nhân viên, đổi vai trò, khóa), "Phân quyền" là vai trò nhân viên và bộ quyền Xem/Thao tác. Mỗi tab một route
 * (`/users`, `/users/roles`) nên link cũ vẫn mở đúng tab.
 */
export function PermissionSectionTabs() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  return (
    <div className="ui-line-tabs border-b border-b-line" role="tablist" aria-label="Phần của trang Phân quyền">
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
