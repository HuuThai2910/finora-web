import { StatusPill } from '@/components/StatusPill';
import { describeAction } from '../actions';
import {
  CLIENT_LABELS, ROLE_LABELS, methodInfo, serviceLabel, statusTone,
} from '../constants';
import { entryKey, formatClock, formatDay } from '../format';
import type { ActivityLogEntry } from '../types';

interface Props {
  entries: ActivityLogEntry[];
  openKey: string | null;
  onOpen: (entry: ActivityLogEntry) => void;
}

function Row({ entry, open, onOpen }: { entry: ActivityLogEntry; open: boolean; onOpen: (entry: ActivityLogEntry) => void }) {
  const method = methodInfo(entry.method);
  // Lượt gọi ghi có trong bảng tra thì hiện tên việc đã làm; GET và đường dẫn lạ giữ cách cũ (nhãn + đường dẫn).
  const action = describeAction(entry.method, entry.path, entry.requestBody);
  const target = action?.targets.map((item) => `${item.label} ${item.value}`).join(', ');
  const caller = [entry.role ? ROLE_LABELS[entry.role] ?? entry.role : null, entry.client ? CLIENT_LABELS[entry.client] : null];
  // Dòng đang mở ngăn chi tiết tô nền xanh nhạt; khi dòng có focus bàn phím thì nhường nền focus của .ui-table.
  return (
    <tr
      className={`${open ? 'clickable is-open' : 'clickable'} [&.is-open:not(:focus-visible)_td]:bg-brand-50`}
      tabIndex={0}
      aria-label={`Xem chi tiết ${action?.name ?? method.label} ${entry.path}`}
      onClick={() => onOpen(entry)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(entry);
        }
      }}
    >
      <td className="act-time whitespace-nowrap">
        {/* Dưới 900px cột Kết quả bị ẩn: mã kết quả nằm cạnh giờ để vẫn quét được lượt lỗi. */}
        <span className="flex items-center gap-1.5">
          <span className="strong">{formatClock(entry.at)}</span>
          <span className="act-time-status hidden max-[900px]:inline-flex"><StatusPill tone={statusTone(entry.status)} small>{entry.status}</StatusPill></span>
        </span>
        <span className="ui-sub">{formatDay(entry.at)}</span>
      </td>
      <td>
        <div className="act-call flex min-w-0 items-center gap-2">
          <StatusPill tone={method.tone} small>{method.label}</StatusPill>
          {action ? (
            <span className="act-action max-w-105 truncate font-semibold text-primary max-[900px]:whitespace-normal" title={entry.path}>{action.name}</span>
          ) : (
            <span className="ui-mono act-path max-w-105 truncate text-primary">{entry.path}{entry.query ? `?${entry.query}` : ''}</span>
          )}
        </div>
        {/* Mã đối tượng (hồ sơ, hợp đồng, lần khớp...) lấy từ đường dẫn: thông tin điều tra nên vẫn hiện. Màn rộng cắt bớt
            cho dòng gọn; màn hẹp cho xuống dòng để đọc đủ tên thao tác và mã. */}
        <span className="ui-sub max-w-105 truncate max-[900px]:whitespace-normal max-[900px]:wrap-anywhere">
          {target && <span className="act-target">{target} · </span>}
          {serviceLabel(entry.service)}
        </span>
      </td>
      <td>
        <span className="strong">{entry.user ?? 'Chưa đăng nhập'}</span>
        <span className="ui-sub">{caller.filter(Boolean).join(' · ')}</span>
      </td>
      <td className="max-[900px]:hidden">
        <StatusPill tone={statusTone(entry.status)}>{entry.status}</StatusPill>
        <span className="ui-sub">{entry.durationMs} ms</span>
      </td>
      <td className="act-error max-w-85 max-[900px]:hidden">
        {entry.status >= 400 ? (
          <>
            {entry.errorCode && <span className="ui-mono act-code block text-[12px] text-danger">{entry.errorCode}</span>}
            <span className="act-message line-clamp-2 text-[13px] text-secondary">{entry.errorMessage ?? 'Không có nội dung lỗi'}</span>
          </>
        ) : (
          <span className="ui-sub">-</span>
        )}
      </td>
    </tr>
  );
}

/** Mỗi dòng là một lượt gọi API; bấm dòng để xem đối tượng, body gửi lên và nội dung lỗi. */
export function ActivityLogTable({ entries, openKey, onOpen }: Props) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table list act-table [&_td]:align-top">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Thao tác</th>
            <th>Người gọi</th>
            <th className="max-[900px]:hidden">Kết quả</th>
            <th className="max-[900px]:hidden">Lỗi trả về</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const key = entryKey(entry);
            return <Row key={key} entry={entry} open={key === openKey} onOpen={onOpen} />;
          })}
        </tbody>
      </table>
    </div>
  );
}
