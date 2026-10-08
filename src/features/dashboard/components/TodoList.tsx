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
    <section className="ui-card dash-card dash-todo" aria-labelledby="dashTodoTitle">
      <DashCardHead id="dashTodoTitle" icon="checkSquare" title="Việc cần xử lý" aside={groups && <span className="ui-tag">{groups}</span>} />
      <ul>
        {todos.map((todo) => {
          const count = todo.count;
          const bad = Boolean(todo.alarming && count && count > 0);
          const state = bad ? 'bad' : count === 0 ? 'zero' : '';
          return (
            <li key={todo.key} className={state || undefined}>
              <Link to={todo.to}>
                <span className="ui-dot"><Icon name={todo.icon} /></span>
                <span className="t">
                  {todo.title}
                  <small>{todo.hint}</small>
                </span>
                <span className="n" aria-label={count == null ? 'Chưa tải được' : `${count} việc`}>
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
