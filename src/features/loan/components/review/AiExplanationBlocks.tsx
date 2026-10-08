import { StatusPill } from '@/components/StatusPill';
import type { DienGiaiNguoiDung, RuleTraceItem, TomTatYeuTo, YeuToAnhHuong, YeuToGop } from '../../types';
import { formatDecimal, formatRuleValue, IMPACT_LABELS } from '../../mappers/reviewDisplay';

/*
 * Các khối trình bày giải thích AI của trang chi tiết hồ sơ (lớp CSS `lr-ai-*`).
 * Tách khỏi màn Chấm điểm thử nghiệm (feature credit-score) để hai trang đổi giao diện độc lập;
 * nội dung đều do backend sinh, ở đây chỉ hiển thị.
 */

/** Bảng luật đã chấm: căn cứ thẩm định, mỗi điểm truy về một luật có mã. */
export function RuleTraceTable({ trace }: { trace: RuleTraceItem[] }) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table lr-ai-rules">
        <thead>
          <tr>
            <th>Luật</th>
            <th className="num">Điểm</th>
            <th>Giá trị đọc được</th>
          </tr>
        </thead>
        <tbody>
          {trace.map((item) => (
            <tr key={item.ma}>
              <td>
                <div className="lr-ai-rule-desc">{item.mo_ta}</div>
                <div className="lr-ai-rule-meta">
                  <code className="lr-code">{item.ma}</code>, <code className="lr-code">{item.truong}</code>
                  {item.trong_so !== 1 ? `, trọng số ${formatDecimal(item.trong_so)}` : ''}
                </div>
              </td>
              <td className="num">
                <span className="strong">{formatDecimal(item.diem)}</span>
                <span className="lr-ai-rule-max">/{formatDecimal(item.toi_da)}</span>
              </td>
              <td>
                {item.thieu_du_lieu
                  ? <span className="lr-ai-missing">Thiếu dữ liệu, dùng điểm trung tính</span>
                  : <span className="lr-ai-value">{formatRuleValue(item.gia_tri)}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FactorColumn({ title, items, tone }: { title: string; items: YeuToGop[]; tone: 'danger' | 'success' }) {
  return (
    <div>
      <div className="lr-ai-col-title">{title}</div>
      <ul className="lr-ai-factors">
        {items.map((item) => (
          <li key={item.ma_nhom}>
            <span>{item.mo_ta}</span>
            <StatusPill tone={item.muc_do === 'nhe' ? 'neutral' : tone} small>{IMPACT_LABELS[item.muc_do]}</StatusPill>
          </li>
        ))}
        {items.length === 0 ? <li className="lr-ai-none">Không có</li> : null}
      </ul>
    </div>
  );
}

/** Bản gộp theo dữ kiện gốc (backend đã cộng SHAP và bỏ nhóm lãi suất). */
export function FactorSummary({ summary }: { summary: TomTatYeuTo }) {
  return (
    <section className="lr-ai-section">
      <h3>Yếu tố ảnh hưởng theo mô hình</h3>
      <p className="lr-ai-sub">
        Chỉ để tham khảo. Mức Mạnh, Vừa, Nhẹ so sánh tương đối trong chính hồ sơ này, không phải thang chung.
        Đã gộp theo dữ kiện gốc và bỏ nhóm lãi suất. Căn cứ duyệt hay từ chối là bảng luật đã chấm ở trên.
      </p>
      <div className="lr-ai-columns">
        <FactorColumn title="Làm tăng rủi ro" items={summary.bat_loi} tone="danger" />
        <FactorColumn title="Làm giảm rủi ro" items={summary.co_loi} tone="success" />
      </div>
    </section>
  );
}

/** Thông điệp người vay đọc trong ứng dụng (do AI sinh, web và mobile dùng chung một câu chữ). */
export function BorrowerMessage({ message }: { message: DienGiaiNguoiDung }) {
  return (
    <section className="lr-ai-section">
      <h3>Thông điệp gửi người vay</h3>
      <p className="lr-ai-sub">Nội dung người vay nhìn thấy trong ứng dụng.</p>
      <p className="lr-ai-message">{message.thong_diep}</p>
      {message.ly_do_chinh.length > 0 ? (
        <div className="lr-ai-block">
          <div className="lr-ai-block-title">Vì sao</div>
          <ul className="lr-ai-list">{message.ly_do_chinh.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}
      {message.goi_y_cai_thien.length > 0 ? (
        <div className="lr-ai-block">
          <div className="lr-ai-block-title">Bạn nên làm gì</div>
          <ol className="lr-ai-list">{message.goi_y_cai_thien.map((item) => <li key={item}>{item}</li>)}</ol>
        </div>
      ) : null}
    </section>
  );
}

function ContributionBar({ factor, max, direction }: { factor: YeuToAnhHuong; max: number; direction: 'risk' | 'safe' }) {
  const width = max > 0 ? Math.round((Math.abs(factor.muc_dong_gop) / max) * 100) : 0;
  return (
    <li className="lr-ai-shap-item">
      <div className="lr-ai-shap-head">
        <span>
          {factor.mo_ta}
          {factor.la_leakage ? <> <StatusPill tone="warning" small>Rò rỉ</StatusPill></> : null}
        </span>
        <span className="lr-ai-shap-value">{factor.muc_dong_gop > 0 ? '+' : ''}{factor.muc_dong_gop.toFixed(4)}</span>
      </div>
      <div className="lr-ai-track">
        {/* Độ rộng là dữ liệu động nên phải đặt inline. */}
        <span className={`lr-ai-bar ${direction}`} style={{ width: `${width}%` }} />
      </div>
    </li>
  );
}

interface ShapColumnsProps {
  risk: YeuToAnhHuong[];
  safe: YeuToAnhHuong[];
}

/** SHAP thô từng đặc trưng; độ dài thanh chuẩn hóa theo yếu tố mạnh nhất của cả hai chiều. */
export function ShapColumns({ risk, safe }: ShapColumnsProps) {
  const max = Math.max(...[...risk, ...safe].map((factor) => Math.abs(factor.muc_dong_gop)), Number.EPSILON);
  return (
    <div className="lr-ai-columns">
      <div>
        <div className="lr-ai-col-title">Đẩy về phía rủi ro</div>
        <ul className="lr-ai-shap">
          {risk.map((factor) => <ContributionBar key={factor.dac_trung} factor={factor} max={max} direction="risk" />)}
          {risk.length === 0 ? <li className="lr-ai-none">Không có yếu tố bất lợi đáng kể.</li> : null}
        </ul>
      </div>
      <div>
        <div className="lr-ai-col-title">Kéo về phía an toàn</div>
        <ul className="lr-ai-shap">
          {safe.map((factor) => <ContributionBar key={factor.dac_trung} factor={factor} max={max} direction="safe" />)}
          {safe.length === 0 ? <li className="lr-ai-none">Không có yếu tố có lợi đáng kể.</li> : null}
        </ul>
      </div>
    </div>
  );
}
