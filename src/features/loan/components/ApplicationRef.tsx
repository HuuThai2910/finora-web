import { Link } from 'react-router-dom';

interface ApplicationRefProps {
  id: number;
  /** Mã `LA-…` nếu đã có (từ response hoặc `useApplicationNumbers`). */
  applicationNumber?: string | null;
}

/** "Hồ sơ LA-…" dẫn sang trang thẩm định; chưa có mã thì giữ "Hồ sơ #id" như trước. */
export function ApplicationRef({ id, applicationNumber }: ApplicationRefProps) {
  if (!applicationNumber) return <>Hồ sơ #{id}</>;
  return (
    <>
      Hồ sơ{' '}
      <Link className="ui-link ui-mono" to={`/loans/${encodeURIComponent(applicationNumber)}/review`} title={`ID ${id}`}>
        {applicationNumber}
      </Link>
    </>
  );
}
