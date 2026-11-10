import { ReviewCard, ReviewRows, type ReviewRow } from '@/features/loan';
import { formatDate } from '@/utils';
import { formatAnnualRate, formatMoneyVnd } from '../../formatters';
import type { AdminOrderBookDetail } from '../../types';
import { CopyIconButton } from '../CopyIconButton';
import { PartyName } from '../PartyName';

const COLUMN_TITLE = 'mt-1 mb-1 text-secondary text-[13px] font-semibold';

/**
 * "Thông tin khoản vay" hai cột như trang Gọi vốn: khoản vay (mã, hợp đồng, người vay, hạng) | phần vốn (mệnh giá, lãi,
 * kỳ hạn, ngày phát hành). Tình hình trả nợ nằm ở cột phải của trang nên không lặp ở đây; dòng thiếu dữ liệu thì bỏ.
 */
export function BookLoanCard({ book }: { book: AdminOrderBookDetail }) {
  const loan: ReviewRow[] = [
    ...(book.applicationCode
      ? [{
          key: 'code',
          label: 'Mã hồ sơ',
          value: (
            <span className="inline-flex items-center gap-1">
              <span className="ui-mono">{book.applicationCode}</span>
              <CopyIconButton value={book.applicationCode} what="mã hồ sơ" />
            </span>
          ),
        }]
      : []),
    ...(book.contractCode
      ? [{ key: 'contract', label: 'Số hợp đồng', value: <span className="ui-mono">{book.contractCode}</span> }]
      : []),
    { key: 'borrower', label: 'Người vay', value: <PartyName userId={book.borrowerId} name={book.borrowerFullName} /> },
    { key: 'grade', label: 'Hạng tín dụng', value: book.creditGrade },
  ];
  const notes: ReviewRow[] = [
    { key: 'denomination', label: 'Mệnh giá phần vốn', value: formatMoneyVnd(book.noteDenomination) },
    { key: 'rate', label: 'Lãi suất', value: formatAnnualRate(book.annualInterestRate) },
    { key: 'term', label: 'Kỳ hạn', value: `${book.termMonths} tháng` },
    ...(book.notesIssuedAt
      ? [{ key: 'issued', label: 'Phát hành phần vốn', value: formatDate(book.notesIssuedAt) }]
      : []),
  ];

  return (
    <ReviewCard title="Thông tin khoản vay">
      <div className="grid grid-cols-2 gap-x-8 max-[760px]:grid-cols-1 max-[760px]:gap-y-3">
        <div>
          <h3 className={COLUMN_TITLE}>Khoản vay</h3>
          <ReviewRows rows={loan} />
        </div>
        <div>
          <h3 className={COLUMN_TITLE}>Phần vốn</h3>
          <ReviewRows rows={notes} />
        </div>
      </div>
    </ReviewCard>
  );
}
