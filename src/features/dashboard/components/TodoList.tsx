import { Link } from 'react-router-dom';
import { Icon } from '@/components/Icon';
import { formatNumber } from '@/utils';
import type { DashboardTodo } from '../types';
import { DashCardHead } from './DashCardHead';

/** "7 nhóm việc" ở đầu thẻ: chỉ đếm nhóm đã tải được và còn việc. */
function openGroupsLabel(todos: DashboardTodo[]): string | null {
  if (todos.some((todo) => todo.count === undefined)) return null;
  const open = todos.filter((todo) => todo.count != null && todo.count > 0).length;
  return open ? `${open} nhóm việc` : 'Không có việc';
}

/**
 * Thẻ "Việc cần xử lý" (mockup .db-todo): ô icon tròn, tên việc và gợi ý, số việc, mũi tên. Mỗi dòng dẫn tới
 * đúng hàng đợi; việc báo vấn đề có số lớn hơn 0 thì tô đỏ.
 */
export function TodoList({ todos }: { todos: DashboardTodo[] }) {
  const groups = openGroupsLabel(todos);
  return (
    <section className="ui-card dash-card dash-todo px-4.5 py-4" aria-labelledby="dashTodoTitle">
      <DashCardHead id="dashTodoTitle" icon="checkSquare" title="Việc cần xử lý" aside={groups && <span className="ui-tag">{groups}</span>} />
      {todos.length === 0 && <div className="ui-empty">Vai trò của bạn chưa được xem hàng đợi nào.</div>}
      <ul className="mt-1.5 [&>li+li]:border-t [&>li+li]:border-t-divider">
        {todos.map((todo) => {
          const count = todo.count;
          const bad = Boolean(todo.alarming && count && count > 0);
          // Lớp của dòng (bad/zero) tô ô icon, tên việc và số việc bên trong.
          const state = bad ? 'bad' : count === 0 ? 'zero' : '';
          return (
            <li key={todo.key} className={state || undefined}>
              <Link
                to={todo.to}
                className="-mx-1.5 grid grid-cols-[30px_minmax(0,1fr)_auto_14px] items-center gap-2.5 rounded-md px-1.5 py-1.75 text-primary hover:bg-[#f6f9ff] [&>svg]:size-3.5 [&>svg]:text-muted hover:[&>svg]:text-brand"
              >
                <span className="ui-dot size-7.5 [&_svg]:size-3.75 in-[li.bad]:bg-danger-bg in-[li.bad]:text-danger"><Icon name={todo.icon} /></span>
                <span className="t text-[13px] leading-[1.35] font-medium in-[li.zero]:text-muted">
                  {todo.title}
                  <small className="mt-px block text-[12px] font-normal text-muted">{todo.hint}</small>
                </span>
                <span
                  className="n min-w-7 rounded-[999px] bg-[#eef2fa] px-2 py-px text-center text-[13px] font-bold tabular-nums in-[li.zero]:text-muted in-[li.bad]:bg-danger-bg in-[li.bad]:text-danger"
                  aria-label={count == null ? 'Chưa tải được' : `${count} việc`}
                >
                  {count === undefined ? '…' : count === null ? '-' : formatNumber(count)}
                </span>
                <Icon name="chevronRight" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
