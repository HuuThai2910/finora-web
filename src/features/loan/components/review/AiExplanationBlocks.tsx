import { StatusPill } from '@/components/StatusPill';
import type { DienGiaiNguoiDung, RuleTraceItem, TomTatYeuTo, YeuToAnhHuong, YeuToGop } from '../../types';
import { formatDecimal, formatRuleValue, formatSignedDecimal, IMPACT_LABELS } from '../../mappers/reviewDisplay';
import { AI_COL_TITLE, AI_COLUMNS, AI_HEADING, AI_SECTION, AI_SUB } from './reviewClassNames';

/*
 * Các khối trình bày giải thích AI của trang chi tiết hồ sơ (lớp mốc `lr-ai-*`).
 * Nội dung đều do backend sinh, ở đây chỉ hiển thị.
 */

const FACTOR_ITEM = 'flex justify-between items-center gap-3 py-2 border-b border-b-divider text-[14px] last:[border-bottom:0]';

const LIST = 'lr-ai-list grid gap-1 pl-5 text-[14px] leading-[1.6]';

// Thanh đóng góp: đỏ khi đẩy về rủi ro, xanh khi kéo về an toàn (lớp `risk`/`safe`).
const BAR = 'lr-ai-bar block h-full rounded-[999px] [&.risk]:bg-danger [&.safe]:bg-success';

const SHAP_NONE = 'lr-ai-none py-2 text-muted text-[13px]';

/**
 * Bảng luật đã chấm: căn cứ thẩm định. Mã luật và tên trường máy chỉ nằm trong `title` của tên luật (để đối chiếu
 * với cấu hình khi cần), không hiện thành chữ.
 */
export function RuleTraceTable({ trace }: { trace: RuleTraceItem[] }) {
  return (
    <div className="ui-table-wrap">
      {/* Mô tả luật dài nên ô bảng được xuống dòng, căn trên. */}
      <table className="ui-table lr-ai-rules [&_td]:whitespace-normal [&_td]:align-top">
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
                <div className="lr-ai-rule-desc text-[14px]" title={`${item.ma} · ${item.truong}`}>{item.mo_ta}</div>
                {item.trong_so !== 1 ? (
                  <div className="lr-ai-rule-meta mt-0.5 text-muted text-[12px]">Trọng số {formatDecimal(item.trong_so)}</div>
                ) : null}
              </td>
              <td className="num">
                <span className="strong">{formatDecimal(item.diem)}</span>
                <span className="lr-ai-rule-max text-muted">/{formatDecimal(item.toi_da)}</span>
              </td>
              <td>
                {item.thieu_du_lieu
                  ? <span className="lr-ai-missing text-warning text-[13px]">Thiếu dữ liệu, dùng điểm trung tính</span>
                  : <span className="lr-ai-value text-secondary text-[13px] tabular-nums">{formatRuleValue(item.truong, item.gia_tri)}</span>}
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
      <div className={AI_COL_TITLE}>{title}</div>
      <ul className="lr-ai-factors">
        {items.map((item) => (
          <li key={item.ma_nhom} className={FACTOR_ITEM}>
            <span>{item.mo_ta}</span>
            <StatusPill tone={item.muc_do === 'nhe' ? 'neutral' : tone} small>{IMPACT_LABELS[item.muc_do]}</StatusPill>
          </li>
        ))}
        {/* Dòng "Không có" theo khuôn dòng yếu tố (chữ 14px), chỉ đổi màu nhạt. */}
        {items.length === 0 ? <li className={`lr-ai-none ${FACTOR_ITEM} text-muted`}>Không có</li> : null}
      </ul>
    </div>
  );
}

