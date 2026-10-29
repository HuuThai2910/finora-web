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

/**
 * Ma trận quyền của một vai trò nhân viên: mỗi dòng là một chức năng (một màn quản trị), hai cột Xem và Thao tác.
 * Thao tác luôn kéo theo Xem (không thể bấm nút trên màn không mở được): tick Thao tác thì tự tick Xem, bỏ Xem thì
 * bỏ luôn Thao tác. Chức năng chỉ có quyền Xem thì cột Thao tác để trống.
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
            <th scope="col" className="staff-matrix-col">Thao tác</th>
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
                  {actionable.length > 0 && (
                    <input
                      type="checkbox"
                      checked={allAction}
                      disabled={disabled}
                      aria-label={`Thao tác mọi chức năng nhóm ${group}`}
                      onChange={(event) => toggleGroup(items, 'action', event.target.checked)}
                    />
                  )}
                </td>
              </tr>
              {items.map((item) => {
                const action = item.action;
                return (
                  <tr key={item.code}>
                    <th scope="row" className="staff-matrix-name">
                      {item.label}
                      <span className="ui-sub ui-mono">{item.code}</span>
                    </th>
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
                          aria-label={`Thao tác ${item.label}`}
                          onChange={(event) => toggleAction(item, action, event.target.checked)}
                        />
                      ) : (
                        <span className="staff-matrix-none" title="Chức năng này chỉ có quyền Xem">Chỉ xem</span>
                      )}
                    </td>
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
