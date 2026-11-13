import { useState, type ReactNode } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import { ErrorNotice } from '@/components/ErrorNotice';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { useGetUserEkycAttemptsQuery } from '@/features/ekyc-review';
import { BorrowerApplicationsTable, useBorrowerApplicationCount } from '@/features/loan';
import { useWithdrawalIncidentCount, WithdrawalIncidentsSection } from '@/features/servicing';
import { LockUserModal, useGetUserDevicesQuery, useGetUserQuery, type UserItem } from '@/features/user';
import { toUiApiError } from '@/lib/api/errors';
import { ekycDisplay, formatBirthDate, formatDay, formatDayTime, genderLabel, roleLabel } from '../mappers/customerDisplay';
import { InvestorNotesTable, LoginDevicesTable, useInvestorNoteCount } from './CustomerTabTables';

interface CustomerDetailModalProps {
  customerId: number;
  onClose: () => void;
  /** Mở màn xác minh của một lượt (duyệt lượt đang chờ hoặc xem lượt gần nhất); trang mở hộp tự điều hướng. */
  onOpenAttempt: (attemptId: string) => void;
}

/** Một dòng nhãn trái, giá trị phải; `full` cho chữ dài (lý do khóa) xuống dưới nhãn. */
interface InfoRow {
  label: string;
  value: ReactNode;
  full?: boolean;
}

const MISSING = (text = 'Chưa cập nhật') => <span className="font-normal text-muted">{text}</span>;

/** Tuổi tính theo ngày sinh dạng `YYYY-MM-DD` (không qua `Date` để không lệch ngày theo múi giờ). */
function ageOf(dateOfBirth: string, today = new Date()): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth);
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const passed = today.getMonth() + 1 > month || (today.getMonth() + 1 === month && today.getDate() >= day);
  return today.getFullYear() - year - (passed ? 0 : 1);
}

function accountRows(customer: UserItem): InfoRow[] {
  const rows: InfoRow[] = [{ label: 'Số điện thoại', value: customer.phone || MISSING() }];
  // Chưa có họ tên thì tiêu đề hộp đã là email.
  if (customer.fullName) rows.push({ label: 'Email', value: customer.email });
  rows.push({ label: 'Vai trò', value: roleLabel(customer.role) });
  rows.push({ label: 'Ngày đăng ký', value: customer.createdAt ? formatDay(customer.createdAt) : MISSING('Không rõ') });
  if (customer.locked === true) {
    if (customer.lockedAt) rows.push({ label: 'Khóa lúc', value: formatDayTime(customer.lockedAt) });
    rows.push({ label: 'Lý do khóa', value: customer.lockReason || MISSING('Không ghi lý do'), full: true });
  }
  return rows;
}

/** Thông tin căn cước chỉ ghi vào hồ sơ khi lượt xác minh được duyệt, nên nhóm này chỉ có với khách đã xác minh. */
function identityRows(customer: UserItem): InfoRow[] {
  const age = customer.dateOfBirth ? ageOf(customer.dateOfBirth) : null;
  return [
    { label: 'Số CCCD', value: customer.idNumber || MISSING() },
    {
      label: 'Ngày sinh',
      value: customer.dateOfBirth ? `${formatBirthDate(customer.dateOfBirth)}${age != null ? ` (${age} tuổi)` : ''}` : MISSING(),
    },
    { label: 'Giới tính', value: customer.gender ? genderLabel(customer.gender) : MISSING() },
    { label: 'Quê quán', value: customer.placeOfOrigin || MISSING() },
    { label: 'Nơi thường trú', value: customer.address || MISSING() },
  ];
}

const ROW = 'flex items-baseline justify-between gap-3 min-w-0 text-[13px]';
const ROW_FULL = 'grid gap-0.5 min-w-0 text-[13px] [grid-column:1/-1]';

