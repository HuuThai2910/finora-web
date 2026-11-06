import { StatusPill } from '@/components/StatusPill';
import { livenessDisplay } from '../mappers/attemptDisplay';
import { toReasonViews } from '../mappers/reasonDisplay';
import type { EkycAttemptDetail } from '../types';
import { ReasonList } from './ReasonList';
import { REVIEW_CARD, REVIEW_CARD_HEAD, REVIEW_CARD_TITLE } from './reviewStyles';

/** Lý do của bước kiểm tra người thật và so khớp khuôn mặt (điểm và vùng điểm nằm ở thẻ kết quả bên cạnh). */
export function LivenessCard({ attempt }: { attempt: EkycAttemptDetail }) {
  const result = livenessDisplay(attempt.livenessResult);
  return (
    <section className={REVIEW_CARD} aria-labelledby="ekrLivenessTitle">
      <div className={REVIEW_CARD_HEAD}>
        <h2 id="ekrLivenessTitle" className={REVIEW_CARD_TITLE}>Kiểm tra người thật</h2>
        <StatusPill tone={result.tone}>{result.label}</StatusPill>
      </div>
      <ReasonList
        reasons={toReasonViews(attempt.livenessReasons)}
        empty={attempt.livenessResult ? 'Không có lý do nào được ghi.' : 'Lượt chưa tới bước quay video.'}
      />
    </section>
  );
}
