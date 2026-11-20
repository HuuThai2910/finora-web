import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';
import { Modal } from '@/components/Modal';
import { toast } from '@/lib/toast';
import { formatNumber } from '@/utils/format';
import { describeAction } from '../actions';
import { CLIENT_LABELS, ROLE_LABELS, isErrorStatus, serviceLabel } from '../constants';
import { formatWhen, prettyBody } from '../format';
import type { ActivityLogEntry } from '../types';
import { ResultPill } from './ResultPill';

interface Props {
  entry: ActivityLogEntry;
  onClose: () => void;
  /** Lọc danh sách theo người gọi của lượt này (đóng hộp). */
  onFilterUser: (user: string) => void;
}

/** Dòng nhãn trái, giá trị phải; dòng không có giá trị thì bỏ. */
type InfoRow = [label: string, value: ReactNode];

const MONO = 'ui-mono wrap-anywhere';
const PRE = 'm-0 max-h-65 overflow-auto rounded-md border border-line bg-[#f7f9fc] px-3 py-2.5 font-mono text-[12px] leading-normal whitespace-pre-wrap text-primary wrap-anywhere';

function InfoGroup({ title, rows }: { title: string; rows: InfoRow[] }) {
  return (
    <section className="min-w-0">
      <h3 className="mb-2.5 text-[13px] font-semibold text-secondary">{title}</h3>
      <dl className="grid gap-2.25">
        {rows.filter(([, value]) => value != null && value !== '').map(([label, value]) => (
          <div key={label} className="flex min-w-0 items-baseline justify-between gap-3 text-[13px]">
            <dt className="flex-none text-muted">{label}</dt>
            <dd className="min-w-0 text-right font-medium tabular-nums wrap-anywhere [text-wrap:balance]">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2.5 text-[13px] font-semibold text-secondary">{title}</h3>
      <pre className={PRE}>{children}</pre>
    </section>
  );
}

/**
 * Chi tiết một lượt gọi trong hộp thoại: lỗi trả về (nếu có), lượt gọi và người gọi, đường dẫn, dữ liệu gửi lên (đã che
 * mật khẩu, PIN, OTP, token, ảnh từ Gateway). Hai lối tắt cho việc điều tra: xem mọi lượt gọi của cùng người này, sao
 * chép mã tra cứu để đối chiếu với người báo lỗi.
 */
export function ActivityLogDetailModal({ entry, onClose, onFilterUser }: Props) {
  const error = isErrorStatus(entry.status);
  const action = describeAction(entry.method, entry.path, entry.requestBody);
  const { user, traceId } = entry;

  const copyTraceId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success('Đã sao chép mã tra cứu.');
    } catch {
      // Trình duyệt chặn bộ nhớ tạm (trang không ở HTTPS, chưa cho quyền): báo để người dùng chọn chữ và sao chép tay.
      toast.warning('Không sao chép được, hãy chọn mã tra cứu và sao chép tay.');
    }
  };

  const callRows: InfoRow[] = [
    ['Thời gian', formatWhen(entry.at)],
    ['Đối tượng', action?.targets.map((item) => item.value).join(', ')],
    ['Nhóm chức năng', serviceLabel(entry.service)],
    ['Mã trả về', entry.status],
    ['Mã lỗi', error && entry.errorCode ? <span className={MONO}>{entry.errorCode}</span> : null],
    ['Thời gian xử lý', `${formatNumber(entry.durationMs)} ms`],
    ['Mã tra cứu', traceId ? <span className={MONO}>{traceId}</span> : null],
  ];
  const callerRows: InfoRow[] = [
    ['Tài khoản', user ?? 'Chưa đăng nhập'],
    ['Vai trò', entry.role ? ROLE_LABELS[entry.role] ?? entry.role : null],
    ['Ứng dụng', entry.client ? CLIENT_LABELS[entry.client] : null],
    ['Địa chỉ IP', entry.ip ? <span className="ui-mono">{entry.ip}</span> : null],
  ];

  return (
    <Modal
      title={action?.name ?? entry.path}
      titleAside={<ResultPill status={entry.status} />}
      medium
      onClose={onClose}
      footer={user || traceId ? (
        <>
          {user && (
            <button type="button" className="ui-btn ghost" onClick={() => onFilterUser(user)}>
              <Icon name="list" />
              Lọc theo người này
            </button>
          )}
          {traceId && (
            <button type="button" className="ui-btn ghost" onClick={() => void copyTraceId(traceId)}>
              <Icon name="file" />
              Sao chép mã tra cứu
            </button>
          )}
        </>
      ) : (
        <button type="button" className="ui-btn ghost" onClick={onClose}>Đóng</button>
      )}
    >
      <div className="grid gap-4.5">
        {error && (
          <div className="ui-alert wrap-anywhere" role="alert">
            <strong className="font-semibold">{entry.errorMessage ?? 'Hệ thống không trả nội dung lỗi.'}</strong>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-12 gap-y-4.5 max-[760px]:grid-cols-1">
          <InfoGroup title="Lượt gọi" rows={callRows} />
          <InfoGroup title="Người gọi" rows={callerRows} />
        </div>
        <Block title="Đường dẫn">{entry.method} {entry.path}{entry.query ? `?${entry.query}` : ''}</Block>
        {entry.requestBody && <Block title="Dữ liệu gửi lên">{prettyBody(entry.requestBody)}</Block>}
      </div>
    </Modal>
  );
}
