import { useState } from 'react';
import {
  BanDeHieu,
  BanGop,
  BangRuleTrace,
  ThanhDongGop,
} from '@/features/credit-score/component/GiaiThichAi';
import '@/features/credit-score/component/css/CreditScoringPage.css';
import { toUiApiError } from '@/lib/api/errors';
import { useLazyGetAssessmentExplanationQuery } from '../api/loanReviewApi';
import { formatDateTime } from '../formatters';

/**
 * Phần phân tích của AI cho một hồ sơ vay, mở ra ngay trong tab thẩm định.
 *
 * Dữ liệu là bản AI đã sinh lúc chấm điểm, do Loan Service lưu lại — không chấm
 * lại. Nếu chấm lại thì con số có thể khác với lúc quyết định (mô hình hoặc bộ
 * luật đã đổi), và màn hình mất giá trị làm bằng chứng cho quyết định đã ra.
 *
 * Chỉ tải khi admin bấm mở: payload gồm SHAP từng đặc trưng và vết mọi luật, lớn
 * hơn nhiều so với phần tóm tắt vẫn hiển thị sẵn ở tab.
 */
export default function LoanAiAnalysis({ applicationNumber }: { applicationNumber: string }) {
  const [mo, setMo] = useState(false);
  const [hienKyThuat, setHienKyThuat] = useState(false);
  const [tai, { data, isFetching, error }] = useLazyGetAssessmentExplanationQuery();

  const toggle = () => {
    if (!mo) tai(applicationNumber);
    setMo((truoc) => !truoc);
  };

  const moHinh = data?.modelExplanation;
  // Chuẩn hóa độ dài thanh theo yếu tố mạnh nhất của cả hai chiều, để hai cột
  // so sánh được với nhau chứ không mỗi cột một thang.
  const maxDongGop = moHinh
    ? Math.max(
        ...[...moHinh.yeu_to_bat_loi, ...moHinh.yeu_to_co_loi].map((y) =>
          Math.abs(y.muc_dong_gop),
        ),
        Number.EPSILON,
      )
    : 1;

  return (
    <article className="review-card">
      <div className="review-card-heading">
        <div>
          <span className="review-eyebrow">Cơ sở của điểm số</span>
          <h2>Chấm điểm &amp; giải thích AI</h2>
        </div>
        <button type="button" className="review-button secondary" onClick={toggle} aria-expanded={mo}>
          {mo ? 'Thu gọn' : 'Xem chi tiết phân tích của AI'}
        </button>
      </div>

      {!mo ? (
        <p className="review-muted">
          Xem mô hình đã dựa vào dữ kiện nào và từng luật chấm bao nhiêu điểm.
        </p>
      ) : isFetching ? (
        <p className="review-empty-inline">Đang tải phân tích…</p>
      ) : error ? (
        <p className="review-empty-inline">{toUiApiError(error).message}</p>
      ) : !data ? (
        <p className="review-empty-inline">Chưa có phân tích cho hồ sơ này.</p>
      ) : (
        <div className="scoring-result">
          <p className="review-muted">
            Bản AI sinh lúc chấm điểm
            {data.scoredAt ? ` ngày ${formatDateTime(data.scoredAt)}` : ''} · Mô hình{' '}
            {data.actualModelVersion ?? 'chưa xác định'}
            {data.decisionPolicyVersion ? ` · Chính sách ${data.decisionPolicyVersion}` : ''}
          </p>

          {data.borrowerExplanation ? <BanDeHieu dienGiai={data.borrowerExplanation} /> : null}

          {moHinh ? <BanGop tomTat={moHinh.tom_tat} /> : null}

          {/* Vết luật là căn cứ thẩm định: mỗi luật do admin cấu hình, có trường đã
              đọc, giá trị thật và điểm — đọc được mà không cần biết gì về ML. Bản
              gộp SHAP ở trên chỉ nói mô hình nghĩ gì, không thay thế được. */}
          {data.ruleTrace && data.ruleTrace.length > 0 ? (
            <div className="scoring-card">
              <h2 className="scoring-card-title">
                Vết luật — căn cứ thẩm định
                <span className="scoring-card-sub">
                  Mỗi điểm cộng đều truy ngược được về một luật có tên.
                </span>
              </h2>
              <BangRuleTrace vet={data.ruleTrace} />
            </div>
          ) : null}

          {moHinh ? (
            <>
              <div className="scoring-mode">
                <button
                  type="button"
                  className={`scoring-mode-btn${hienKyThuat ? ' is-on' : ''}`}
                  onClick={() => setHienKyThuat((v) => !v)}
                  aria-expanded={hienKyThuat}
                >
                  {hienKyThuat
                    ? 'Ẩn chi tiết kỹ thuật'
                    : 'Xem chi tiết kỹ thuật (SHAP từng đặc trưng)'}
                </button>
                <span className="scoring-mode-hint">
                  Số liệu trên thang log-odds — dùng để đối chứng mô hình, không cần cho
                  việc thẩm định thường ngày.
                </span>
              </div>

              {hienKyThuat && moHinh.canh_bao.length > 0 && (
                <div className="scoring-warning">
                  <b>Cảnh báo chất lượng giải thích.</b> {moHinh.canh_bao.join(' ')}
                </div>
              )}

              {hienKyThuat && (
                <div className="scoring-card">
                  <h2 className="scoring-card-title">
                    Giải thích của mô hình — TreeSHAP (bản thô)
                    <span className="scoring-card-sub">
                      Từng đặc trưng đúng như mô hình nhìn thấy. Tổng mọi đóng góp cộng
                      giá trị cơ sở ({moHinh.gia_tri_co_so}) bằng đúng đầu ra.
                    </span>
                  </h2>
                  <div className="shap-columns">
                    <div>
                      <div className="shap-col-title shap-col-bat-loi">Đẩy về phía rủi ro</div>
                      <ul className="shap-list">
                        {moHinh.yeu_to_bat_loi.map((y) => (
                          <ThanhDongGop
                            key={y.dac_trung}
                            yeuTo={y}
                            max={maxDongGop}
                            huong="bat-loi"
                          />
                        ))}
                        {moHinh.yeu_to_bat_loi.length === 0 && (
                          <li className="shap-empty">Không có yếu tố bất lợi đáng kể.</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <div className="shap-col-title shap-col-co-loi">Kéo về phía an toàn</div>
                      <ul className="shap-list">
                        {moHinh.yeu_to_co_loi.map((y) => (
                          <ThanhDongGop
                            key={y.dac_trung}
                            yeuTo={y}
                            max={maxDongGop}
                            huong="co-loi"
                          />
                        ))}
                        {moHinh.yeu_to_co_loi.length === 0 && (
                          <li className="shap-empty">Không có yếu tố có lợi đáng kể.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </article>
  );
}
