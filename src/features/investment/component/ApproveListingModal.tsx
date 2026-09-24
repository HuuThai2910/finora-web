import { useEffect, useState } from 'react';
import type { ApproveListingRequest, MarketListing } from '../types';
import { DENOMINATION_OPTIONS } from '../constant';
import { formatMoney, formatMonths, formatRate } from '../formatters';

interface Props {
  listing: MarketListing;
  submitting: boolean;
  errorMessage: string | null;
  /** Số ngày gọi vốn mặc định, lấy từ tham số sàn. */
  defaultFundingDays: number;
  onClose: () => void;
  onSubmit: (request: ApproveListingRequest) => void;
}

/**
 * Duyệt một khoản vay đang chờ lên sàn.
 *
 * Việc duy nhất quản trị phải quyết là mệnh giá Note: mục tiêu gọi vốn bắt buộc chia hết
 * cho nó, nên mệnh giá sai sẽ cắt mất phần lẻ của người vay. Form tính sẵn phần dư theo
 * từng lựa chọn để thấy ngay mệnh giá nào vừa khít.
 */
export function ApproveListingModal({ listing, submitting, errorMessage, defaultFundingDays, onClose, onSubmit }: Props) {
  const [denomination, setDenomination] = useState(listing.noteDenomination);
  const [fundingDays, setFundingDays] = useState(String(defaultFundingDays));

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const requested = Number(listing.targetAmount);
  const denominationValue = Number(denomination);
  const remainder = denominationValue > 0 ? requested % denominationValue : 0;
  const fundable = requested - remainder;
  const noteCount = denominationValue > 0 ? Math.round(fundable / denominationValue) : 0;
  const exact = remainder === 0;
  const days = Number(fundingDays);
  const daysValid = Number.isInteger(days) && days >= 1 && days <= 90;

  const canSubmit = denominationValue > 0 && fundable > 0 && daysValid && !submitting;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      targetAmount: fundable.toFixed(2),
      noteDenomination: denominationValue.toFixed(2),
      // Mức tối thiểu bằng đúng một Note: bắt buộc phải là bội của mệnh giá, và một Note
      // là ngưỡng thấp nhất có nghĩa.
      minInvestmentAmount: denominationValue.toFixed(2),
      fundingDays: days,
    });
  };

  return (
    <div className="inv-modal-backdrop" role="presentation" onClick={onClose}>
      <div className="inv-modal" role="dialog" aria-modal="true" aria-labelledby="inv-approve-title" onClick={(event) => event.stopPropagation()}>
        <span className="inv-eyebrow">Chờ duyệt</span>
        <h2 id="inv-approve-title" className="inv-modal-title">Duyệt khoản vay #{listing.loanId} lên sàn</h2>
        <p className="inv-modal-note">
          {listing.purpose}
          <span className="inv-dot" aria-hidden="true" />
          {formatRate(listing.annualInterestRate)}
          <span className="inv-dot" aria-hidden="true" />
          {formatMonths(listing.termMonths)}
          <span className="inv-dot" aria-hidden="true" />
          hạng {listing.creditGrade}
        </p>

        <dl className="inv-kv inv-kv-3">
          <div><dt>Mục tiêu tạm tính</dt><dd>{formatMoney(listing.targetAmount)} đ</dd></div>
          <div><dt>Gọi vốn được</dt><dd>{formatMoney(fundable)} đ</dd></div>
          <div><dt>Số Note phát hành</dt><dd>{noteCount}</dd></div>
        </dl>

        <div className="inv-form-grid">
          <label className="inv-field">
            <span>Mệnh giá một Note (đ)</span>
            <select value={denomination} onChange={(event) => setDenomination(event.target.value)}>
              {DENOMINATION_OPTIONS.map((option) => {
                const value = Number(option);
                const left = requested % value;
                return (
                  <option key={option} value={option}>
                    {formatMoney(option)} đ{left === 0 ? ' — vừa khít' : ` — dư ${formatMoney(left)} đ`}
                  </option>
                );
              })}
            </select>
          </label>
          <label className="inv-field">
            <span>Số ngày gọi vốn (1–90)</span>
            <input type="number" inputMode="numeric" min="1" max="90" value={fundingDays} onChange={(event) => setFundingDays(event.target.value)} />
          </label>
        </div>

        <div className={`inv-hint ${exact ? '' : 'is-warning'}`}>
          {exact
            ? `Mệnh giá vừa khít: gọi đủ ${formatMoney(fundable)} đ thành ${noteCount} Note. Nhà đầu tư góp tối thiểu một Note.`
            : `Còn dư ${formatMoney(remainder)} đ không chia hết. Người vay sẽ nhận thiếu khoản này — chọn mệnh giá nhỏ hơn để vừa khít.`}
        </div>

        {errorMessage && <div className="inv-error" role="alert">{errorMessage}</div>}

        <div className="inv-modal-actions">
          <button type="button" className="inv-btn inv-btn-ghost" onClick={onClose}>Để sau</button>
          <button type="button" className="inv-btn inv-btn-brand" disabled={!canSubmit} onClick={handleSubmit}>
            {submitting ? 'Đang duyệt\u2026' : 'Duyệt lên sàn'}
          </button>
        </div>
      </div>
    </div>
  );
}
