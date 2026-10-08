import { formatBusinessLabel } from '../formatters';
import { shortApplicationNumber } from '../mappers/applicationListDisplay';

/**
 * Icon theo mục đích vay (`LoanPurpose` của Loan Service), nét lấy từ mockup loans.html. Màu nền giữ một
 * tông trung tính như mọi icon đầu dòng: màu chỉ dành cho trạng thái.
 */
const PURPOSE_PATHS: Record<string, string[]> = {
  DEBT_CONSOLIDATION: ['M3 7h18v10H3Z', 'M7 11h4'],
  CREDIT_CARD: ['M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z', 'M3 10h18'],
  MEDICAL: ['M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9Z'],
  SMALL_BUSINESS: ['M3 9h18l-1.5-5h-15Z', 'M5 9v11h14V9', 'M10 20v-5h4v5'],
  HOME_IMPROVEMENT: ['M3 10.5 12 3l9 7.5', 'M5 9v11h14V9'],
  EDUCATION: ['m2 9 10-5 10 5-10 5Z', 'M6 11v5c3 2 9 2 12 0v-5'],
  CAR: ['M5 17h14v-5l-2-5H7l-2 5Z', 'M6 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0', 'M14 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0'],
  MAJOR_PURCHASE: ['M6 7h12l-1 13H7Z', 'M9 7a3 3 0 0 1 6 0'],
  MOVING: ['M3 7h11v9H3Z', 'M14 10h4l3 3v3h-7', 'M5 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0', 'M15 17a2 2 0 1 0 4 0 2 2 0 1 0-4 0'],
  VACATION: ['M2 16h20', 'm6 16 6-10 6 10'],
  OTHER: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18', 'M8 12h8'],
};

/** Icon tài liệu khi hồ sơ không có mục đích vay. */
const FILE_PATHS = ['M14 2H6a2 2 0 0 0-2 2v16h16V8Z', 'M14 2v6h6', 'M8 13h8', 'M8 17h6'];

function PurposeIcon({ purpose }: { purpose: string | null }) {
  const paths = purpose == null ? FILE_PATHS : PURPOSE_PATHS[purpose] ?? PURPOSE_PATHS.OTHER;
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths.map((d) => <path key={d} d={d} />)}
    </svg>
  );
}

/** Ô đầu dòng của bảng hồ sơ: icon và nhãn mục đích vay dưới mã hồ sơ (`purposeCode` có sẵn trong DTO danh sách). */
export function ApplicationPurposeCell({ applicationNumber, purposeCode }: { applicationNumber: string; purposeCode: string | null }) {
  return (
    <div className="ui-row-main">
      <span className="ui-dot"><PurposeIcon purpose={purposeCode} /></span>
      <div className="loan-app-main">
        <span className="ui-code" title={applicationNumber}>{shortApplicationNumber(applicationNumber)}</span>
        {purposeCode != null && <span className="ui-sub">{formatBusinessLabel(purposeCode)}</span>}
      </div>
    </div>
  );
}
