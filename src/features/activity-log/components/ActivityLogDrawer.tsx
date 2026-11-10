import type { ReactNode } from 'react';
import { Drawer } from '@/components/Drawer';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { describeAction, isWriteMethod } from '../actions';
import {
  CLIENT_LABELS, ROLE_LABELS, methodInfo, serviceLabel, statusTone,
} from '../constants';
import { formatClock, formatDay, prettyBody } from '../format';
import type { ActivityLogEntry } from '../types';
import { toast } from '@/lib/toast';

/** Một dòng nhãn: giá trị; giá trị dài (đường dẫn, mã tra cứu) xuống dòng ở bất kỳ ký tự nào. */
function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd className="max-w-[60%] wrap-anywhere">{children}</dd>
    </div>
  );
}

const BREAK = 'wrap-anywhere whitespace-normal';

interface Props {
  entry: ActivityLogEntry;
  onClose: () => void;
  /** Lọc danh sách theo người gọi của lượt này (đóng ngăn). */
  onFilterUser: (user: string) => void;
  /** Báo kết quả sao chép mã tra cứu (Toast của trang). */
  onCopied: (message: string) => void;
}

/**
 * Chi tiết một lượt gọi: việc đã làm và đối tượng (với lượt gọi ghi có trong bảng tra `actions.ts`), ai gọi, nhóm chức
 * năng nào trả lời, body gửi lên (đã che) và lỗi trả về. Đường dẫn gốc luôn ở dòng phụ dưới tiêu đề. Hai lối tắt cho
 * việc điều tra: xem mọi lượt gọi của cùng người này, sao chép mã tra cứu để đối chiếu với người báo lỗi.
 */
export function ActivityLogDrawer({ entry, onClose, onFilterUser, onCopied }: Props) {
  const error = entry.status >= 400;
  const method = methodInfo(entry.method);
  const action = describeAction(entry.method, entry.path, entry.requestBody);
  const { user, traceId } = entry;

  const copyTraceId = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      onCopied('Đã sao chép mã tra cứu.');
    } catch {
      // Trình duyệt chặn bộ nhớ tạm (trang không ở HTTPS, chưa cho quyền): báo để người dùng chọn chữ và sao chép tay.
      toast.warning('Không sao chép được, hãy chọn mã tra cứu và sao chép tay.');
    }
  };

  return (
    <Drawer
      title={<>{action?.name ?? method.label} <StatusPill tone={statusTone(entry.status)} small>{entry.status}</StatusPill></>}
      subtitle={<span className={`ui-mono act-break ${BREAK}`}>{entry.path}</span>}
      onClose={onClose}
    >
      {error && (
        <div className="ui-alert act-alert mb-3 grid gap-1 wrap-anywhere" role="alert">
          <strong>{entry.errorCode ?? `Lỗi ${entry.status}`}</strong>
          <span>{entry.errorMessage ?? 'Hệ thống không trả nội dung lỗi.'}</span>
        </div>
      )}

      {(user || traceId) && (
        <div className="act-drawer-actions flex flex-wrap gap-2">
          {user && (
            <button type="button" className="ui-btn soft" onClick={() => onFilterUser(user)}>
              <Icon name="list" />
              Lọc theo người này
            </button>
          )}
          {traceId && (
            <button type="button" className="ui-btn soft" onClick={() => void copyTraceId(traceId)}>
              <Icon name="file" />
              Sao chép mã tra cứu
            </button>
          )}
        </div>
      )}

      <dl className="ui-rows act-rows">
        <Fact label="Thời gian">{formatClock(entry.at)} {formatDay(entry.at)}</Fact>
        <Fact label="Thao tác">{action ? <>{action.name} <StatusPill tone={method.tone} small>{method.label}</StatusPill></> : method.label}</Fact>
        {action && action.targets.length > 0 && (
          <Fact label="Đối tượng">
            {action.targets.map((target) => (
              <span key={target.label} className="block">
                {target.label} <span className={`ui-mono ${BREAK}`}>{target.value}</span>
              </span>
            ))}
          </Fact>
        )}
        <Fact label="Nhóm chức năng">{serviceLabel(entry.service)}</Fact>
        <Fact label="Thời gian xử lý">{entry.durationMs} ms</Fact>
        <Fact label="Người gọi">{user ?? 'Chưa đăng nhập'}</Fact>
        {entry.role && <Fact label="Vai trò">{ROLE_LABELS[entry.role] ?? entry.role}</Fact>}
        {entry.client && <Fact label="Ứng dụng">{CLIENT_LABELS[entry.client]}</Fact>}
        {entry.ip && <Fact label="Địa chỉ IP"><span className="ui-mono">{entry.ip}</span></Fact>}
        {entry.query && <Fact label="Tham số"><span className={`ui-mono act-break ${BREAK}`}>{entry.query}</span></Fact>}
        {traceId && <Fact label="Mã tra cứu"><span className="ui-mono">{traceId}</span></Fact>}
      </dl>

      <section className="act-section mt-4">
        <h3 className="mb-1.5 text-[14px] font-bold text-primary">Dữ liệu gửi lên</h3>
        {entry.requestBody
          ? (
            <pre className="act-pre m-0 max-h-80 overflow-auto rounded-md border border-line bg-[#f7f9fc] px-3 py-2.5 font-mono text-[12px] leading-normal whitespace-pre-wrap text-primary wrap-anywhere">
              {prettyBody(entry.requestBody)}
            </pre>
          )
          : (
            <p className="ui-sub">
              {/* Nhiều thao tác ghi (đánh dấu đã đọc, lập lại giấy xác nhận, làm mới phiên...) vốn không gửi body. */}
              {isWriteMethod(entry.method)
                ? 'Thao tác này không gửi kèm dữ liệu; nội dung nằm ở đường dẫn.'
                : 'Không có dữ liệu gửi lên.'}
            </p>
          )}
      </section>
      <p className="ui-sub act-privacy mt-3.5">
        Mật khẩu, mã PIN, OTP, token và ảnh giấy tờ, khuôn mặt đã được che bằng *** trước khi ghi.
      </p>
    </Drawer>
  );
}
