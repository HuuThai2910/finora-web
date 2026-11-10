import { useId } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { PurposeIcon } from '@/features/loan';
import { fromListState } from '@/lib/navigation';
import { useGetListingInvestorsQuery } from '../api/investmentApi';
import { SIGNING_STATUSES, STAGE_META, resolveFundingStage } from '../stage';
import type { MarketListing } from '../types';
import { formatDateTime, formatMoney, formatMonths, formatPercent, formatRate, parseDecimal } from '../formatters';

export const fundingDetailPath = (listingId: number) => `/investments/funding/${listingId}`;

/** Cột Người vay ẩn dưới 1380px để bảng không tràn ngang; Đã góp và Ngày gọi vốn ẩn ở màn hẹp. */
const HIDE_MD = 'max-[1380px]:hidden';
const HIDE_SM = 'hide-sm max-[760px]:hidden';

/**
 * Tooltip của ô Đã góp: hiện khi rê chuột hoặc focus bàn phím (nhóm `tip`), mũi tên chỉ xuống ô.
 * Số nhà đầu tư và tiền còn thiếu chỉ hiện ở đây để bảng ít chữ.
 */
const TIP =
  'pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-20 -translate-x-1/2 translate-y-1 whitespace-nowrap ' +
  'rounded-md bg-primary px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-pop transition duration-120 ' +
  'group-hover/tip:translate-y-0 group-hover/tip:opacity-100 group-focus-visible/tip:translate-y-0 group-focus-visible/tip:opacity-100 ' +
  "after:absolute after:top-full after:left-1/2 after:-ml-1.25 after:border-5 after:border-transparent after:border-t-primary after:content-['']";

/**
 * Phần trăm đã gọi để vẽ: `fundedPercent` của backend; khoản đã đóng/hủy thì tính từ `raisedAmount` (số đã gọi được
 * trước khi hoàn tiền), vì lúc đó `committedAmount` và `fundedPercent` đã về 0.
 */
export function displayedPercent(listing: MarketListing): number {
  const raised = listing.status === 'CLOSED' || listing.status === 'CANCELLED' ? parseDecimal(listing.raisedAmount) : null;
  const target = parseDecimal(listing.targetAmount) ?? 0;
  if (raised == null || target <= 0) return listing.fundedPercent;
  return Math.round((raised / target) * 10_000) / 100;
}

function FundedCell({ listing }: { listing: MarketListing }) {
  const tipId = useId();
  const value = displayedPercent(listing);
  const percent = Math.min(Math.max(value, 0), 100);
  const remaining = parseDecimal(listing.remainingAmount) ?? 0;
  const ended = listing.status === 'CLOSED' || listing.status === 'CANCELLED';
  // Số nhà đầu tư có sẵn trong dòng danh sách (backend đếm theo lô); backend cũ không có thì bỏ phần này của tooltip.
  const count = listing.investorCount;
  const parts = [
    count != null ? `${count} nhà đầu tư${ended && count > 0 ? ', đã hoàn tiền' : ''}` : null,
    // "Thiếu" chỉ có nghĩa khi khoản còn nhận lệnh; khoản đã đủ, đóng hay hủy thì bỏ.
    listing.status === 'OPEN' && remaining > 0 ? `thiếu ${formatMoney(remaining)} đ` : null,
  ].filter(Boolean);

  return (
    <div
      className="fu-progress group/tip relative grid w-max grid-cols-[110px_44px] items-center gap-2 text-[13px] tabular-nums"
      tabIndex={0}
      aria-describedby={parts.length > 0 ? tipId : undefined}
    >
      <span className="block h-1.5 overflow-hidden rounded-full bg-[#eef0f3]" aria-hidden="true">
        <i className="block h-full rounded-full bg-brand" style={{ width: `${percent}%` }} />
      </span>
      <span>{formatPercent(value)}</span>
      {parts.length > 0 && <span id={tipId} role="tooltip" className={TIP}>{parts.join(', ')}</span>}
    </div>
  );
}

/**
 * Một dòng khoản gọi vốn. Họ tên người vay, ngày lên sàn và số nhà đầu tư có sẵn trong dòng danh sách của Investment
 * (đọc theo lô ở backend), nên dòng không gọi thêm API nào, trừ dữ liệu cũ dưới đây.
 */
