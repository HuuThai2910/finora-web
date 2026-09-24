import { EMPTY, formatDateTime, formatNumber, formatPercent, parseDecimal } from '@/utils';
import { statusLabel, statusTone } from '../constant';
import type { NoteListing } from '../types';

interface Props {
  listings: NoteListing[];
  /** Có bộ lọc đang áp dụng hay không, để phân biệt "chưa có gì" với "lọc không ra". */
  isFiltered: boolean;
}

/** Tiền của Investment Service là chuỗi decimal; parse trước khi định dạng. */
const money = (value: string | null): string => {
  const numeric = parseDecimal(value);
  return numeric == null ? EMPTY : formatNumber(numeric);
};

/** Lãi suất backend lưu dạng tỷ lệ (0.1500 = 15%/năm). */
const rate = (value: string): string => {
  const numeric = parseDecimal(value);
  return numeric == null ? EMPTY : `${formatPercent(numeric * 100)}/năm`;
};

/**
 * Chênh lệch giữa giá bán và dư nợ gốc, nhìn từ phía người mua.
 *
 * Giá luôn không vượt dư nợ (backend chặn), nên con số này luôn là phần người mua được lợi về
 * gốc — chưa tính lãi tương lai họ còn nhận thêm.
 */
function buyerGain(listing: NoteListing): string {
  const price = parseDecimal(listing.soldPrice ?? listing.askingPrice);
  const outstanding = parseDecimal(listing.outstandingPrincipal);
  if (price == null || outstanding == null) return EMPTY;
  return formatNumber(outstanding - price);
}

/**
 * Bảng tin chợ thứ cấp, nhìn từ màn quản trị.
 *
 * Chỉ để giám sát: Note nào đang treo bán, giá nào, ai bán cho ai và nền tảng thu được bao nhiêu
 * phí. Không có thao tác mua bán vì backend lấy danh tính từ token — admin bấm mua sẽ chuyển Note
 * sang chính admin.
 */
export function SecondaryListingTable({ listings, isFiltered }: Props) {
  if (listings.length === 0) {
    return (
      <div className="inv-empty">
        {isFiltered
          ? 'Không có tin nào khớp bộ lọc. Thử nới điều kiện hoặc xóa lọc.'
          : 'Chưa có Note nào được đăng bán trên chợ thứ cấp.'}
      </div>
    );
  }

  return (
    <div className="inv-table-wrap">
      <table className="inv-table">
        <thead>
          <tr>
            <th>Note</th>
            <th className="inv-col-terms">Khoản vay gốc</th>
            <th className="inv-num">Giá bán</th>
            <th className="inv-num">Dư nợ gốc</th>
            <th className="inv-num">Phí nền tảng</th>
            <th className="inv-col-status">Trạng thái</th>
            <th>Thời điểm</th>
          </tr>
        </thead>
        <tbody>
          {listings.map((listing) => (
            <tr key={listing.listingReference} className="inv-row">
              <td>
                <div className="inv-name">{listing.noteNumber}</div>
                <div className="inv-desc">
                  {listing.listingReference}
                  <span className="inv-dot" aria-hidden="true" />
                  bán bởi {listing.sellerId}
                </div>
                {/* Nợ xấu phải đọc được bằng chữ, không chỉ bằng màu — quy tắc accessibility
                    cấm dùng màu làm tín hiệu duy nhất. */}
                {listing.defaulted && (
                  <div className="sm-warning-inline">
                    ⚠ {listing.defaultedReason ?? 'Khoản vay gốc đang nợ xấu'}
                  </div>
                )}
              </td>

              <td className="inv-col-terms">
                <strong className="inv-num-strong">{rate(listing.annualInterestRate)}</strong>
                <div className="inv-desc">
                  #{listing.loanId}
                  <span className="inv-dot" aria-hidden="true" />
                  {listing.termMonths} tháng
                  {listing.creditGrade && (
                    <>
                      <span className="inv-dot" aria-hidden="true" />
                      <span className="inv-grade">Hạng {listing.creditGrade}</span>
                    </>
                  )}
                </div>
              </td>

              <td className="inv-num">
                <strong className="inv-num-strong">
                  {money(listing.soldPrice ?? listing.askingPrice)} đ
                </strong>
                <div className="inv-desc">người mua lợi {buyerGain(listing)} đ về gốc</div>
              </td>

              <td className="inv-num">{money(listing.outstandingPrincipal)} đ</td>

              <td className="inv-num">
                {money(listing.platformFee ?? listing.estimatedFee)} đ
                <div className="inv-desc">
                  {listing.status === 'SOLD' ? 'đã thu' : 'dự kiến'}
                </div>
              </td>

              <td className="inv-col-status">
                <span className={`inv-status ${statusTone(listing.status)}`}>
                  {statusLabel(listing.status)}
                </span>
                {listing.status === 'SOLD' && listing.buyerId && (
                  <div className="inv-desc">mua bởi {listing.buyerId}</div>
                )}
              </td>

              <td className="inv-desc">
                {listing.status === 'SOLD' && listing.soldAt
                  ? formatDateTime(listing.soldAt)
                  : formatDateTime(listing.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Khối giả giữ chỗ khi đang tải, cùng bố cục với bảng thật để không nhảy layout. */
export function SecondaryListingTableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="inv-table-wrap" aria-busy="true" aria-label="Đang tải bảng tin chợ thứ cấp">
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
