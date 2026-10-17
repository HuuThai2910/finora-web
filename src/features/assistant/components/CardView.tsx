import { progressPercent } from '../mappers/display';
import type { AssistantCard } from '../types';

function CardBody({ card }: { card: AssistantCard }) {
  switch (card.kind) {
    case 'kv':
      return (
        <dl className="ui-rows">
          {card.items.map((item, index) => (
            <div key={`${item.label}-${index}`}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      );
    case 'table':
      return (
        <div className="as-table-wrap">
          <table className="as-table">
            <thead>
              <tr>
                {card.columns.map((column) => <th key={column} scope="col">{column}</th>)}
              </tr>
            </thead>
            <tbody>
              {card.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'progress': {
      const percent = progressPercent(card.value, card.max);
      return (
        <div className="as-progress">
          <div
            className="as-progress-track"
            role="progressbar"
            aria-label={card.title}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent ?? undefined}
            aria-valuetext={card.label ?? undefined}
          >
            <span style={{ width: `${percent ?? 0}%` }} />
          </div>
          {card.label ? <p>{card.label}</p> : null}
        </div>
      );
    }
    default:
      // Loại thẻ mới mà web chưa biết: bỏ qua thay vì làm hỏng cả câu trả lời.
      return null;
  }
}

/**
 * Thẻ số liệu trong câu trả lời: cặp nhãn–giá trị, bảng nhỏ hoặc thanh tiến độ. Chữ và số lấy nguyên
 * từ server (đã định dạng tiền/ngày kiểu Việt Nam), web không tính lại.
 */
export function CardView({ card }: { card: AssistantCard }) {
  return (
    <section className="as-card" aria-label={card.title}>
      <h3>{card.title}</h3>
      <CardBody card={card} />
    </section>
  );
}