function InfoGroup({ title, rows, split }: { title: string; rows: InfoRow[]; split: boolean }) {
  return (
    <section className={split ? 'col-span-full' : 'min-w-0'}>
      <h3 className="mb-2.5 text-[13px] font-semibold text-secondary">{title}</h3>
      {/* Khách chưa xác minh chỉ có nhóm Tài khoản: các dòng chia hai cột để hộp không trống một nửa. */}
      <dl className={split ? 'grid grid-cols-2 gap-x-12 gap-y-2.25 max-[760px]:grid-cols-1' : 'grid gap-2.25'}>
        {rows.map((row) => (
          <div key={row.label} className={row.full ? ROW_FULL : ROW}>
            <dt className="flex-none text-muted">{row.label}</dt>
            <dd
              className={row.full
                ? 'min-w-0 font-medium wrap-anywhere'
                : 'min-w-0 text-right font-medium tabular-nums wrap-anywhere [text-wrap:balance]'}
            >
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

type TabKey = 'loans' | 'notes' | 'devices' | 'withdrawals';

const TAB =
  'inline-flex items-center gap-1.5 h-9.5 px-3 -mb-px border-b-2 border-b-transparent text-secondary text-[14px] font-medium ' +
  'whitespace-nowrap hover:text-primary aria-selected:text-brand aria-selected:border-b-brand aria-selected:font-semibold';

/**
 * Tab nghiệp vụ theo vai trò (hồ sơ vay của người vay, phần vốn của nhà đầu tư), rồi thiết bị đăng nhập. Lệnh rút tiền
 * chờ đối soát chỉ thành tab khi khách đang có lệnh như vậy. Số trên tab ẩn khi bằng 0.
 */
function CustomerTabs({ customer }: { customer: UserItem }) {
  const { canView } = usePermission();
  const isBorrower = customer.role === 'BORROWER';
  const showLoans = isBorrower && canView('loan-application');
  const showNotes = customer.role === 'INVESTOR';
  const canWithdrawals = canView('withdrawal');
  const loanCount = useBorrowerApplicationCount(String(customer.id), !showLoans);
  const noteCount = useInvestorNoteCount(customer.id, !showNotes);
  const deviceCount = useGetUserDevicesQuery(customer.id).data?.length;
  const withdrawalCount = useWithdrawalIncidentCount(String(customer.id), !canWithdrawals);

  const tabs: Array<{ key: TabKey; label: string; count?: number }> = [];
  if (showLoans) tabs.push({ key: 'loans', label: 'Hồ sơ vay', count: loanCount });
  if (showNotes) tabs.push({ key: 'notes', label: 'Phần vốn', count: noteCount });
  tabs.push({ key: 'devices', label: 'Thiết bị đăng nhập', count: deviceCount });
  if (canWithdrawals && (withdrawalCount ?? 0) > 0) tabs.push({ key: 'withdrawals', label: 'Lệnh rút chờ đối soát', count: withdrawalCount });

  const [picked, setPicked] = useState<TabKey | null>(null);
  const tab = tabs.find((item) => item.key === picked)?.key ?? tabs[0].key;

  return (
    <div className="grid gap-3">
      <div
        className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-b-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="tablist"
        aria-label="Hoạt động của khách hàng"
      >
        {tabs.map((item) => (
          <button key={item.key} type="button" role="tab" className={TAB} aria-selected={tab === item.key} onClick={() => setPicked(item.key)}>
            {item.label}
            {item.count ? <span className="text-muted text-[13px] font-normal tabular-nums">{item.count}</span> : null}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {tab === 'loans' && <BorrowerApplicationsTable borrowerId={String(customer.id)} />}
        {tab === 'notes' && <InvestorNotesTable customerId={customer.id} />}
        {tab === 'devices' && <LoginDevicesTable customerId={customer.id} />}
        {tab === 'withdrawals' && <WithdrawalIncidentsSection ownerId={String(customer.id)} bare />}
      </div>
    </div>
  );
}

/**
 * Lượt xác minh mở từ chân hộp: lượt đang chờ thì "Duyệt xác minh", lượt gần nhất đã gửi thì "Xem xác minh". Backend
 * trả lượt mới nhất trước; lượt bỏ dở hoặc đang làm (chưa gửi) không có gì để xem nên không có nút.
 */
function useVerificationAction(customerId: number, enabled: boolean): { attemptId: string; label: string } | null {
  const attempts = useGetUserEkycAttemptsQuery(customerId, { skip: !enabled });
  const pending = attempts.data?.content.find((item) => item.status === 'MANUAL_REVIEW');
  if (pending) return { attemptId: pending.attemptId, label: 'Duyệt xác minh' };
  const latest = attempts.data?.content.find((item) => item.submittedAt);
  return latest ? { attemptId: latest.attemptId, label: 'Xem xác minh' } : null;
}

function DetailBody({ customer }: { customer: UserItem }) {
  const verified = customer.ekycStatus === 'VERIFIED';
  return (
    <div className="grid gap-4.5">
      <div className="grid grid-cols-2 gap-x-12 gap-y-4.5 max-[760px]:grid-cols-1">
        <InfoGroup title="Tài khoản" rows={accountRows(customer)} split={!verified} />
        {verified && <InfoGroup title="Căn cước" rows={identityRows(customer)} split={false} />}
      </div>
      <CustomerTabs customer={customer} />
    </div>
  );
}

/**
 * Hồ sơ một khách hàng trong hộp thoại mở trên danh sách Khách hàng hoặc trên màn duyệt xác minh: thông tin tài khoản,
 * căn cước (khi đã xác minh), các tab hoạt động; chân hộp có khóa/mở khóa và mở màn xác minh. Trạng thái xác minh nằm ở
 * nhãn cạnh tên nên không có nhóm riêng; người duyệt, lý do và ảnh giấy tờ xem ở màn xác minh.
 */
export function CustomerDetailModal({ customerId, onClose, onOpenAttempt }: CustomerDetailModalProps) {
  const profile = useGetUserQuery(String(customerId));
  const customer = profile.data;
  const { canAct, canView } = usePermission();
  const currentId = useSelector((state: RootState) => state.auth.profile?.id ?? null);
  const [locking, setLocking] = useState(false);
  // Khách chưa từng gửi lượt nào (chưa xác minh) thì không cần tải danh sách lượt.
  const verification = useVerificationAction(customerId, canView('ekyc') && customer != null && customer.ekycStatus !== 'PENDING');

  if (!customer) {
    const notFound = toUiApiError(profile.error).status === 404;
    return (
      <Modal
        title="Chi tiết khách hàng"
        large
        onClose={onClose}
        footer={<button type="button" className="ui-btn ghost" onClick={onClose}>Đóng</button>}
      >
        {profile.isLoading ? (
          <p className="ui-empty" aria-busy="true">Đang tải hồ sơ khách hàng...</p>
        ) : notFound ? (
          <p className="ui-empty">Không tìm thấy khách hàng này.</p>
        ) : (
          <ErrorNotice error={profile.error} onRetry={profile.refetch} />
        )}
      </Modal>
    );
  }

  const ekyc = ekycDisplay(customer.ekycStatus);
  // Chỉ khi đã đọc được trạng thái khóa: không biết đang khóa hay mở thì không biết nút sẽ làm gì.
  const canLock = canAct('customer') && customer.locked != null && customer.id !== currentId;

  return (
    <>
      <Modal
        title={customer.fullName || customer.email}
        titleAside={(
          <>
            <StatusPill tone={ekyc.tone}>{ekyc.label}</StatusPill>
            {customer.locked === true && <StatusPill tone="danger">Đã khóa</StatusPill>}
          </>
        )}
        large
        onClose={onClose}
        footer={(
          <>
            {canLock && (
              customer.locked
                ? (
                  <button type="button" className="ui-btn ghost mr-auto" onClick={() => setLocking(true)}>
                    <Icon name="unlock" />
                    Mở khóa
                  </button>
                )
                : (
                  <button type="button" className="ui-btn outline-danger mr-auto" onClick={() => setLocking(true)}>
                    <Icon name="lock" />
                    Khóa tài khoản
                  </button>
                )
            )}
            {verification && (
              <button type="button" className="ui-btn primary" onClick={() => onOpenAttempt(verification.attemptId)}>
                {verification.label}
              </button>
            )}
            {!canLock && !verification && <button type="button" className="ui-btn ghost" onClick={onClose}>Đóng</button>}
          </>
        )}
      >
        <div className={profile.isFetching ? 'ui-busy' : undefined}>
          <DetailBody customer={customer} />
        </div>
      </Modal>
      {locking && <LockUserModal user={customer} onClose={() => setLocking(false)} onDone={() => setLocking(false)} />}
    </>
  );
}
