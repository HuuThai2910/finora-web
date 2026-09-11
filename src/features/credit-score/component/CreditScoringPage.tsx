import {
  KICH_BAN,
  MUC_DICH,
  NHA_O,
  NHAN_QUYET_DINH,
  THAM_NIEN,
} from "../constant";
import { useCreditScoring } from "../hooks/useCreditScoring";
import {
  BanDeHieu,
  BanGop,
  BangRuleTrace,
  ThanhDongGop,
  tienVN,
} from "./GiaiThichAi";
import "./css/CreditScoringPage.css";

/**
 * Màn hình chấm điểm tín dụng và giải thích quyết định (D4 + C1.2).
 *
 * Gọi thẳng `POST /api/v1/ai/credit/explain` của finora-ai. Endpoint này tự chấm
 * lại hồ sơ rồi trả về cả hai nửa của quyết định: giải thích TreeSHAP cho phần
 * mô hình, và rule trace cho phần quy tắc. Dùng một lời gọi thay vì gọi riêng
 * /score rồi /explain, vì gọi hai lần có thể cho hai kết quả khác nhau nếu cấu
 * hình Rule Engine bị sửa xen giữa.
 *
 * Màn hình này KHÔNG lưu gì. Nó là công cụ thẩm định và trình bày: nhập hồ sơ giả
 * định để xem mô hình phản ứng ra sao. Việc lưu kết quả chấm điểm thuộc
 * finora-loan (bảng credit_scoring_assessments).
 */


