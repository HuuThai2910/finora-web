import { Link } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { attemptStatusDisplay, ekycReviewDetailPath, useGetUserEkycAttemptsQuery } from '@/features/ekyc-review';
import {
  fundingDetailPath, NOTE_STATUS_LABEL, NOTE_STATUS_TONE, useGetInvestorNotesQuery,
} from '@/features/investment';
import { BorrowerApplicationsCard } from '@/features/loan';
import { WithdrawalIncidentsSection } from '@/features/servicing';
import { useGetUserDevicesQuery, type UserItem } from '@/features/user';
import { formatCurrency, formatDateTime } from '@/utils/format';

const CARD = 'ui-card pt-3.5 px-4.5 pb-4 max-[600px]:px-3.5';
const HEAD = 'mb-2 flex items-baseline justify-between gap-3';
const TITLE = 'text-[15px] font-semibold leading-[1.4]';

/** Lý do khóa đã lưu; khóa từ trước khi có tính năng ghi lý do thì nói rõ là không có. */
export function LockReasonNotice({ customer }: { customer: UserItem }) {
  if (customer.locked !== true) return null;
  return (
    <div className="cust-lock-reason rounded-md bg-danger-bg px-3 py-2.5 text-[13px] text-danger" role="status">
      <b className="font-semibold">Tài khoản đang bị khóa</b>
      {customer.lockedAt ? ` từ ${formatDateTime(customer.lockedAt)}` : ''}.{' '}
      {customer.lockReason ? <>Lý do: {customer.lockReason}</> : 'Lần khóa này không ghi lý do.'}
    </div>
  );
}

