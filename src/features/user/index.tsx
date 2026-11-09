export { default as UserListPage } from './pages/UserListPage';
export { default as StaffRolesPage } from './pages/StaffRolesPage';
export { userApi } from './api/userApi';
export * from './types';
// Hook RTK dùng chung cho trang khác cần danh sách/thống kê người dùng (eKYC, Tổng quan).
export { useGetUserDevicesQuery, useGetUserQuery, useGetUsersQuery, useGetUserStatsQuery } from './api/userQueries';
export { EKYC_DISPLAY, ROLE_LABELS, maskIdNumber } from './constant';
// Hộp khóa/mở khóa dùng lại ở trang chi tiết khách hàng (cùng hành vi, cùng cache). Đổi vai trò chỉ còn ở trang
// Phân quyền cho tài khoản nội bộ: khách hàng không được biến thành nhân viên.
export { LockUserModal } from './components/LockUserModal';