function FundingRow({ listing, onOpen, listState }: {
  listing: MarketListing;
  onOpen: () => void;
  listState: ReturnType<typeof fromListState>;
}) {
  // Dữ liệu cũ: khoản đã khóa toàn bộ phần vốn mà thiếu mốc giải ngân vẫn là đã phát hành (xem `resolveFundingStage`).
  // Chỉ khoản đủ vốn đã qua bước ký mà chưa có mốc giải ngân mới cần đọc phần vốn; khoản đang chờ ký thì không.
  const needInvestors = listing.status === 'FULLY_FUNDED' && !listing.disbursedAt
    && !(listing.contractStatus && SIGNING_STATUSES.has(listing.contractStatus));
  const investors = useGetListingInvestorsQuery(listing.listingId, { skip: !needInvestors });
  const stage = STAGE_META[resolveFundingStage(listing, investors.data)];
  const borrower = listing.borrowerFullName;
  const openedAt = listing.fundingOpenedAt;
  const code = listing.applicationCode;

  return (
    <tr
      className="clickable"
      tabIndex={0}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a')) return;
        onOpen();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target === event.currentTarget) onOpen();
      }}
    >
      <td>
        <div className="ui-row-main">
          <span className="ui-dot"><PurposeIcon purpose={listing.purposeCode ?? null} /></span>
          <div className="min-w-0">
            {/* Không hiện mã kỹ thuật (loanId, LA-…); khoản lên sàn trước khi Loan có mã HS- thì chỉ còn mục đích. */}
            {code ? <span className="ui-code">{code}</span> : null}
            <span className={code ? 'ui-sub max-w-60 truncate' : 'ui-code block max-w-60 truncate'} title={listing.purpose}>
              {listing.purpose}
            </span>
          </div>
        </div>
      </td>
      <td className={HIDE_MD}>
        {borrower ? (
          <span className="ui-person">
            <Avatar name={borrower} />
            <span className="inline-block max-w-40 truncate align-middle" title={borrower}>{borrower}</span>
          </span>
        ) : null}
        <span className="ui-sub">
          hạng {listing.creditGrade}{listing.creditScore != null ? `, điểm ${listing.creditScore}` : ''}
        </span>
      </td>
      <td className="num">
        <span className="strong">{formatMoney(listing.targetAmount)} đ</span>
        <span className="ui-sub">{formatMonths(listing.termMonths)}, lãi {formatRate(listing.annualInterestRate)}</span>
      </td>
      <td className={HIDE_SM}>
        {listing.status === 'DRAFT' ? <span className="text-muted">Chưa lên sàn</span> : <FundedCell listing={listing} />}
      </td>
      <td className={HIDE_SM}>{openedAt ? formatDateTime(openedAt) : '-'}</td>
      <td><StatusPill tone={stage.tone} dot>{stage.label}</StatusPill></td>
      <td className="num">
        <Link className="ui-btn soft" to={fundingDetailPath(listing.listingId)} state={listState}>
          Chi tiết
          <Icon name="arrowRight" />
        </Link>
      </td>
    </tr>
  );
}

/**
 * Bảng khoản vay trên sàn. Danh sách chỉ để tìm khoản cần xem (quản trị không có thao tác nào trên khoản gọi vốn), nên
 * cả dòng bấm được để mở chi tiết; nút cuối dòng giữ cho người dùng bàn phím và trình đọc màn hình. Ít màu: chỉ nhãn
 * trạng thái có màu, thanh tiến độ một màu.
 */
export function FundingListTable({ listings }: { listings: MarketListing[] }) {
  const navigate = useNavigate();
  // Trang chi tiết nhớ URL danh sách (bộ lọc, trang) để quay lại đúng chỗ.
  const listState = fromListState(useLocation());

  return (
    // Màn rộng đủ chỗ cho bảng: bỏ khung cuộn để tooltip ô Đã góp không bị cắt.
    <div className="ui-table-wrap min-[1180px]:overflow-visible">
      <table className="ui-table list fu-table [&_td]:px-2 [&_th]:px-2">
        <thead>
          <tr>
            <th>Khoản vay</th>
            <th className={HIDE_MD}>Người vay</th>
            <th className="num">Số tiền</th>
            <th className={HIDE_SM}>Đã góp</th>
            <th className={HIDE_SM}>Ngày gọi vốn</th>
            <th>Trạng thái</th>
            <th><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <FundingRow
              key={listing.listingId}
              listing={listing}
              listState={listState}
              onOpen={() => navigate(fundingDetailPath(listing.listingId), { state: listState })}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
