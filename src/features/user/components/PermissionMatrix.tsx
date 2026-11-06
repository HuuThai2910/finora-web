import { useEffect, useRef } from 'react';
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

/** Ô ma trận: thấp hơn ô bảng chung (đệm dọc 7px). */
const CELL = 'py-1.75 px-3 align-middle';
const NAME_CELL = `${CELL} text-left`;
/** Cột ô tick Xem, Sửa, Xóa: hẹp, canh giữa. */
const COL_CELL = `staff-matrix-col ${CELL} w-23 text-center max-[760px]:w-16`;
/** Dòng tên nhóm (chọn cả cột cho nhóm): vạch trên, chữ in hoa nhỏ. */
const GROUP_CELL = 'border-t border-t-line text-primary text-[12px] font-semibold uppercase tracking-[0.02em]';
const CHECKBOX = 'w-4 h-4 accent-brand cursor-pointer disabled:cursor-not-allowed';

/**
 * Ô không có quyền tương ứng: ô tick mờ, không bấm được, rê chuột để biết lý do.
 * Mờ hẳn (0.35) để khác ô bị khóa tạm khi đang lưu.
 */
function PlaceholderBox({ reason }: { reason: string }) {
  return (
    <input
      type="checkbox"
      className={`staff-matrix-placeholder ${CHECKBOX} opacity-[0.35]`}
      checked={false}
      disabled
      title={reason}
      aria-label={reason}
      readOnly
    />
  );
}

interface GroupCheckboxProps {
  checked: boolean;
  /** Chỉ một phần chức năng trong nhóm được chọn. */
  partial: boolean;
  disabled: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

/**
 * Ô chọn cả cột của một nhóm. Chọn một phần thì ô ở trạng thái `indeterminate` (gạch ngang) để không trông như "chưa
 * chọn gì"; bấm vào lúc đó thì chọn hết. `indeterminate` không có thuộc tính HTML nên phải gán qua DOM.
 */
function GroupCheckbox({ checked, partial, disabled, label, onChange }: GroupCheckboxProps) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = partial;
  }, [partial]);
  return (
    <input
      ref={ref}
      type="checkbox"
      className={CHECKBOX}
      checked={checked}
      disabled={disabled}
      aria-label={label}
      onChange={(event) => onChange(event.target.checked)}
    />
  );
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
    <div className="ui-table-wrap staff-matrix-wrap border border-line rounded-md">
      <table className="ui-table staff-matrix">
        <thead>
          <tr>
            <th scope="col" className={`${NAME_CELL} bg-surface-muted`}>Chức năng</th>
            <th scope="col" className={`${COL_CELL} bg-surface-muted`}>Xem</th>
            <th scope="col" className={`${COL_CELL} bg-surface-muted`}>Sửa</th>
            <th scope="col" className={`${COL_CELL} bg-surface-muted`}>Xóa</th>
          </tr>
        </thead>
        {groupFunctions(functions).map(([group, items]) => {
          const actionable = items.filter((item) => item.action);
          const viewCount = items.filter((item) => selected.has(item.view)).length;
          const actionCount = actionable.filter((item) => item.action && selected.has(item.action)).length;
          const allView = viewCount === items.length;
          const allAction = actionable.length > 0 && actionCount === actionable.length;
          // Nền xanh nhạt của dòng nhóm; ô tick nhường nền rê chuột chung của bảng (ui-table) như trước.
          const groupTick = `${COL_CELL} ${GROUP_CELL} [tr:not(:hover)>&]:bg-brand-50`;
          return (
            <tbody key={group}>
              <tr className="staff-matrix-group">
                <th scope="rowgroup" className={`${NAME_CELL} ${GROUP_CELL} bg-brand-50`}>{group}</th>
                <td className={groupTick}>
                  <GroupCheckbox
                    checked={allView}
                    partial={viewCount > 0 && !allView}
                    disabled={disabled}
                    label={`Xem mọi chức năng nhóm ${group}`}
                    onChange={(checked) => toggleGroup(items, 'view', checked)}
                  />
                </td>
                <td className={groupTick}>
                  {actionable.length > 0 ? (
                    <GroupCheckbox
                      checked={allAction}
                      partial={actionCount > 0 && !allAction}
                      disabled={disabled}
                      label={`Sửa mọi chức năng nhóm ${group}`}
                      onChange={(checked) => toggleGroup(items, 'action', checked)}
                    />
                  ) : <PlaceholderBox reason={NO_EDIT} />}
                </td>
                <td className={groupTick}><PlaceholderBox reason={NO_DELETE} /></td>
              </tr>
              {items.map((item) => {
                const action = item.action;
                return (
                  <tr key={item.code}>
                    <th scope="row" className={`staff-matrix-name ${NAME_CELL}`}>{item.label}</th>
                    <td className={COL_CELL}>
                      <input
                        type="checkbox"
                        className={CHECKBOX}
                        checked={selected.has(item.view)}
                        disabled={disabled}
                        aria-label={`Xem ${item.label}`}
                        onChange={(event) => toggleView(item, event.target.checked)}
                      />
                    </td>
                    <td className={COL_CELL}>
                      {action ? (
                        <input
                          type="checkbox"
                          className={CHECKBOX}
                          checked={selected.has(action)}
                          disabled={disabled}
                          aria-label={`Sửa ${item.label}`}
                          onChange={(event) => toggleAction(item, action, event.target.checked)}
                        />
                      ) : <PlaceholderBox reason={NO_EDIT} />}
                    </td>
                    <td className={COL_CELL}><PlaceholderBox reason={NO_DELETE} /></td>
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
