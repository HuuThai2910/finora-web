import { describeAction } from '../actions';
import { CLIENT_LABELS, ROLE_LABELS } from '../constants';
import { entryKey, formatWhen } from '../format';
import type { ActivityLogEntry } from '../types';
import { ResultPill } from './ResultPill';

interface Props {
  entries: ActivityLogEntry[];
  /** Đang lọc kết quả Lỗi: cột Vai trò, Ứng dụng nhường chỗ cho cột Lỗi trả về. */
  errorsOnly: boolean;
  onOpen: (entry: ActivityLogEntry) => void;
}

function Row({ entry, errorsOnly, onOpen }: { entry: ActivityLogEntry; errorsOnly: boolean; onOpen: (entry: ActivityLogEntry) => void }) {
  // Lượt gọi có trong bảng tra thì hiện tên việc đã làm; đường dẫn lạ hiện nguyên đường dẫn.
  const action = describeAction(entry.method, entry.path, entry.requestBody);
  const target = action?.targets.map((item) => item.value).join(', ');
  return (
    <tr
      className="clickable"
      tabIndex={0}
      aria-label={`Xem chi tiết ${action?.name ?? entry.path}`}
      onClick={() => onOpen(entry)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(entry);
        }
      }}
    >
      <td className="whitespace-nowrap tabular-nums">{formatWhen(entry.at)}</td>
      <td className="min-w-45 whitespace-normal font-medium text-primary">
        {action ? action.name : <span className="ui-mono wrap-anywhere">{entry.path}</span>}
      </td>
      {/* Mã dài (lượt xác minh là UUID) cắt bớt cho bảng không tràn; đủ mã ở hộp chi tiết. */}
      <td className="max-w-50 truncate max-[760px]:hidden" title={target}>{target}</td>
      <td>{entry.user ?? <span className="text-muted">Chưa đăng nhập</span>}</td>
      {errorsOnly ? null : (
        <>
          <td className="max-[1380px]:hidden">{entry.role ? ROLE_LABELS[entry.role] ?? entry.role : null}</td>
          <td className="max-[760px]:hidden">{entry.client ? CLIENT_LABELS[entry.client] : null}</td>
        </>
      )}
      <td><ResultPill status={entry.status} small /></td>
      {errorsOnly && (
        <td className="min-w-55 max-w-90 whitespace-normal text-[13px] text-secondary max-[760px]:hidden">{entry.errorMessage}</td>
      )}
    </tr>
  );
}

/**
 * Mỗi dòng là một lượt gọi API, mỗi ô một giá trị. Đối tượng chỉ ghi mã hoặc tên vì tên thao tác đã nói loại đối tượng;
 * thời gian xử lý, IP, đường dẫn và mã tra cứu nằm trong hộp chi tiết (bấm dòng).
 */
export function ActivityLogTable({ entries, errorsOnly, onOpen }: Props) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table list">
        <thead>
          <tr>
            <th>Thời gian</th>
            <th>Thao tác</th>
            <th className="max-[760px]:hidden">Đối tượng</th>
            <th>Người gọi</th>
            {errorsOnly ? null : (
              <>
                <th className="max-[1380px]:hidden">Vai trò</th>
                <th className="max-[760px]:hidden">Ứng dụng</th>
              </>
            )}
            <th>Kết quả</th>
            {errorsOnly && <th className="max-[760px]:hidden">Lỗi trả về</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => <Row key={entryKey(entry)} entry={entry} errorsOnly={errorsOnly} onOpen={onOpen} />)}
        </tbody>
      </table>
    </div>
  );
}