/** Bản gộp theo dữ kiện gốc (backend đã cộng SHAP và bỏ nhóm lãi suất). */
export function FactorSummary({ summary }: { summary: TomTatYeuTo }) {
  return (
    <section className={AI_SECTION}>
      <h3 className={AI_HEADING}>Yếu tố ảnh hưởng theo mô hình</h3>
      <p className={AI_SUB}>
        Chỉ để tham khảo. Mức Mạnh, Vừa, Nhẹ so sánh tương đối trong chính hồ sơ này, không phải thang chung.
        Đã gộp theo dữ kiện gốc và bỏ nhóm lãi suất. Căn cứ duyệt hay từ chối là bảng luật đã chấm ở trên.
      </p>
      <div className={AI_COLUMNS}>
        <FactorColumn title="Làm tăng rủi ro" items={summary.bat_loi} tone="danger" />
        <FactorColumn title="Làm giảm rủi ro" items={summary.co_loi} tone="success" />
      </div>
    </section>
  );
}

/** Thông điệp người vay đọc trong ứng dụng (do AI sinh, web và mobile dùng chung một câu chữ). */
export function BorrowerMessage({ message }: { message: DienGiaiNguoiDung }) {
  return (
    <section className={AI_SECTION}>
      <h3 className={AI_HEADING}>Thông điệp gửi người vay</h3>
      <p className={AI_SUB}>Nội dung người vay nhìn thấy trong ứng dụng.</p>
      <p className="lr-ai-message text-[14px] leading-[1.6]">{message.thong_diep}</p>
      {message.ly_do_chinh.length > 0 ? (
        <div className="lr-ai-block mt-3">
          <div className="lr-ai-block-title mb-1 text-secondary text-[13px] font-medium">Vì sao</div>
          <ul className={`${LIST} list-disc`}>{message.ly_do_chinh.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      ) : null}
      {message.goi_y_cai_thien.length > 0 ? (
        <div className="lr-ai-block mt-3">
          <div className="lr-ai-block-title mb-1 text-secondary text-[13px] font-medium">Bạn nên làm gì</div>
          <ol className={`${LIST} list-decimal`}>{message.goi_y_cai_thien.map((item) => <li key={item}>{item}</li>)}</ol>
        </div>
      ) : null}
    </section>
  );
}

function ContributionBar({ factor, max, direction }: { factor: YeuToAnhHuong; max: number; direction: 'risk' | 'safe' }) {
  const width = max > 0 ? Math.round((Math.abs(factor.muc_dong_gop) / max) * 100) : 0;
  return (
    <li className="lr-ai-shap-item">
      <div className="lr-ai-shap-head flex justify-between items-baseline gap-3 mb-1 text-[13px]">
        <span>
          {factor.mo_ta}
          {factor.la_leakage ? <> <StatusPill tone="warning" small>Rò rỉ</StatusPill></> : null}
        </span>
        <span className="lr-ai-shap-value text-secondary text-[12px] tabular-nums whitespace-nowrap">
          {formatSignedDecimal(factor.muc_dong_gop)}
        </span>
      </div>
      <div className="lr-ai-track h-1.5 overflow-hidden rounded-[999px] bg-[#eef0f3]">
        {/* Độ rộng là dữ liệu động nên phải đặt inline. */}
        <span className={`${BAR} ${direction}`} style={{ width: `${width}%` }} />
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
    <div className={AI_COLUMNS}>
      <div>
        <div className={AI_COL_TITLE}>Đẩy về phía rủi ro</div>
        <ul className="lr-ai-shap grid gap-3 pt-2">
          {risk.map((factor) => <ContributionBar key={factor.dac_trung} factor={factor} max={max} direction="risk" />)}
          {risk.length === 0 ? <li className={SHAP_NONE}>Không có yếu tố bất lợi đáng kể.</li> : null}
        </ul>
      </div>
      <div>
        <div className={AI_COL_TITLE}>Kéo về phía an toàn</div>
        <ul className="lr-ai-shap grid gap-3 pt-2">
          {safe.map((factor) => <ContributionBar key={factor.dac_trung} factor={factor} max={max} direction="safe" />)}
          {safe.length === 0 ? <li className={SHAP_NONE}>Không có yếu tố có lợi đáng kể.</li> : null}
        </ul>
      </div>
    </div>
  );
}