export default function CreditScoringPage() {
  const {
    form,
    hienKyThuat,
    setHienKyThuat,
    kq,
    isLoading,
    error,
    dat,
    datSo,
    chonKichBan,
    chamDiem,
    g,
    maxDongGop,
  } = useCreditScoring();

  return (
    <section className="scoring-page">
      <header className="scoring-header">
        <div>
          <span className="scoring-eyebrow">
            Rule Engine D4 · Explainable AI C1.2
          </span>
          <h1>Chấm điểm &amp; giải thích quyết định</h1>
          <p>
            Nhập hồ sơ giả định để xem mô hình chấm bao nhiêu và vì sao. Kết quả
            gồm hai nửa: đóng góp TreeSHAP của mô hình và vết luật của Rule
            Engine.
          </p>
        </div>
      </header>

      <div className="scoring-layout">
        {/* ── Form hồ sơ ───────────────────────────────────────── */}
        <div className="scoring-card scoring-form">
          <h2 className="scoring-card-title">Hồ sơ vay</h2>

          <div className="scoring-presets">
            {KICH_BAN.map((k) => (
              <button
                key={k.ten}
                type="button"
                className="scoring-preset"
                title={k.mo_ta}
                onClick={() => chonKichBan(k.ghi_de)}
                disabled={isLoading}
              >
                {k.ten}
              </button>
            ))}
          </div>

          <label className="scoring-label">
            Số CCCD
            <span className="scoring-hint">bỏ trống thì không tra CIC</span>
          </label>
          <input
            className="scoring-input"
            value={form.so_cccd ?? ""}
            onChange={(e) => dat("so_cccd", e.target.value || undefined)}
          />

          <div className="scoring-row">
            <div>
              <label className="scoring-label">Tuổi</label>
              <input
                className="scoring-input"
                type="number"
                value={form.person_age ?? ""}
                onChange={(e) => datSo("person_age", e.target.value)}
              />
            </div>
            <div>
              <label className="scoring-label">Thâm niên</label>
              <select
                className="scoring-input"
                value={form.emp_length ?? ""}
                onChange={(e) => dat("emp_length", e.target.value || undefined)}
              >
                {THAM_NIEN.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <label className="scoring-label">Thu nhập năm (VNĐ)</label>
          <input
            className="scoring-input"
            type="number"
            value={form.annual_inc}
            onChange={(e) => datSo("annual_inc", e.target.value)}
          />

          <label className="scoring-label">Số tiền vay (VNĐ)</label>
          <input
            className="scoring-input"
            type="number"
            value={form.loan_amnt}
            onChange={(e) => datSo("loan_amnt", e.target.value)}
          />

          <div className="scoring-row">
            <div>
              <label className="scoring-label">Kỳ hạn (tháng)</label>
              <input
                className="scoring-input"
                type="number"
                value={form.term_months ?? ""}
                onChange={(e) => datSo("term_months", e.target.value)}
              />
            </div>
            <div>
              <label className="scoring-label">Lãi suất (%/năm)</label>
              <input
                className="scoring-input"
                type="number"
                step="0.1"
                value={form.int_rate ?? ""}
                onChange={(e) => datSo("int_rate", e.target.value)}
              />
            </div>
          </div>

          <div className="scoring-row">
            <div>
              <label className="scoring-label">DTI (%)</label>
              <input
                className="scoring-input"
                type="number"
                step="0.1"
                value={form.dti ?? ""}
                onChange={(e) => datSo("dti", e.target.value)}
              />
            </div>
            <div>
              <label className="scoring-label">Trả hàng tháng</label>
              <input
                className="scoring-input"
                type="number"
                value={form.installment ?? ""}
                onChange={(e) => datSo("installment", e.target.value)}
              />
            </div>
          </div>

          <label className="scoring-label">Tình trạng nhà ở</label>
          <select
            className="scoring-input"
            value={form.home_ownership}
            onChange={(e) => dat("home_ownership", e.target.value)}
          >
            {NHA_O.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>

          <label className="scoring-label">Mục đích vay</label>
          <select
            className="scoring-input"
            value={form.purpose}
            onChange={(e) => dat("purpose", e.target.value)}
          >
            {MUC_DICH.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>

          <label className="scoring-label">Xác minh thu nhập</label>
          <select
            className="scoring-input"
            value={form.verification_status ?? ""}
            onChange={(e) =>
              dat("verification_status", e.target.value || undefined)
            }
          >
            <option value="Verified">Đã xác minh</option>
            <option value="Source Verified">Xác minh nguồn</option>
            <option value="Not Verified">Chưa xác minh</option>
          </select>

          <button
            className="scoring-submit"
            onClick={chamDiem}
            disabled={isLoading}
          >
            {isLoading ? "Đang chấm điểm…" : "Chấm điểm & giải thích"}
          </button>
        </div>

        {/* ── Kết quả ──────────────────────────────────────────── */}
        <div className="scoring-result">
          {error && (
            <div className="scoring-error">
              Không gọi được finora-ai. Kiểm tra service đã chạy ở cổng 8000
              chưa.
              <div className="scoring-error-detail">
                {"status" in error ? `HTTP ${error.status}` : "Lỗi kết nối"}
              </div>
            </div>
          )}

          {!kq && !error && (
            <div className="scoring-card scoring-empty">
              Chọn một kịch bản dựng sẵn hoặc bấm “Chấm điểm &amp; giải thích”.
            </div>
          )}

          {kq && g && (
            <>
              <div className="scoring-kpis">
                <div className="scoring-kpi">
                  <div className="scoring-kpi-label">Xác suất vỡ nợ (PD)</div>
                  <div className="scoring-kpi-value">{kq.pd_probability}</div>
                </div>
                <div className="scoring-kpi">
                  <div className="scoring-kpi-label">Điểm quy tắc</div>
                  <div className="scoring-kpi-value">
                    {kq.risk_score}
                    <span className="scoring-kpi-unit">/100</span>
                  </div>
                </div>
                <div className="scoring-kpi">
                  <div className="scoring-kpi-label">Điểm tổng hợp</div>
                  <div className="scoring-kpi-value">{kq.evaluation_score}</div>
                </div>
                <div className="scoring-kpi">
                  <div className="scoring-kpi-label">Hạng tín dụng</div>
                  <div
                    className={`scoring-kpi-value scoring-grade grade-${kq.credit_grade}`}
                  >
                    {kq.credit_grade}
                  </div>
                </div>
                <div className="scoring-kpi">
                  <div className="scoring-kpi-label">Quyết định</div>
                  <div className={`scoring-decision decision-${kq.decision}`}>
                    {NHAN_QUYET_DINH[kq.decision] ?? kq.decision}
                  </div>
                </div>
              </div>

              <BanDeHieu dienGiai={kq.dien_giai} />

              <BanGop tomTat={g.tom_tat} />

              {/* Vết luật nằm NGOÀI khối kỹ thuật: đây là căn cứ thẩm định viên
                  dùng để duyệt hay từ chối — mỗi luật do admin cấu hình, có trường
                  đã đọc, điểm và giá trị thật, không cần biết gì về ML để đọc. Bản gộp SHAP
                  ở trên chỉ nói mô hình nghĩ gì, không thay thế được vết luật. */}
              {kq.rejection_reasons.length > 0 && (
                <div className="scoring-card scoring-knockout">
                  <h2 className="scoring-card-title">
                    Chốt chặn pháp lý bị vi phạm
                  </h2>
                  <ul className="knockout-list">
                    {kq.rejection_reasons.map((m) => (
                      <li key={m}>
                        <code>{m}</code>
                      </li>
                    ))}
                  </ul>
                  <p className="knockout-note">
                    Vi phạm chốt chặn cho kết quả từ chối bất kể điểm số. Hệ
                    thống trả về tất cả vi phạm thay vì dừng ở lỗi đầu tiên, để
                    người vay sửa một lần.
                  </p>
                </div>
              )}

              <div className="scoring-card">
                <h2 className="scoring-card-title">
                  Vết luật — căn cứ thẩm định
                  <span className="scoring-card-sub">
                    Mỗi điểm cộng đều truy ngược được về một luật có tên.
                  </span>
                </h2>
                <BangRuleTrace vet={kq.rule_trace} />
              </div>

              <div className="scoring-mode">
                <button
                  type="button"
                  className={`scoring-mode-btn${hienKyThuat ? " is-on" : ""}`}
                  onClick={() => setHienKyThuat((v) => !v)}
                  aria-expanded={hienKyThuat}
                >
                  {hienKyThuat
                    ? "Ẩn chi tiết kỹ thuật"
                    : "Xem chi tiết kỹ thuật (SHAP từng đặc trưng)"}
                </button>
                <span className="scoring-mode-hint">
                  Số liệu trên thang log-odds — dùng để đối chứng mô hình, không
                  cần cho việc thẩm định thường ngày.
                </span>
              </div>

              {hienKyThuat && g.canh_bao.length > 0 && (
                <div className="scoring-warning">
                  <b>Cảnh báo chất lượng giải thích.</b> {g.canh_bao.join(" ")}
                </div>
              )}

              {hienKyThuat && (
                <div className="scoring-card">
                  <h2 className="scoring-card-title">
                    Giải thích của mô hình — TreeSHAP (bản thô)
                    <span className="scoring-card-sub">
                      Từng đặc trưng đúng như mô hình nhìn thấy, để đối chứng
                      với bản gộp ở trên. Đóng góp trên thang; tổng mọi đóng góp
                      cộng giá trị cơ sở ({g.gia_tri_co_so}) bằng đúng đầu ra.
                    </span>
                  </h2>
                  <div className="shap-columns">
                    <div>
                      <div className="shap-col-title shap-col-bat-loi">
                        Đẩy về phía rủi ro
                      </div>
                      <ul className="shap-list">
                        {g.yeu_to_bat_loi.map((y) => (
                          <ThanhDongGop
                            key={y.dac_trung}
                            yeuTo={y}
                            max={maxDongGop}
                            huong="bat-loi"
                          />
                        ))}
                        {g.yeu_to_bat_loi.length === 0 && (
                          <li className="shap-none">Không có</li>
                        )}
                      </ul>
                    </div>
                    <div>
                      <div className="shap-col-title shap-col-co-loi">
                        Kéo về phía an toàn
                      </div>
                      <ul className="shap-list">
                        {g.yeu_to_co_loi.map((y) => (
                          <ThanhDongGop
                            key={y.dac_trung}
                            yeuTo={y}
                            max={maxDongGop}
                            huong="co-loi"
                          />
                        ))}
                        {g.yeu_to_co_loi.length === 0 && (
                          <li className="shap-none">Không có</li>
                        )}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              <p className="scoring-footnote">
                Hạn mức đề xuất theo hạng · model {kq.model_version} · Trần 100
                triệu/nền tảng theo Quyết định 2866/QĐ-NHNN
                {form.loan_amnt
                  ? ` · Khoản vay yêu cầu ${tienVN(form.loan_amnt)} đ`
                  : ""}
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
