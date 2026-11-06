import { ErrorNotice } from '@/components/ErrorNotice';
import { useGetStaffPermissionsQuery } from '../api/userQueries';
import { roleChangeConsequences, staffRoleAccess } from '../mappers/roleChangeDisplay';
import type { RoleType, StaffRole } from '../types';

const ACCESS_ROW = 'grid grid-cols-[72px_minmax(0,1fr)] gap-2 py-1.5 border-b border-b-divider last:[border-bottom:0]';

/** Tóm tắt quyền của vai trò nhân viên đang chọn: chức năng được Xem và chức năng được Thao tác. */
function StaffAccess({ role }: { role: StaffRole }) {
  // Danh mục chức năng cố định ở backend, dùng chung cache với ma trận quyền.
  const catalog = useGetStaffPermissionsQuery();
  if (catalog.error) return <ErrorNotice error={catalog.error} onRetry={catalog.refetch} />;
  if (!catalog.data) return <p className="user-staff-access text-muted text-[13px]" aria-busy="true">Đang tải quyền của vai trò...</p>;
  const access = staffRoleAccess(role.permissions, catalog.data);
  const list = (items: string[]) => (items.length > 0 ? items.join(', ') : <span className="text-muted">Không có</span>);
  return (
    <dl className="user-staff-access mt-2 rounded-md border border-line px-3 py-1 text-[13px]" aria-label={`Quyền của vai trò ${role.name}`}>
      <div className={ACCESS_ROW}>
        <dt className="text-muted">Xem</dt>
        <dd className="text-primary">{list(access.view)}</dd>
      </div>
      <div className={ACCESS_ROW}>
        <dt className="text-muted">Thao tác</dt>
        <dd className="text-primary">{list(access.action)}</dd>
      </div>
    </dl>
  );
}

interface RoleChangeSummaryProps {
  from: RoleType;
  to: RoleType;
  /** Vai trò nhân viên đang chọn (chỉ khi `to` là STAFF và đã chọn). */
  staffRole: StaffRole | null;
  /** Chưa đổi gì: không có hệ quả để nói. */
  unchanged: boolean;
}

/** Phần dưới hộp đổi vai trò: quyền của vai trò nhân viên đang chọn và điều sẽ xảy ra khi lưu. */
export function RoleChangeSummary({ from, to, staffRole, unchanged }: RoleChangeSummaryProps) {
  return (
    <>
      {staffRole ? <StaffAccess role={staffRole} /> : null}
      {unchanged ? null : (
        <div className="user-role-effects mt-3 rounded-md bg-surface-muted px-3 py-2.5 text-[13px] text-primary">
          <p className="font-semibold">Khi lưu</p>
          <ul className="mt-1 ml-4.5 list-disc grid gap-0.5 text-secondary">
            {roleChangeConsequences(from, to).map((line) => <li key={line}>{line}</li>)}
          </ul>
        </div>
      )}
    </>
  );
}
