import { RATE_CAP_PERCENT } from '../constants';
import { formatRate } from '../mappers/productDisplay';
import type { LoanProduct } from '../types';

/** Vị trí trên thước 0% đến trần, tính theo phần trăm độ rộng. */
const position = (rate: number) => Math.min(100, Math.max(0, (rate / RATE_CAP_PERCENT) * 100));

const TICK = 'absolute whitespace-nowrap';
/** Nhãn sát hai đầu thước canh theo mép (`l`, `r`); nhãn giữa canh tâm vào vị trí của nó. */
const TICK_LEFT = `l ${TICK} left-0`;
const TICK_RIGHT = `r ${TICK} right-0`;
const TICK_CENTER = `${TICK} transform-[translateX(-50%)]`;

/**
 * Nhãn "cơ sở" trên vạch lãi cơ sở. Nhãn rộng khoảng 70px nên khi vạch gần hai đầu thước, canh giữa sẽ tràn khỏi mép
 * ngăn: gần mép trái thì nhãn mọc sang phải từ vạch, gần mép phải thì mọc sang trái. Chuỗi lớp tĩnh để Tailwind sinh được.
 */
const BASE_LABEL = 'absolute bottom-5 text-brand text-[12px] font-semibold whitespace-nowrap';
const BASE_LABEL_CENTER = `${BASE_LABEL} left-[50%] transform-[translateX(-50%)]`;
const BASE_LABEL_START = `${BASE_LABEL} left-0`;
const BASE_LABEL_END = `${BASE_LABEL} right-0`;

function baseLabelClass(x: number): string {
  if (x < 18) return BASE_LABEL_START;
  if (x > 82) return BASE_LABEL_END;
  return BASE_LABEL_CENTER;
}

/** Nhãn sát hai đầu thước canh theo mép để không tràn ra ngoài khung. */
function Tick({ rate }: { rate: number }) {
  const x = position(rate);
  if (x > 92) return <span className={TICK_RIGHT}>{formatRate(rate)}</span>;
  if (x < 8) return <span className={TICK_LEFT}>{formatRate(rate)}</span>;
  return <span className={TICK_CENTER} style={{ left: `${x}%` }}>{formatRate(rate)}</span>;
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
      className="prod-rate pt-7.5 pb-1"
      role="img"
      aria-label={`Khung lãi suất ${formatRate(min)} đến ${formatRate(max)}, cơ sở ${formatRate(base)}`}
    >
      <div className="prod-rate-track relative h-2 rounded-[4px] bg-[#eef0f3]">
        <span
          className="prod-rate-band absolute top-0 bottom-0 rounded-[4px] bg-[#c7d6fb]"
          style={{ left: `${position(min)}%`, right: `${100 - position(max)}%` }}
        />
        {/* Vạch 2px cao hơn thước 4px mỗi đầu, nhãn "cơ sở" nằm trên vạch. */}
        <span
          className="prod-rate-base absolute -top-1 w-0.5 h-4 -ml-px rounded-[1px] bg-brand"
          style={{ left: `${position(base)}%` }}
        >
          <b className={baseLabelClass(position(base))}>cơ sở {formatRate(base)}</b>
        </span>
      </div>
      <div className="prod-rate-axis relative h-4.5 mt-1.5 text-muted text-[12px] tabular-nums" aria-hidden="true">
        {position(min) > 12 && <span className={TICK_LEFT}>0%</span>}
        <Tick rate={min} />
        {max !== min && <Tick rate={max} />}
        {position(max) < 88 && <span className={TICK_RIGHT}>{RATE_CAP_PERCENT}%</span>}
      </div>
    </div>
  );
}
