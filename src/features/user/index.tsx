export { default as UserListPage } from './pages/UserListPage';
export { default as StaffRolesPage } from './pages/StaffRolesPage';
export { userApi } from './api/userApi';
export * from './types';
// Hook RTK dùng chung cho trang khác cần danh sách/thống kê người dùng (eKYC, Tổng quan).
export { useGetUserQuery, useGetUsersQuery, useGetUserStatsQuery } from './api/userQueries';
export { EKYC_DISPLAY, ROLE_LABELS, maskIdNumber } from './constant';
// Hộp khóa/mở khóa và đổi vai trò dùng lại ở trang chi tiết khách hàng (cùng hành vi, cùng cache).
export { LockUserModal } from './components/LockUserModal';
export { ChangeRoleModal } from './components/ChangeRoleModal';
