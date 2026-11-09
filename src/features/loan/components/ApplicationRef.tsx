import { Link } from 'react-router-dom';

interface ApplicationRefProps {
  id: number;
  /** Mã tra cứu `LA-…` nếu đã có (từ response hoặc `useApplicationNumbers`): dùng làm đường dẫn, không hiện. */
  applicationNumber?: string | null;
  /** Mã hiển thị `HS-…`; backend cũ chưa trả thì hiện mã tra cứu. */
  applicationCode?: string | null;
}

/** "Hồ sơ HS-…" dẫn sang trang thẩm định; chưa có mã thì giữ "Hồ sơ #id" như trước. */
export function ApplicationRef({ id, applicationNumber, applicationCode }: ApplicationRefProps) {
  if (!applicationNumber) return <>Hồ sơ #{id}</>;
  return (
    <>
      Hồ sơ{' '}
      <Link className="ui-link ui-mono" to={`/loans/${encodeURIComponent(applicationNumber)}/review`} title={`ID ${id}`}>
        {applicationCode || applicationNumber}
      </Link>
    </>
  );
}
