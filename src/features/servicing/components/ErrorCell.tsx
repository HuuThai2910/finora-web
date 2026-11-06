import { SVC_WRAP_CELL } from '../styles';

/**
 * Ô "Lỗi gần nhất" của các hàng đợi sự cố: câu mô tả lỗi là dòng chính để người vận hành đọc được ngay; mã lỗi xuống
 * dòng phụ, chỉ để tra nhật ký. Lỗi không có mô tả thì mã đứng một mình.
 */
export function ErrorCell({ code, detail }: { code: string | null; detail: string | null }) {
  if (!code && !detail) return <td className="svc-muted text-muted">Không có</td>;
  if (!detail) return <td className={SVC_WRAP_CELL}><span className="ui-mono">{code}</span></td>;
  return (
    <td className={SVC_WRAP_CELL}>
      {detail}
      {code && <span className="ui-sub ui-mono">{code}</span>}
    </td>
  );
}
