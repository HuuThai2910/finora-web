import type { MarketListing } from '../types';
import { statusLabel, statusTone } from '../constant';
import { describeFundingWindow, type WindowTone } from '../stage';
import { formatDate, formatMoney, formatMonths, formatPercent, formatRate } from '../formatters';
import type { StageFilter } from './FundingPipeline';
import { ListingActionMenu } from './ListingActionMenu';

interface Props {
  listings: MarketListing[];
  /** Có bộ lọc phụ đang áp dụng hay không, để phân biệt "chặng trống" với "lọc không ra". */
  isFiltered: boolean;
  activeStage: StageFilter;
  /** Khoản đang chạy khóa vốn / phát hành Note, để khóa menu của đúng dòng đó. */
  busyListingId: number | null;
  onViewDetail: (listing: MarketListing) => void;
  onApprove: (listing: MarketListing) => void;
  onFinalize: (listing: MarketListing) => void;
  onActivateNotes: (listing: MarketListing) => void;
}

/**
 * Thanh tiến độ gọi vốn.
 *
 * Bề rộng lấy thẳng `fundedPercent` do backend tính, không tính lại từ số tiền — nếu tính
 * lại ở client thì hai chỗ có thể lệch nhau khi quy tắc làm tròn thay đổi.
 */
export function FundingBar({ percent, funded }: { percent: number; funded: boolean }) {
  const clamped = Math.min(Math.max(percent, 0), 100);
  return (
    <div className="inv-bar" role="img" aria-label={`Đã gọi ${formatPercent(percent)}`}>
      <div className={`inv-bar-fill ${funded ? 'is-funded' : 'is-open'}`} style={{ width: `${clamped}%` }} />
    </div>
  );
}

const EMPTY_BY_STAGE: Record<StageFilter, string> = {
  ALL: 'Chưa có khoản vay nào trên sàn gọi vốn.',
  DRAFT: 'Không có khoản nào chờ duyệt. Khoản vay vừa ký hợp đồng sẽ được worker tự đưa về đây.',
  OPEN: 'Không có khoản nào đang gọi vốn.',
  FULLY_FUNDED: 'Không có khoản nào chờ giải ngân.',
  CLOSED: 'Chưa có khoản nào đóng vì hết hạn.',
  CANCELLED: 'Chưa có khoản nào bị rút khỏi sàn.',
};

/** Khối giả giữ chỗ trong lúc tải, cùng bố cục với bảng thật để không nhảy layout. */
export function FundingTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="inv-table-wrap" aria-busy="true" aria-label="Đang tải danh sách khoản vay">
      <div className="inv-skeleton">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="inv-skeleton-row">
            <span className="inv-skeleton-block w-40" />
            <span className="inv-skeleton-block w-12" />
            <span className="inv-skeleton-block w-26" />
            <span className="inv-skeleton-block w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Dòng chú thích dưới thanh tiến độ: hạn còn lại, hoặc lý do khoản đã dừng. */
function progressFootnote(listing: MarketListing, now: Date): { text: string; tone: WindowTone } | null {
  switch (listing.status) {
    case 'OPEN': {
      const fundingWindow = describeFundingWindow(listing.fundingClosesAt, now);
      return { text: `${fundingWindow.label} · hạn ${formatDate(listing.fundingClosesAt)}`, tone: fundingWindow.tone };
    }
    case 'FULLY_FUNDED':
      return { text: 'Đã gọi đủ, chờ khóa vốn và phát hành Note', tone: 'normal' };
    case 'CLOSED':
      return { text: 'Hết hạn khi chưa gọi đủ vốn', tone: 'normal' };
    case 'CANCELLED':
      return { text: 'Đã rút khỏi sàn', tone: 'normal' };
    case 'DRAFT':
      return null;
  }
}

/**
 * Bảng theo dõi khoản vay trên sàn.
 *
 * Mỗi dòng: khoản nào, điều khoản, gọi được tới đâu, đang ở chặng nào, và một menu thao
 * tác chỉ chứa đúng những gì backend sẽ chấp nhận ở chặng đó. Chú thích thời gian nằm
 * dưới thanh tiến độ vì nó nói về tiến độ; cột trạng thái chỉ là nhãn.
 */
export function FundingTable({
  listings,
  isFiltered,
  activeStage,
  busyListingId,
  onViewDetail,
  onApprove,
  onFinalize,
  onActivateNotes,
}: Props) {
  if (listings.length === 0) {
    return (
      <div className="inv-empty">
        {isFiltered ? 'Không có khoản vay nào khớp bộ lọc. Thử nới điều kiện hoặc xóa lọc.' : EMPTY_BY_STAGE[activeStage]}
      </div>
    );
  }

  const now = new Date();

  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th className="inv-col-loan">Khoản vay</th>
            <th className="inv-col-terms">Điều khoản</th>
            <th className="inv-col-progress">Tiến độ gọi vốn</th>
            <th className="inv-col-status">Trạng thái</th>
            <th className="inv-col-actions">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => {
            const funded = listing.status === 'FULLY_FUNDED';
            const footnote = progressFootnote(listing, now);

            return (
              <tr key={listing.listingId} className="inv-row">
                <td className="inv-col-loan">
                  <button type="button" className="inv-row-link" onClick={() => onViewDetail(listing)}>
                    {listing.purpose}
                  </button>
                  <div className="inv-desc">
                    #{listing.loanId}
                    <span className="inv-dot" aria-hidden="true" />
                    <span className="inv-grade">Hạng {listing.creditGrade}</span>
                    <span className="inv-dot" aria-hidden="true" />
                    {listing.region}
                  </div>
                </td>

                <td className="inv-col-terms">
                  <strong className="inv-num-strong">{formatRate(listing.annualInterestRate)}</strong>
                  <div className="inv-desc">{formatMonths(listing.termMonths)}</div>
                </td>

                <td className="inv-col-progress">
                  {listing.status === 'DRAFT' ? (
                    <>
                      <strong className="inv-num-strong">{formatMoney(listing.targetAmount)} đ</strong>
                      <div className="inv-desc">Mệnh giá đề xuất {formatMoney(listing.noteDenomination)} đ</div>
                    </>
                  ) : (
                    <>
                      <div className="inv-progress-head">
                        <strong className="inv-progress-pct">{formatPercent(listing.fundedPercent)}</strong>
                        <span className="inv-desc">{formatMoney(listing.committedAmount)} / {formatMoney(listing.targetAmount)} đ</span>
                      </div>
                      <FundingBar percent={listing.fundedPercent} funded={funded} />
                      {footnote && <div className={`inv-desc inv-foot is-${footnote.tone}`}>{footnote.text}</div>}
                    </>
                  )}
                </td>

                <td className="inv-col-status">
                  <span className={`inv-status ${statusTone(listing.status)}`}>{statusLabel(listing.status)}</span>
                </td>

                <td className="inv-col-actions">
                  <ListingActionMenu
                    listing={listing}
                    busy={busyListingId === listing.listingId}
                    onViewDetail={onViewDetail}
                    onApprove={onApprove}
                    onFinalize={onFinalize}
                    onActivateNotes={onActivateNotes}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
