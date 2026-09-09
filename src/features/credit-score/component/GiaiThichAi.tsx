import type {
  DienGiaiNguoiDung,
  RuleTraceItem,
  TomTatYeuTo,
  YeuToAnhHuong,
  YeuToGop,
} from "../types";
import { NHAN_MUC_DO } from "../constant";

/**
 * Các khối trình bày kết quả giải thích của AI, dùng chung cho hai nơi:
 * màn thử nghiệm `CreditScoringPage` (chấm hồ sơ giả định) và tab thẩm định của
 * một hồ sơ vay thật (đọc lại bản đã lưu lúc chấm).
 *
 * Tách khỏi màn thử nghiệm để hai nơi không trôi thành hai cách trình bày khác
 * nhau cho cùng một dữ liệu — cùng ngưỡng, cùng nhãn, cùng cách vẽ độ lớn.
 */

export const tienVN = (n: number) => new Intl.NumberFormat("vi-VN").format(n);

/** Thanh biểu diễn độ lớn đóng góp, chuẩn hóa theo yếu tố mạnh nhất của cả hai chiều. */
export function ThanhDongGop({
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
          {yeuTo.la_leakage && <span className="shap-leak-tag">Rò rỉ</span>}
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
export function BanDeHieu({ dienGiai }: { dienGiai: DienGiaiNguoiDung }) {
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
export function BanGop({ tomTat }: { tomTat: TomTatYeuTo }) {
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

export function BangRuleTrace({ vet }: { vet: RuleTraceItem[] }) {
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
