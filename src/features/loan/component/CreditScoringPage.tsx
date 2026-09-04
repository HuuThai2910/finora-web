import { useState } from "react";
import { useExplainCreditMutation } from "../api/aiScoringApi";
import type {
  CreditScoreRequest,
  DienGiaiNguoiDung,
  RuleTraceItem,
  TomTatYeuTo,
  YeuToAnhHuong,
  YeuToGop,
} from "../types";
import "./CreditScoringPage.css";

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

/** Hồ sơ mẫu — cũng là giá trị khởi tạo của form. */
const HO_SO_MAC_DINH: CreditScoreRequest = {
  so_cccd: "075047842393",
  person_age: 30,
  emp_length: "5 years",
  annual_inc: 300_000_000,
  loan_amnt: 50_000_000,
  home_ownership: "MORTGAGE",
  purpose: "debt_consolidation",
  verification_status: "Verified",
  dti: 15.5,
  installment: 4_500_000,
  int_rate: 12,
  term_months: 12,
};

/**
 * Kịch bản dựng sẵn, mỗi kịch bản kích hoạt một chốt chặn khác nhau.
 *
 * Ba CCCD đầu có thật trong dữ liệu của cic-service; hai chốt CIC (nợ xấu và trần
 * tổng dư nợ) chỉ kích hoạt được qua CCCD vì dữ liệu đó do CIC cấp, không nhận từ
 * người dùng tự khai.
 */
const KICH_BAN: {
  ten: string;
  mo_ta: string;
  ghi_de: Partial<CreditScoreRequest>;
}[] = [
  {
    ten: "Hồ sơ sạch",
    mo_ta: "Nợ nhóm 1, dư nợ thấp",
    ghi_de: { so_cccd: "075047842393" },
  },
  {
    ten: "Nợ xấu nhóm 5",
    mo_ta: "Vi phạm chốt nợ xấu CIC",
    ghi_de: { so_cccd: "089182000010" },
  },
  {
    ten: "Dư nợ 1,3 tỷ",
    mo_ta: "Vượt trần tổng 400 triệu",
    ghi_de: { so_cccd: "001668101246" },
  },
  {
    ten: "Lãi suất 25%",
    mo_ta: "Vượt trần 20%/năm",
    ghi_de: { so_cccd: "075047842393", int_rate: 25 },
  },
  {
    ten: "Trả nợ 80% thu nhập",
    mo_ta: "Vượt trần DSR 50%",
    ghi_de: {
      so_cccd: "075047842393",
      annual_inc: 60_000_000,
      installment: 4_000_000,
    },
  },
  {
    ten: "Tuổi 19 · 10+ năm KN",
    mo_ta: "Mâu thuẫn tuổi và thâm niên",
    ghi_de: {
      so_cccd: "075047842393",
      person_age: 19,
      emp_length: "10+ years",
    },
  },
];

const NHAN_QUYET_DINH: Record<string, string> = {
  APPROVED: "Duyệt tự động",
  PENDING_REVIEW: "Chờ thẩm định",
  REJECTED: "Từ chối",
};

const NHAN_MUC_DO: Record<YeuToGop["muc_do"], string> = {
  manh: "Mạnh",
  vua: "Vừa",
  nhe: "Nhẹ",
};

const MUC_DICH = [
  ["debt_consolidation", "Đảo nợ"],
  ["home_improvement", "Sửa nhà"],
  ["car", "Mua xe"],
  ["medical", "Y tế"],
  ["education", "Học tập"],
  ["small_business", "Kinh doanh nhỏ"],
  ["major_purchase", "Mua sắm lớn"],
  ["moving", "Chuyển nhà"],
  ["vacation", "Du lịch"],
  ["credit_card", "Thẻ tín dụng"],
  ["other", "Khác"],
];

const NHA_O = [
  ["OWN", "Sở hữu riêng"],
  ["MORTGAGE", "Đang thế chấp"],
  ["RENT", "Thuê"],
  ["OTHER", "Khác"],
];

const THAM_NIEN = [
  "< 1 year",
  "1 year",
  "2 years",
  "3 years",
  "5 years",
  "7 years",
  "10+ years",
];

const tienVN = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

/** Thanh biểu diễn độ lớn đóng góp, chuẩn hóa theo yếu tố mạnh nhất của cả hai chiều. */
function ThanhDongGop({
  yeuTo,
  max,
  huong,
}: {
  yeuTo: YeuToAnhHuong;
  max: number;
  huong: "bat-loi" | "co-loi";
}) {
  const rong =
    max > 0 ? Math.round((Math.abs(yeuTo.muc_dong_gop) / max) * 100) : 0;
  return (
    <li className="shap-item">
      <div className="shap-item-head">
        <span className="shap-item-label">
          {yeuTo.mo_ta}
          {yeuTo.la_leakage}
        </span>
        <span className="shap-item-value">
          {yeuTo.muc_dong_gop > 0 ? "+" : ""}
          {yeuTo.muc_dong_gop.toFixed(4)}
        </span>
      </div>
      <div className="shap-track">
        <span
          className={`shap-bar shap-bar-${huong}`}
          style={{ width: `${rong}%` }}
        />
      </div>
    </li>
  );
}

/**
 * Bản dành cho người vay: câu chữ thay cho hệ số log-odds.
 *
 * Nội dung do backend sinh (`/credit/explain` → `dien_giai`) chứ không dịch ở đây,
 * để web, mobile và finora-loan cùng nói một cách. Xem `app/ml/credit/dien_giai.py`.
 */
