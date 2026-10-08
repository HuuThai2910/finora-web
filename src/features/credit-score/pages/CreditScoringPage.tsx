import { AiErrorNotice } from '@/features/rule-engine';
import { formatNumber } from '@/utils';
import { BanDeHieu, BanGop, BangRuleTrace } from '../components/AiExplanation';
import { DecisionReasons } from '../components/DecisionReasons';
import { ScoringForm } from '../components/ScoringForm';
import { ScoreDistributionCard } from '../components/ScoreDistributionCard';
import { ScoringSummary } from '../components/ScoringSummary';
import { ShapDetail } from '../components/ShapDetail';
import { useCreditScoring } from '../hooks/useCreditScoring';
import './CreditScoringPage.css';

/**
 * Chấm điểm và giải thích quyết định (`/loans/scoring`).
 *
 * Gọi POST /api/v1/ai/credit/explain: endpoint tự chấm lại hồ sơ rồi trả cả hai nửa
 * của quyết định (giải thích của mô hình và vết luật) trong một lần, để hai nửa
 * không lệch nhau khi bộ luật bị sửa xen giữa. Màn hình KHÔNG lưu gì; kết quả chấm
 * thật của hồ sơ vay do finora-loan lưu.
 *
 * "Phân bố điểm tín dụng" lấy từ summary thống kê của finora-loan (điểm thật của các hồ
 * sơ vay), không gồm hồ sơ chấm thử ở đây. Ô "hạn mức đề xuất" ẩn vì /explain không trả
 * trường này.
 */
export default function CreditScoringPage() {
  const s = useCreditScoring();
  const kq = s.ketQua;

  return (
    <section className="ui-page cs-page">
      <header className="ui-page-head">
        <div className="ui-title"><h1>Chấm điểm và giải thích quyết định</h1></div>
      </header>

      <div className="cs-layout">
        <ScoringForm
          form={s.form}
          loi={s.loi}
          busy={s.isLoading}
          onSo={s.datSo}
          onChu={s.datChu}
          onSubmit={s.chamDiem}
          onKichBan={s.chonKichBan}
        />

        <div className="cs-result" aria-live="polite" aria-busy={s.isLoading}>
          {s.error ? <AiErrorNotice error={s.error} onRetry={s.chamDiem} /> : null}

          {!kq && !s.error && (
            <div className="ui-card ui-empty">
              {s.isLoading ? 'Đang chấm điểm...' : 'Chọn một kịch bản mẫu hoặc bấm "Chấm điểm và giải thích".'}
            </div>
          )}

          {!kq && <ScoreDistributionCard />}

          {kq && (
            <>
              <ScoringSummary ketQua={kq} />
              <ScoreDistributionCard currentScore={kq.evaluation_score} />
              <BanDeHieu dienGiai={kq.dien_giai} />
              <BanGop tomTat={kq.giai_thich_mo_hinh.tom_tat} />
              <DecisionReasons rejection={kq.rejection_reasons} review={kq.review_reasons ?? []} />

              <section className="ui-card cs-card flush" aria-labelledby="csTraceTitle">
                <div className="cs-card-head">
                  <h2 id="csTraceTitle" className="cs-card-title">Vết luật chấm điểm</h2>
                  <p className="cs-card-sub">Căn cứ thẩm định: mỗi điểm đều truy ngược được về một luật có tên.</p>
                </div>
                <BangRuleTrace vet={kq.rule_trace} />
              </section>

              <ShapDetail giaiThich={kq.giai_thich_mo_hinh} open={s.hienKyThuat} onToggle={s.doiKyThuat} />

              <p className="cs-footnote">
                {s.hoSoDaCham?.loan_amnt ? `Khoản vay yêu cầu: ${formatNumber(s.hoSoDaCham.loan_amnt)} đ. ` : ''}
                Phiên bản mô hình {kq.model_version}.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
