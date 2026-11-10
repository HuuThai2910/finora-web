import { Link } from 'react-router-dom';
import { ReviewCard, ReviewRows, type ReviewRow } from '@/features/loan';
import { FEE_RATE_PERCENT, bookPath } from '../../constant';
import { formatMoneyVnd, formatPrice } from '../../formatters';
import type { AdminTrade } from '../../types';
import { PartyName } from '../PartyName';

const COLUMN_TITLE = 'mt-1 mb-1 text-secondary text-[13px] font-semibold';

/**
 * "Thông tin giao dịch" hai cột: giá trị (số phần vốn, dư nợ mỗi phần vốn, giá khớp, tiền hai bên, phí) | hai bên
 * (khoản vay dẫn về sổ lệnh, bên bán, bên mua). Mốc giờ chỉ nằm ở cột Tiến trình, không lặp ở đây.
 */
export function TradeInfoCard({ trade }: { trade: AdminTrade }) {
  const values: ReviewRow[] = [
    { key: 'quantity', label: 'Số phần vốn', value: `${trade.quantity} phần vốn` },
    ...(trade.outstandingPerNote
      ? [{ key: 'outstanding', label: 'Dư nợ gốc mỗi phần vốn', value: formatMoneyVnd(trade.outstandingPerNote) }]
      : []),
    { key: 'price', label: 'Giá khớp', value: formatPrice(trade.pricePercent), hint: 'dư nợ gốc còn lại' },
    { key: 'amount', label: 'Bên mua trả', value: formatMoneyVnd(trade.amount) },
    { key: 'fee', label: `Phí nền tảng (${FEE_RATE_PERCENT}%)`, value: formatMoneyVnd(trade.platformFee) },
    { key: 'proceeds', label: 'Bên bán nhận', value: <b className="font-bold">{formatMoneyVnd(trade.sellerProceeds)}</b> },
  ];
  const parties: ReviewRow[] = [
    {
      key: 'loan',
      label: 'Khoản vay',
      value: <Link className="ui-link" to={bookPath(trade.listingId)}>{trade.applicationCode ?? 'Sổ lệnh'}</Link>,
      hint: trade.purpose,
    },
    { key: 'seller', label: 'Bên bán', value: <PartyName userId={trade.sellerId} name={trade.sellerName} /> },
    { key: 'buyer', label: 'Bên mua', value: <PartyName userId={trade.buyerId} name={trade.buyerName} /> },
  ];

  return (
    <ReviewCard title="Thông tin giao dịch">
      <div className="grid grid-cols-2 gap-x-8 max-[760px]:grid-cols-1 max-[760px]:gap-y-3">
        <div>
          <h3 className={COLUMN_TITLE}>Giá trị</h3>
          <ReviewRows rows={values} />
        </div>
        <div>
          <h3 className={COLUMN_TITLE}>Hai bên</h3>
          <ReviewRows rows={parties} />
        </div>
      </div>
    </ReviewCard>
  );
}