function BanDeHieu({ dienGiai }: { dienGiai: DienGiaiNguoiDung }) {
  return (
    <div className="scoring-card plain-card">
      <p className="plain-message">{dienGiai.thong_diep}</p>

      {dienGiai.ly_do_chinh.length > 0 && (
        <div className="plain-block">
          <div className="plain-block-title">Vì sao</div>
          <ul className="plain-list plain-list-reason">
            {dienGiai.ly_do_chinh.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      )}

      {dienGiai.goi_y_cai_thien.length > 0 && (
        <div className="plain-block">
          <div className="plain-block-title">Bạn nên làm gì</div>
          <ol className="plain-list plain-list-advice">
            {dienGiai.goi_y_cai_thien.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function CotGop({
  tieuDe,
  huong,
  yeuTo,
}: {
  tieuDe: string;
  huong: "bat-loi" | "co-loi";
  yeuTo: YeuToGop[];
}) {
  return (
    <div>
      <div className={`shap-col-title shap-col-${huong}`}>{tieuDe}</div>
      <ul className="gop-list">
        {yeuTo.map((y) => (
          <li key={y.ma_nhom} className="gop-item">
            <span className="gop-label">{y.mo_ta}</span>
            <span
              className={`gop-badge gop-badge-${huong} gop-badge-${y.muc_do}`}
            >
              {NHAN_MUC_DO[y.muc_do]}
            </span>
          </li>
        ))}
        {yeuTo.length === 0 && <li className="shap-none">Không có</li>}
      </ul>
    </div>
  );
}

/**
 * Bản gộp cho thẩm định viên: mỗi dữ kiện trên hồ sơ một dòng, xếp mức ảnh hưởng.
 *
 * Bản SHAP thô chia một dữ kiện (dư nợ, thu nhập) ra nhiều đặc trưng thường trái
 * dấu nhau, nên không đọc được "dư nợ là tốt hay xấu". Backend đã cộng lại theo
 * dữ kiện gốc và bỏ nhóm lãi suất (leakage); ở đây chỉ hiển thị.
 */
function BanGop({ tomTat }: { tomTat: TomTatYeuTo }) {
  return (
    <div className="scoring-card">
      <h2 className="scoring-card-title">
        Yếu tố ảnh hưởng theo mô hình AI
        <span className="scoring-card-sub">
          Tham khảo — cho biết mô hình chú ý điều gì ở hồ sơ này. Mức
          Mạnh/Vừa/Nhẹ là so sánh <b>tương đối trong chính hồ sơ này</b>, không
          phải thang chung. Đã gộp theo dữ kiện gốc và bỏ nhóm lãi suất. Căn cứ
          để duyệt hay từ chối là vết luật bên dưới.
        </span>
      </h2>
      <div className="shap-columns">
        <CotGop
          tieuDe="Đẩy rủi ro lên"
          huong="bat-loi"
          yeuTo={tomTat.bat_loi}
        />
        <CotGop
          tieuDe="Kéo rủi ro xuống"
          huong="co-loi"
          yeuTo={tomTat.co_loi}
        />
      </div>
    </div>
  );
}

function BangRuleTrace({ vet }: { vet: RuleTraceItem[] }) {
  return (
    <table className="scoring-table">
      <thead>
        <tr>
          <th>Luật</th>
          <th className="num">Điểm</th>
          <th>Giá trị đọc được</th>
        </tr>
      </thead>
      <tbody>
        {vet.map((t) => (
          <tr key={t.ma}>
            <td>
              <div className="rule-desc">{t.mo_ta}</div>
              <div className="rule-meta">
                <span className="rule-group">{t.truong}</span>
                <code>{t.ma}</code>
                {t.trong_so !== 1 && (
                  <span className="rule-weight">×{t.trong_so}</span>
                )}
              </div>
            </td>
            <td className="num">
              <b>{t.diem}</b>
              <span className="rule-max">/{t.toi_da}</span>
            </td>
            <td>
              {t.thieu_du_lieu ? (
                <span className="rule-missing">
                  Thiếu dữ liệu · dùng điểm trung tính
                </span>
              ) : (
                <span className="rule-value">{String(t.gia_tri)}</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default function CreditScoringPage() {
  const [form, setForm] = useState<CreditScoreRequest>(HO_SO_MAC_DINH);
  // Mặc định hiện bản người vay đọc được; số SHAP thô chỉ bật khi cần đối chứng.
  const [hienKyThuat, setHienKyThuat] = useState(false);
  const [explain, { data: kq, isLoading, error }] = useExplainCreditMutation();

  function dat<K extends keyof CreditScoreRequest>(
    khoa: K,
    giaTri: CreditScoreRequest[K],
  ) {
    setForm((truoc) => ({ ...truoc, [khoa]: giaTri }));
  }

  /** Ô số để trống nghĩa là "không khai", phải gửi undefined chứ không phải 0. */
  function datSo(khoa: keyof CreditScoreRequest, raw: string) {
    dat(khoa, (raw === "" ? undefined : Number(raw)) as never);
  }

  function chonKichBan(ghiDe: Partial<CreditScoreRequest>) {
    const hoSo = { ...HO_SO_MAC_DINH, ...ghiDe };
    setForm(hoSo);
    explain(hoSo);
  }

  const g = kq?.giai_thich_mo_hinh;
  const maxDongGop = g
    ? Math.max(
        ...[...g.yeu_to_bat_loi, ...g.yeu_to_co_loi].map((y) =>
          Math.abs(y.muc_dong_gop),
        ),
        0,
      )
    : 0;

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
            onClick={() => explain(form)}
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
