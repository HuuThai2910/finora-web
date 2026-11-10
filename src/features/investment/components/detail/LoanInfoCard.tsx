import { Link } from 'react-router-dom';
import { ReviewCard, ReviewRows, type ReviewRow } from '@/features/loan';
import { toast } from '@/lib/toast';
import type { MarketListing } from '../../types';
import {
  estimateNoteCount,
  formatDateTime,
  formatMoney,
  formatMonths,
  formatRate,
  repaymentLabel,
} from '../../formatters';

interface Props {
  listing: MarketListing;
  /** Mã người vay bên finora-user (từ hồ sơ vay Loan); có và có quyền Xem "Khách hàng" thì họ tên mở hồ sơ khách hàng. */
  borrowerId?: string | null;
  canViewCustomer: boolean;
  /** Lúc đưa lên sàn (lịch sử Loan); không đọc được thì bỏ dòng. */
  openedAt?: string | null;
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  );
}

function CopyCode({ code }: { code: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success(`Đã chép mã hồ sơ ${code}.`);
    } catch {
      // Trình duyệt chặn clipboard (http, quyền): báo để người dùng tự chọn và chép.
      toast.warning('Trình duyệt chặn chép tự động. Hãy chọn mã hồ sơ rồi chép thủ công.');
    }
  };
  return (
    <span className="inline-flex items-center gap-1">
      <span className="ui-mono">{code}</span>
      <button
        type="button"
        className="grid size-6 place-items-center rounded-sm text-muted hover:bg-surface-muted hover:text-primary [&_svg]:size-3.25"
        onClick={copy}
        aria-label="Chép mã hồ sơ"
        title="Chép mã hồ sơ"
      >
        <CopyIcon />
      </button>
    </span>
  );
}

const COLUMN_TITLE = 'mt-1 mb-1 text-secondary text-[13px] font-semibold';

/**
 * Thẻ cuối tab Tổng quan, có ở mọi chặng: một thẻ hai cột (người vay | điều khoản gọi vốn) như thẻ thông tin của hồ sơ
 * vay, nên hai khối dài ngắn khác nhau vẫn chung một khung. Mỗi thông tin một dòng; dòng nào backend không có thì bỏ.
 */
export function LoanInfoCard({ listing, borrowerId, canViewCustomer, openedAt }: Props) {
  const name = listing.borrowerFullName;
  const noteCount = estimateNoteCount(listing.targetAmount, listing.noteDenomination);
  const borrower: ReviewRow[] = [
    ...(listing.applicationCode
      ? [{ key: 'code', label: 'Mã hồ sơ', value: <CopyCode code={listing.applicationCode} /> }]
      : []),
    ...(listing.contractCode
      ? [{ key: 'contract', label: 'Số hợp đồng', value: <span className="ui-mono">{listing.contractCode}</span> }]
      : []),
    ...(name
      ? [{
          key: 'name',
          label: 'Họ tên',
          value: borrowerId && canViewCustomer
            ? <Link className="ui-link" to={`/customers/kyc/${encodeURIComponent(borrowerId)}`}>{name}</Link>
            : name,
        }]
      : []),
    { key: 'purpose', label: 'Mục đích vay', value: listing.purpose },
    { key: 'grade', label: 'Hạng tín dụng', value: listing.creditGrade },
    ...(listing.creditScore != null ? [{ key: 'score', label: 'Điểm tín dụng', value: listing.creditScore }] : []),
  ];
  const terms: ReviewRow[] = [
    { key: 'target', label: 'Số tiền gọi vốn', value: `${formatMoney(listing.targetAmount)} đ` },
    { key: 'rate', label: 'Lãi suất', value: formatRate(listing.annualInterestRate) },
    { key: 'term', label: 'Kỳ hạn', value: formatMonths(listing.termMonths) },
    { key: 'method', label: 'Phương thức trả', value: repaymentLabel(listing.repaymentMethod) },
    {
      key: 'denomination',
      label: 'Mệnh giá phần vốn',
      value: `${formatMoney(listing.noteDenomination)} đ`,
      hint: noteCount != null ? `chia thành ${noteCount} phần vốn` : null,
    },
    { key: 'minimum', label: 'Góp tối thiểu', value: `${formatMoney(listing.minInvestmentAmount)} đ` },
    ...(openedAt ? [{ key: 'opened', label: 'Mở gọi vốn', value: formatDateTime(openedAt) }] : []),
    { key: 'closes', label: 'Hạn gọi vốn', value: formatDateTime(listing.fundingClosesAt) },
  ];

  return (
    <ReviewCard title="Thông tin khoản vay">
      <div className="grid grid-cols-2 gap-x-8 max-[760px]:grid-cols-1 max-[760px]:gap-y-3">
        <div>
          <h3 className={COLUMN_TITLE}>Người vay</h3>
          <ReviewRows rows={borrower} />
        </div>
        <div>
          <h3 className={COLUMN_TITLE}>Điều khoản gọi vốn</h3>
          <ReviewRows rows={terms} />
        </div>
      </div>
    </ReviewCard>
  );
}
