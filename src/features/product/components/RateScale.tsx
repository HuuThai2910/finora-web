import { RATE_CAP_PERCENT } from '../constants';
import { formatRate } from '../mappers/productDisplay';
import type { LoanProduct } from '../types';

/** Vị trí trên thước 0% đến trần, tính theo phần trăm độ rộng. */
const position = (rate: number) => Math.min(100, Math.max(0, (rate / RATE_CAP_PERCENT) * 100));

/** Nhãn sát hai đầu thước canh theo mép để không tràn ra ngoài khung. */
function Tick({ rate }: { rate: number }) {
  const x = position(rate);
  if (x > 92) return <span className="r">{formatRate(rate)}</span>;
  if (x < 8) return <span className="l">{formatRate(rate)}</span>;
  return <span style={{ left: `${x}%` }}>{formatRate(rate)}</span>;
}

/**
 * Thước lãi suất năm: dải là khung được phép (tối thiểu đến tối đa), vạch đậm là lãi cơ sở,
 * hai đầu là 0% và trần lãi suất của FINORA.
 */
export function RateScale({ product }: { product: LoanProduct }) {
  const min = Number(product.minAnnualInterestRate);
  const base = Number(product.annualInterestRate);
  const max = Number(product.maxAnnualInterestRate);
  return (
    <div
      className="prod-rate"
      role="img"
      aria-label={`Khung lãi suất ${formatRate(min)} đến ${formatRate(max)}, cơ sở ${formatRate(base)}`}
    >
      <div className="prod-rate-track">
        <span className="prod-rate-band" style={{ left: `${position(min)}%`, right: `${100 - position(max)}%` }} />
        <span className="prod-rate-base" style={{ left: `${position(base)}%` }}>
          <b>cơ sở {formatRate(base)}</b>
        </span>
      </div>
      <div className="prod-rate-axis" aria-hidden="true">
        {position(min) > 12 && <span className="l">0%</span>}
        <Tick rate={min} />
        <Tick rate={max} />
        {position(max) < 88 && <span className="r">{RATE_CAP_PERCENT}%</span>}
      </div>
    </div>
  );
}
