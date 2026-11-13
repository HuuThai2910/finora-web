import { Link } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { fundingDetailPath, NOTE_STATUS_LABEL, NOTE_STATUS_TONE, useGetInvestorNotesQuery } from '@/features/investment';
import { useGetUserDevicesQuery } from '@/features/user';
import { formatCurrency, formatDate, formatDateTime } from '@/utils/format';

/** Số phần vốn tải một lần; dòng Tổng chỉ hiện khi đã tải đủ để không cộng thiếu. */
const NOTE_PAGE_SIZE = 100;

const HIDE_SM = 'max-[760px]:hidden';

/** Tổng số phần vốn khách đang giữ (số trên tab); cùng tham số với bảng nên dùng chung cache. */
export function useInvestorNoteCount(customerId: number, skip = false): number | undefined {
  return useGetInvestorNotesQuery({ investorId: String(customerId), page: 0, size: NOTE_PAGE_SIZE }, { skip }).data?.totalElements;
}

/** Tab Phần vốn của nhà đầu tư (finora-investment lọc theo người giữ), mới nhận trước, kèm dòng tổng. */
export function InvestorNotesTable({ customerId }: { customerId: number }) {
  const notes = useGetInvestorNotesQuery({ investorId: String(customerId), page: 0, size: NOTE_PAGE_SIZE });
  const rows = [...(notes.data?.content ?? [])].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const total = notes.data?.totalElements ?? 0;

  if (notes.error) return <ErrorNotice error={notes.error} onRetry={notes.refetch} />;
  if (notes.isLoading) return <p className="ui-empty" aria-busy="true">Đang tải phần vốn...</p>;
  if (rows.length === 0) return <p className="ui-empty">Khách chưa giữ phần vốn nào.</p>;

  const sum = (pick: (row: (typeof rows)[number]) => string) =>
    formatCurrency(rows.reduce((acc, row) => acc + Number(pick(row)), 0));

  return (
    <>
      <div className="ui-table-wrap">
        <table className="ui-table">
          <thead>
            <tr>
              <th>Mã phần vốn</th>
              <th className={HIDE_SM}>Ngày nhận</th>
              <th className={`num ${HIDE_SM}`}>Gốc góp</th>
              <th className={`num ${HIDE_SM}`}>Gốc còn lại</th>
              <th className={`num ${HIDE_SM}`}>Lãi đã nhận</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((note) => (
              <tr key={note.noteNumber}>
                <td><Link className="ui-link" to={fundingDetailPath(note.listingId)}>{note.noteNumber}</Link></td>
                <td className={HIDE_SM}>{formatDate(note.issuedAt)}</td>
                <td className={`num ${HIDE_SM}`}>{formatCurrency(Number(note.principalAmount))}</td>
                <td className={`num ${HIDE_SM}`}>{formatCurrency(Number(note.outstandingPrincipal))}</td>
                <td className={`num ${HIDE_SM}`}>{formatCurrency(Number(note.interestReceived))}</td>
                <td>
                  <StatusPill tone={NOTE_STATUS_TONE[note.status as keyof typeof NOTE_STATUS_TONE] ?? 'neutral'} small>
                    {NOTE_STATUS_LABEL[note.status as keyof typeof NOTE_STATUS_LABEL] ?? 'Không rõ'}
                  </StatusPill>
                </td>
              </tr>
            ))}
          </tbody>
          {total <= rows.length && (
            <tfoot>
              <tr className="font-semibold [&_td]:bg-surface-muted">
                <td>Tổng {rows.length} phần vốn</td>
                <td className={HIDE_SM} />
                <td className={`num ${HIDE_SM}`}>{sum((row) => row.principalAmount)}</td>
                <td className={`num ${HIDE_SM}`}>{sum((row) => row.outstandingPrincipal)}</td>
                <td className={`num ${HIDE_SM}`}>{sum((row) => row.interestReceived)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {total > rows.length && (
        <p className="mt-2 text-[12px] text-muted">Đang hiện {rows.length} phần vốn mới nhất trên tổng {total}.</p>
      )}
    </>
  );
}

/**
 * Tab Thiết bị đăng nhập (LOGIN-DEVICE-001), gần nhất trước: để nhân viên đối chiếu khi khách báo lạ máy. Không hiện mã
 * thiết bị; IP đầy đủ như Nhật ký hoạt động.
 */
export function LoginDevicesTable({ customerId }: { customerId: number }) {
  const devices = useGetUserDevicesQuery(customerId);
  const rows = [...(devices.data ?? [])].sort((a, b) => b.lastLoginAt.localeCompare(a.lastLoginAt));

  if (devices.error) return <ErrorNotice error={devices.error} onRetry={devices.refetch} />;
  if (devices.isLoading) return <p className="ui-empty" aria-busy="true">Đang tải thiết bị đăng nhập...</p>;
  if (rows.length === 0) return <p className="ui-empty">Chưa ghi nhận thiết bị nào.</p>;

  return (
    <div className="ui-table-wrap">
      <table className="ui-table">
        <thead>
          <tr>
            <th>Thiết bị</th>
            <th className={HIDE_SM}>Hệ điều hành</th>
            <th className={HIDE_SM}>Đăng nhập lần đầu</th>
            <th>Đăng nhập gần nhất</th>
            <th className={HIDE_SM}>Địa chỉ IP</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((device) => (
            <tr key={device.id}>
              <td>{device.deviceName}</td>
              <td className={HIDE_SM}>{device.osName || '-'}</td>
              <td className={HIDE_SM}>{formatDateTime(device.firstLoginAt)}</td>
              <td>{formatDateTime(device.lastLoginAt)}</td>
              <td className={HIDE_SM}>{device.ipAddress ? <span className="ui-mono">{device.ipAddress}</span> : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
