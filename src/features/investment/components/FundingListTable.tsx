import { Link, useLocation, useNavigate } from 'react-router-dom';
import { StatusPill } from '@/components/StatusPill';
import { fromListState } from '@/lib/navigation';
import type { ListingTab } from '../constants';
import { useListingStage } from '../hooks/useListingStage';
import { stepStatus } from '../mappers/listingDisplay';
import { describeFundingWindow } from '../stage';
import type { MarketListing } from '../types';
import { formatDate, formatMoney, formatMonths, formatPercent, formatRate } from '../formatters';

interface Props {
  listings: MarketListing[];
  tab: ListingTab;
}

export const fundingDetailPath = (listingId: number) => `/investments/funding/${listingId}`;

/**
 * Nhãn bước của khoản đã đủ vốn.
 *
 * Chỉ dòng `FULLY_FUNDED` mới cần tải phần vốn (và dò Note) để biết đang chờ khóa vốn hay
 * phát hành Note; tối đa 10 dòng một trang, cache dùng chung với trang chi tiết.
 */
function FundedStepPill({ listing }: { listing: MarketListing }) {
  const { stage } = useListingStage(listing);
  const status = stepStatus(listing, stage);
  return <StatusPill tone={status.tone}>{status.label}</StatusPill>;
}

function LastCell({ listing, tab, now }: { listing: MarketListing; tab: ListingTab; now: Date }) {
  if (tab === 'OPEN') {
    const fundingWindow = describeFundingWindow(listing.fundingClosesAt, now);
    return (
      <>
        {formatDate(listing.fundingClosesAt)}
        <span className={`ui-sub fu-window ${fundingWindow.tone} [&.warning]:text-warning [&.expired]:text-danger`}>
          {fundingWindow.label}
        </span>
      </>
    );
  }
  if (listing.status === 'FULLY_FUNDED') return <FundedStepPill listing={listing} />;
  const status = stepStatus(listing, null, now);
  return <StatusPill tone={status.tone}>{status.label}</StatusPill>;
}

/**
 * Bảng khoản vay trên sàn. Màn danh sách chỉ để tìm khoản cần xem; mọi thao tác (duyệt,
 * khóa vốn, phát hành Note) nằm ở trang chi tiết, nên cả dòng bấm được để mở chi tiết và
 * tên khoản vay là liên kết cho người dùng bàn phím.
 */
export function FundingListTable({ listings, tab }: Props) {
  const navigate = useNavigate();
  const location = useLocation();
  // Trang chi tiết nhớ URL danh sách (tab, bộ lọc, trang) để nút "Về danh sách" quay lại đúng chỗ.
  const listState = fromListState(location);
  const now = new Date();

  return (
    <div className="ui-table-wrap">
      {/* Ô bảng đệm ngang 10px thay cho 12px của bảng chung; dưới 760px ẩn hai cột số tiền. */}
      <table className="ui-table list fu-table [&_td]:px-2.5 [&_th]:px-2.5">
        <thead>
          <tr>
            <th className="w-[46%] max-[760px]:w-auto">Khoản vay</th>
            <th className="num hide-sm w-[16%] max-[760px]:hidden">Mục tiêu</th>
            <th className="hide-sm w-[20%] max-[760px]:hidden">Đã góp</th>
            <th className="fu-last text-right">{tab === 'OPEN' ? 'Hạn gọi vốn' : 'Trạng thái'}</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr
              key={listing.listingId}
              className="clickable"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('a')) return;
                navigate(fundingDetailPath(listing.listingId), { state: listState });
              }}
            >
              {/* max-width 0: tên dài bị cắt bằng dấu ba chấm thay vì đẩy rộng bảng. */}
              <td className="fu-name max-w-0 max-[760px]:whitespace-normal">
                <Link
                  className="fu-title block overflow-hidden text-ellipsis font-medium text-primary in-[tr.clickable:hover]:text-brand focus-visible:text-brand max-[760px]:whitespace-normal"
                  to={fundingDetailPath(listing.listingId)}
                  state={listState}
                >
                  {listing.purpose}
                </Link>
                <span className="ui-sub">
                  {/* Mã khoản vay dưới tên (chữ đơn cách nhỏ như mockup .gv-code), kèm điều khoản chính để so các khoản. */}
                  <span className="ui-mono fu-code text-[12px]">#{listing.loanId}</span>, hạng {listing.creditGrade},
                  {' '}{formatRate(listing.annualInterestRate)}, {formatMonths(listing.termMonths)}
                </span>
              </td>
              <td className="num hide-sm max-[760px]:hidden">{formatMoney(listing.targetAmount)} đ</td>
              <td className="hide-sm max-[760px]:hidden">
                {listing.status === 'DRAFT' ? (
                  <span className="fu-muted text-muted">Chưa lên sàn</span>
                ) : (
                  <div className="fu-progress grid grid-cols-[minmax(0,1fr)_56px] items-center gap-2.5 text-[13px] tabular-nums text-right">
                    <span className="fu-thin block h-1.5 overflow-hidden rounded-[999px] bg-[#eef0f3]" aria-hidden="true">
                      {/* Bề rộng lấy thẳng `fundedPercent` của backend, không tính lại từ số tiền. */}
                      <i
                        className="block h-full rounded-[999px] bg-brand"
                        style={{ width: `${Math.min(Math.max(listing.fundedPercent, 0), 100)}%` }}
                      />
                    </span>
                    <span>{formatPercent(listing.fundedPercent)}</span>
                  </div>
                )}
              </td>
              <td className="fu-last text-right">
                <LastCell listing={listing} tab={tab} now={now} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
