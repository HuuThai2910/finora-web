/** Ô "Lỗi gần nhất" của các hàng đợi sự cố: mã lỗi dạng mã máy, chi tiết (nếu có) ở dòng phụ. */
export function ErrorCell({ code, detail }: { code: string | null; detail: string | null }) {
  if (!code) return <td className="svc-muted">Không có</td>;
  return (
    <td className="svc-wrap">
      <span className="ui-mono">{code}</span>
      {detail && <span className="ui-sub">{detail}</span>}
    </td>
  );
}
