import type { StaffPermissionFunction } from '../types';

interface PermissionMatrixProps {
  functions: StaffPermissionFunction[];
  selected: ReadonlySet<string>;
  disabled?: boolean;
  onChange: (next: Set<string>) => void;
}

/** Gom chức năng theo nhóm, giữ thứ tự backend trả (thứ tự của `OpsFunction`). */
function groupFunctions(functions: StaffPermissionFunction[]): Array<[string, StaffPermissionFunction[]]> {
  const groups = new Map<string, StaffPermissionFunction[]>();
  for (const item of functions) {
    const list = groups.get(item.group);
    if (list) list.push(item);
    else groups.set(item.group, [item]);
  }
  return Array.from(groups.entries());
}

/** Ô không có quyền tương ứng: ô tick mờ, không bấm được, rê chuột để biết lý do. */
function PlaceholderBox({ reason }: { reason: string }) {
  return <input type="checkbox" className="staff-matrix-placeholder" checked={false} disabled title={reason} aria-label={reason} readOnly />;
}

const NO_EDIT = 'Chức năng này chỉ có quyền Xem';
// Nhân viên không xóa được dữ liệu nghiệp vụ ở chức năng nào (lưu trữ sản phẩm vay tính là Sửa), nên cột Xóa chỉ để
// người cấu hình thấy rõ điều đó; khi backend có quyền xóa riêng thì thay ô này bằng ô tick thật.
const NO_DELETE = 'Chức năng này không có quyền Xóa';

/**
 * Ma trận quyền của một vai trò nhân viên: mỗi dòng là một chức năng (một màn quản trị), ba cột Xem, Sửa, Xóa.
 * Sửa (quyền `ops:<mã>:action`: thêm, sửa, duyệt, xử lý, lưu cấu hình) luôn kéo theo Xem (không thể bấm nút trên màn
 * không mở được): tick Sửa thì tự tick Xem, bỏ Xem thì bỏ luôn Sửa. Ô không có quyền tương ứng hiện mờ, không bấm được.
 */
export function PermissionMatrix({ functions, selected, disabled = false, onChange }: PermissionMatrixProps) {
  const toggleView = (item: StaffPermissionFunction, checked: boolean) => {
    const next = new Set(selected);
    if (checked) {
      next.add(item.view);
    } else {
      next.delete(item.view);
      if (item.action) next.delete(item.action);
    }
    onChange(next);
  };

  const toggleAction = (item: StaffPermissionFunction, action: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) {
      next.add(action);
      next.add(item.view);
    } else {
      next.delete(action);
    }
    onChange(next);
  };

  /** Bật/tắt một cột cho cả nhóm, theo cùng quy tắc Xem/Thao tác như từng ô. */
  const toggleGroup = (items: StaffPermissionFunction[], column: 'view' | 'action', checked: boolean) => {
    const next = new Set(selected);
    for (const item of items) {
      if (column === 'view') {
        if (checked) next.add(item.view);
        else {
          next.delete(item.view);
          if (item.action) next.delete(item.action);
        }
      } else if (item.action) {
        if (checked) {
          next.add(item.action);
          next.add(item.view);
        } else next.delete(item.action);
      }
    }
    onChange(next);
  };

  return (
    <div className="ui-table-wrap staff-matrix-wrap">
      <table className="ui-table staff-matrix">
        <thead>
          <tr>
            <th scope="col">Chức năng</th>
            <th scope="col" className="staff-matrix-col">Xem</th>
            <th scope="col" className="staff-matrix-col">Sửa</th>
            <th scope="col" className="staff-matrix-col">Xóa</th>
          </tr>
        </thead>
        {groupFunctions(functions).map(([group, items]) => {
          const actionable = items.filter((item) => item.action);
          const allView = items.every((item) => selected.has(item.view));
          const allAction = actionable.length > 0 && actionable.every((item) => item.action && selected.has(item.action));
          return (
            <tbody key={group}>
              <tr className="staff-matrix-group">
                <th scope="rowgroup">{group}</th>
                <td className="staff-matrix-col">
                  <input
                    type="checkbox"
                    checked={allView}
                    disabled={disabled}
                    aria-label={`Xem mọi chức năng nhóm ${group}`}
                    onChange={(event) => toggleGroup(items, 'view', event.target.checked)}
                  />
                </td>
                <td className="staff-matrix-col">
                  {actionable.length > 0 ? (
                    <input
                      type="checkbox"
                      checked={allAction}
                      disabled={disabled}
                      aria-label={`Sửa mọi chức năng nhóm ${group}`}
                      onChange={(event) => toggleGroup(items, 'action', event.target.checked)}
                    />
                  ) : <PlaceholderBox reason={NO_EDIT} />}
                </td>
                <td className="staff-matrix-col"><PlaceholderBox reason={NO_DELETE} /></td>
              </tr>
              {items.map((item) => {
                const action = item.action;
                return (
                  <tr key={item.code}>
                    <th scope="row" className="staff-matrix-name">{item.label}</th>
                    <td className="staff-matrix-col">
                      <input
                        type="checkbox"
                        checked={selected.has(item.view)}
                        disabled={disabled}
                        aria-label={`Xem ${item.label}`}
                        onChange={(event) => toggleView(item, event.target.checked)}
                      />
                    </td>
                    <td className="staff-matrix-col">
                      {action ? (
                        <input
                          type="checkbox"
                          checked={selected.has(action)}
                          disabled={disabled}
                          aria-label={`Sửa ${item.label}`}
                          onChange={(event) => toggleAction(item, action, event.target.checked)}
                        />
                      ) : <PlaceholderBox reason={NO_EDIT} />}
                    </td>
                    <td className="staff-matrix-col"><PlaceholderBox reason={NO_DELETE} /></td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
