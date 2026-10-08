import { Link, useNavigate } from 'react-router-dom';
import { StatusPill } from '@/components/StatusPill';
import type { ListingTab } from '../constants';
import { useListingStage } from '../hooks/useListingStage';
import { stepStatus } from '../mappers/listingDisplay';
import { describeFundingWindow } from '../stage';
import type { MarketListing } from '../types';
import { formatDate, formatMoney, formatPercent } from '../formatters';

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
        <span className={`ui-sub fu-window ${fundingWindow.tone}`}>{fundingWindow.label}</span>
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
  const now = new Date();

  return (
    <div className="ui-table-wrap">
      <table className="ui-table list fu-table">
        <thead>
          <tr>
            <th>Khoản vay</th>
            <th className="num hide-sm">Mục tiêu</th>
            <th className="hide-sm">Đã góp</th>
            <th className="fu-last">{tab === 'OPEN' ? 'Hạn gọi vốn' : 'Trạng thái'}</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr
              key={listing.listingId}
              className="clickable"
              onClick={(event) => {
                if ((event.target as HTMLElement).closest('a')) return;
                navigate(fundingDetailPath(listing.listingId));
              }}
            >
              <td className="fu-name">
                <Link className="fu-title" to={fundingDetailPath(listing.listingId)}>{listing.purpose}</Link>
                <span className="ui-sub">
                  <span className="ui-mono fu-code">#{listing.loanId}</span>, hạng {listing.creditGrade}
                </span>
              </td>
              <td className="num hide-sm">{formatMoney(listing.targetAmount)} đ</td>
              <td className="hide-sm">
                {listing.status === 'DRAFT' ? (
                  <span className="fu-muted">Chưa lên sàn</span>
                ) : (
                  <div className="fu-progress">
                    <span className="fu-thin" aria-hidden="true">
                      {/* Bề rộng lấy thẳng `fundedPercent` của backend, không tính lại từ số tiền. */}
                      <i style={{ width: `${Math.min(Math.max(listing.fundedPercent, 0), 100)}%` }} />
                    </span>
                    <span>{formatPercent(listing.fundedPercent)}</span>
                  </div>
                )}
              </td>
              <td className="fu-last">
                <LastCell listing={listing} tab={tab} now={now} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
