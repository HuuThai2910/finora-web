import { useState } from 'react';
import { ErrorNotice } from '@/components/ErrorNotice';
import { DENOMINATION_OPTIONS, FUNDING_DAYS_MAX, FUNDING_DAYS_MIN } from '../../constants';
import type { ApproveListingRequest, MarketListing } from '../../types';
import { formatNumber } from '@/utils';
import { formatDate, formatMoney, parseDecimal } from '../../formatters';

interface Props {
  listing: MarketListing;
  defaultFundingDays: number;
  submitting: boolean;
  disabled: boolean;
  error: unknown;
  onSubmit: (request: ApproveListingRequest) => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Duyệt một khoản vay đang chờ lên sàn, nằm ngay dưới bước "Chờ duyệt" của tiến trình.
 *
 * Việc duy nhất quản trị phải quyết là mệnh giá Note: mục tiêu gọi vốn bắt buộc chia hết
 * cho nó, nên mệnh giá sai sẽ cắt mất phần lẻ của người vay. Mỗi lựa chọn ghi sẵn "vừa
 * khít" hay "còn dư" để thấy ngay mệnh giá nào hợp.
 */
export function ApproveForm({ listing, defaultFundingDays, submitting, disabled, error, onSubmit }: Props) {
  // Mệnh giá đề xuất của listing có thể không nằm trong danh sách thường dùng: thêm vào đầu để vẫn chọn được.
  const proposed = String(parseDecimal(listing.noteDenomination) ?? DENOMINATION_OPTIONS[0]);
  const options = DENOMINATION_OPTIONS.includes(proposed) ? DENOMINATION_OPTIONS : [proposed, ...DENOMINATION_OPTIONS];
  const [denomination, setDenomination] = useState(proposed);
  const [fundingDays, setFundingDays] = useState(String(defaultFundingDays));

  const requested = parseDecimal(listing.targetAmount) ?? 0;
  const denominationValue = Number(denomination);
  const remainder = denominationValue > 0 ? requested % denominationValue : 0;
  const fundable = requested - remainder;
  const noteCount = denominationValue > 0 ? Math.round(fundable / denominationValue) : 0;
  const days = Number(fundingDays);
  const daysValid = Number.isInteger(days) && days >= FUNDING_DAYS_MIN && days <= FUNDING_DAYS_MAX;
  // Chỉ để quản trị hình dung; hạn chính thức do backend tính lúc duyệt.
  const expectedClose = daysValid ? new Date(Date.now() + days * DAY_MS).toISOString() : null;
  const canSubmit = denominationValue > 0 && fundable > 0 && daysValid && !submitting && !disabled;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      targetAmount: fundable.toFixed(2),
      noteDenomination: denominationValue.toFixed(2),
      // Mức tối thiểu bằng đúng một Note: bắt buộc là bội của mệnh giá, và một Note là ngưỡng thấp nhất có nghĩa.
      minInvestmentAmount: denominationValue.toFixed(2),
      fundingDays: days,
    });
  };

  return (
    <div className="fd-work">
      <span className="fd-field-label" id="fdDenomLabel">Mệnh giá một Note</span>
      <div className="fd-chips" role="group" aria-labelledby="fdDenomLabel">
        {options.map((option) => {
          const fits = requested % Number(option) === 0;
          return (
            <button
              key={option}
              type="button"
              className="fd-chip"
              aria-pressed={denomination === option}
              onClick={() => setDenomination(option)}
            >
              {formatMoney(option)}
              <small className={fits ? 'fit' : undefined}>{fits ? 'vừa khít' : 'còn dư'}</small>
            </button>
          );
        })}
      </div>
      <label className="fd-days">
        <span>Số ngày gọi vốn</span>
        <input
          className="fu-input"
          type="number"
          inputMode="numeric"
          min={FUNDING_DAYS_MIN}
          max={FUNDING_DAYS_MAX}
          value={fundingDays}
          aria-invalid={!daysValid}
          onChange={(event) => setFundingDays(event.target.value)}
        />
      </label>
      {!daysValid && <span className="fu-err" role="alert">Từ {FUNDING_DAYS_MIN} đến {FUNDING_DAYS_MAX} ngày.</span>}
      <dl className="fd-mini">
        <div><dt>Gọi vốn</dt><dd>{formatMoney(fundable)} đ</dd></div>
        <div><dt>Số Note</dt><dd>{formatNumber(noteCount)}</dd></div>
        {remainder > 0 && <div><dt>Không chia hết</dt><dd className="warn">{formatMoney(remainder)} đ</dd></div>}
        <div><dt>Hạn dự kiến</dt><dd>{formatDate(expectedClose)}</dd></div>
      </dl>
      <button type="button" className="ui-btn primary fd-block" disabled={!canSubmit} onClick={handleSubmit}>
        {submitting ? 'Đang duyệt...' : 'Duyệt lên sàn'}
      </button>
      {error ? <ErrorNotice error={error} /> : null}
    </div>
  );
}