/** Lịch sử các lượt xác minh danh tính của khách, mới nhất trước, kèm lý do từ chối (khách thấy lý do này). */
export function EkycHistoryCard({ customerId }: { customerId: number }) {
  const { canView } = usePermission();
  const attempts = useGetUserEkycAttemptsQuery(customerId);
  const rows = attempts.data?.content ?? [];
  const canOpen = canView('ekyc');

  return (
    <section className={`${CARD} cust-ekyc-history`} aria-label="Lịch sử xác minh danh tính">
      <div className={HEAD}>
        <h2 className={TITLE}>Lịch sử xác minh danh tính</h2>
        {attempts.data && <span className="text-[12px] text-muted">{attempts.data.totalElements} lượt</span>}
      </div>
      {attempts.error ? (
        <ErrorNotice error={attempts.error} onRetry={attempts.refetch} />
      ) : attempts.isLoading ? (
        <p className="ui-empty" aria-busy="true">Đang tải lịch sử xác minh...</p>
      ) : rows.length === 0 ? (
        <p className="ui-empty">Khách chưa xác minh danh tính lần nào.</p>
      ) : (
        <ol className="grid gap-2.5">
          {rows.map((attempt) => {
            const status = attemptStatusDisplay(attempt.status);
            return (
              <li key={attempt.attemptId} className="rounded-md border border-line px-3 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <StatusPill tone={status.tone} small>{status.label}</StatusPill>
                    <span className="text-[13px] text-secondary">Bắt đầu {formatDateTime(attempt.createdAt)}</span>
                  </div>
                  {canOpen && (
                    <Link className="ui-link text-[13px]" to={ekycReviewDetailPath(attempt.attemptId)}>Xem lượt này</Link>
                  )}
                </div>
                {(attempt.submittedAt || attempt.decidedAt) && (
                  <p className="mt-1 text-[12px] text-muted">
                    {attempt.submittedAt ? `Gửi lúc ${formatDateTime(attempt.submittedAt)}` : ''}
                    {attempt.submittedAt && attempt.decidedAt ? ' · ' : ''}
                    {attempt.decidedAt ? `Nhân viên quyết định lúc ${formatDateTime(attempt.decidedAt)}` : ''}
                  </p>
                )}
                {attempt.status === 'REJECTED' && attempt.reviewNote && (
                  <p className="mt-1.5 text-[13px]">
                    <span className="text-muted">Lý do từ chối (khách thấy trên app): </span>{attempt.reviewNote}
                  </p>
                )}
                {attempt.status === 'APPROVED' && attempt.reviewNote && (
                  <p className="mt-1.5 text-[13px]"><span className="text-muted">Ghi chú nội bộ: </span>{attempt.reviewNote}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

/**
 * Thiết bị khách đã đăng nhập (LOGIN-DEVICE-001), gần nhất trước: để nhân viên hỗ trợ đối chiếu khi khách báo lạ máy.
 * Không hiện mã thiết bị; IP đầy đủ như Nhật ký hoạt động.
 */
export function LoginDevicesCard({ customerId }: { customerId: number }) {
  const devices = useGetUserDevicesQuery(customerId);
  const rows = devices.data ?? [];

  return (
    <section className={`${CARD} cust-devices`} aria-label="Thiết bị đăng nhập">
      <div className={HEAD}>
        <h2 className={TITLE}>Thiết bị đăng nhập</h2>
        {devices.data && <span className="text-[12px] text-muted">{rows.length} thiết bị</span>}
      </div>
      {devices.error ? (
        <ErrorNotice error={devices.error} onRetry={devices.refetch} />
      ) : devices.isLoading ? (
        <p className="ui-empty" aria-busy="true">Đang tải thiết bị đăng nhập...</p>
      ) : rows.length === 0 ? (
        <p className="ui-empty">Chưa ghi nhận thiết bị nào (thiết bị được ghi từ lần đăng nhập sau khi có tính năng này).</p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Thiết bị</th>
                <th>Đăng nhập gần nhất</th>
                <th className="max-[760px]:hidden">Địa chỉ IP</th>
                <th className="num max-[760px]:hidden">Số lần</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((device) => (
                <tr key={device.id}>
                  <td>
                    <span className="font-medium">{device.deviceName}</span>
                    <span className="ui-sub">
                      {[device.osName, device.clientType === 'WEB' ? 'Trình duyệt' : 'Ứng dụng di động',
                        device.appVersion ? `bản ${device.appVersion}` : null].filter(Boolean).join(' · ')}
                    </span>
                  </td>
                  <td>
                    {formatDateTime(device.lastLoginAt)}
                    <span className="ui-sub">Lần đầu {formatDateTime(device.firstLoginAt)}</span>
                  </td>
                  <td className="max-[760px]:hidden">{device.ipAddress ? <span className="ui-mono">{device.ipAddress}</span> : '-'}</td>
                  <td className="num max-[760px]:hidden">{device.loginCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/** Note khách đang giữ khi là nhà đầu tư; dữ liệu từ finora-investment theo ID người dùng. */
export function InvestorNotesCard({ customerId }: { customerId: number }) {
  const notes = useGetInvestorNotesQuery({ investorId: String(customerId), page: 0, size: 10 });
  const rows = notes.data?.content ?? [];

  return (
    <section className={`${CARD} cust-notes`} aria-label="Khoản đầu tư">
      <div className={HEAD}>
        <h2 className={TITLE}>Khoản đầu tư (phần vốn)</h2>
        {notes.data && <span className="text-[12px] text-muted">{notes.data.totalElements} phần vốn</span>}
      </div>
      {notes.error ? (
        <ErrorNotice error={notes.error} onRetry={notes.refetch} />
      ) : notes.isLoading ? (
        <p className="ui-empty" aria-busy="true">Đang tải khoản đầu tư...</p>
      ) : rows.length === 0 ? (
        <p className="ui-empty">Khách chưa giữ phần vốn nào.</p>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Mã phần vốn</th>
                <th className="num">Gốc góp</th>
                <th className="num">Gốc còn lại</th>
                <th className="num">Lãi đã nhận</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((note) => (
                <tr key={note.noteNumber}>
                  <td>
                    <Link className="ui-link ui-mono" to={fundingDetailPath(note.listingId)}>{note.noteNumber}</Link>
                    <span className="ui-sub">{note.termMonths} tháng · {note.annualInterestRate}%/năm</span>
                  </td>
                  <td className="num">{formatCurrency(Number(note.principalAmount))}</td>
                  <td className="num">{formatCurrency(Number(note.outstandingPrincipal))}</td>
                  <td className="num">{formatCurrency(Number(note.interestReceived))}</td>
                  <td>
                    <StatusPill tone={NOTE_STATUS_TONE[note.status as keyof typeof NOTE_STATUS_TONE] ?? 'neutral'} small>
                      {NOTE_STATUS_LABEL[note.status as keyof typeof NOTE_STATUS_LABEL] ?? 'Không rõ'}
                    </StatusPill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/**
 * Toàn cảnh khách: hồ sơ vay (khi được xem Hồ sơ vay), khoản đầu tư (Xem Gọi vốn hoặc Khách hàng), lệnh rút tiền chờ
 * đối soát (Xem "Rút tiền") và lịch sử xác minh. Mỗi mục gọi API của service sở hữu dữ liệu, lọc theo ID người dùng ở
 * backend.
 */
export function CustomerOverviewSections({ customer }: { customer: UserItem }) {
  const { canView } = usePermission();
  const showLoans = canView('loan-application') && customer.role !== 'STAFF' && customer.role !== 'ADMIN';
  const showNotes = (canView('funding') || canView('customer')) && customer.role !== 'STAFF' && customer.role !== 'ADMIN';

  return (
    <div className="cust-overview grid gap-4">
      {showLoans && (
        <BorrowerApplicationsCard
          borrowerId={String(customer.id)}
          title="Hồ sơ vay"
          emptyText="Khách chưa nộp hồ sơ vay nào."
        />
      )}
      {showNotes && <InvestorNotesCard customerId={customer.id} />}
      {/* Lệnh rút đã trừ ví nhưng chưa có kết quả cuối; "Tra cứu lại" cần quyền Thao tác "Rút tiền". */}
      {canView('withdrawal') && customer.role !== 'STAFF' && customer.role !== 'ADMIN' && (
        <WithdrawalIncidentsSection ownerId={String(customer.id)} />
      )}
      <EkycHistoryCard customerId={customer.id} />
      <LoginDevicesCard customerId={customer.id} />
    </div>
  );
}
