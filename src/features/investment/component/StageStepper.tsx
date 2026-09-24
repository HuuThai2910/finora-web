import { FUNDING_STAGES, type ListingStageView } from '../stage';

interface Props {
  stage: ListingStageView;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

const TERMINAL_TEXT = {
  CLOSED: { label: 'Đã đóng', hint: 'Hết hạn khi chưa gọi đủ vốn; tiền đã trả về ví nhà đầu tư' },
  CANCELLED: { label: 'Đã hủy', hint: 'finora-loan đã rút khoản vay khỏi sàn' },
} as const;

/**
 * Năm chặng của một khoản vay trên sàn, vẽ ngang.
 *
 * Trạng thái mỗi bước không chỉ đọc bằng màu: bước xong có dấu tick, bước đang tới có
 * số thứ tự và viền đậm, bước chưa tới mờ đi; trình đọc màn hình nhận `aria-current`.
 */
export function StageStepper({ stage }: Props) {
  return (
    <ol className="inv-stepper" aria-label="Chặng của khoản vay">
      {FUNDING_STAGES.map((step, index) => {
        const state = stage.steps[index] ?? 'todo';
        return (
          <li
            key={step.key}
            className={`inv-step is-${state}`}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span className="inv-step-dot" aria-hidden="true">
              {state === 'done' ? <CheckIcon /> : index + 1}
            </span>
            <span className="inv-step-text">
              <span className="inv-step-label">{step.label}</span>
              <span className="inv-step-hint">{step.hint}</span>
            </span>
          </li>
        );
      })}

      {stage.terminal && (
        <li className="inv-step is-terminal" aria-current="step">
          <span className="inv-step-dot" aria-hidden="true"><CrossIcon /></span>
          <span className="inv-step-text">
            <span className="inv-step-label">{TERMINAL_TEXT[stage.terminal].label}</span>
            <span className="inv-step-hint">{TERMINAL_TEXT[stage.terminal].hint}</span>
          </span>
        </li>
      )}
    </ol>
  );
}
