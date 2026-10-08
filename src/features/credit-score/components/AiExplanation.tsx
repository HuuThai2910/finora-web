import { GIA_TRI_LABEL } from '@/features/rule-engine';
import { EMPTY } from '@/utils';
import { NHAN_MUC_DO } from '../constants';
import type { DienGiaiNguoiDung, RuleTraceItem, TomTatYeuTo, YeuToAnhHuong, YeuToGop } from '../types';
import './AiExplanation.css';

/**
 * Các khối trình bày giải thích của AI: diễn giải cho người vay, bản gộp yếu tố,
 * vết luật và thanh đóng góp SHAP. Nội dung do backend sinh, ở đây chỉ hiển thị.
 */

/** Thanh độ lớn đóng góp SHAP, chuẩn hóa theo yếu tố mạnh nhất của cả hai chiều. */
export function ThanhDongGop({ yeuTo, max, huong }: { yeuTo: YeuToAnhHuong; max: number; huong: 'bat-loi' | 'co-loi' }) {
  const rong = max > 0 ? Math.round((Math.abs(yeuTo.muc_dong_gop) / max) * 100) : 0;
  return (
    <li className="aix-shap-item">
      <div className="aix-shap-head">
        <span>
          {yeuTo.mo_ta}
          {yeuTo.la_leakage && <span className="ui-pill sm warning aix-leak">Rò rỉ</span>}
        </span>
        <span className="aix-shap-value">{yeuTo.muc_dong_gop > 0 ? '+' : ''}{yeuTo.muc_dong_gop.toFixed(4)}</span>
      </div>
      <div className="aix-track" aria-hidden="true">
        {/* Độ rộng là giá trị động thật sự nên đặt inline. */}
        <span className={`aix-bar ${huong}`} style={{ width: `${rong}%` }} />
      </div>
    </li>
  );
}

/**
 * Bản cho người vay: câu chữ thay cho hệ số log-odds. Backend sinh câu
 * (`dien_giai`) để web, mobile và finora-loan nói cùng một cách.
 */
export function BanDeHieu({ dienGiai }: { dienGiai: DienGiaiNguoiDung }) {
  return (
    <section className="ui-card cs-card" aria-labelledby="aixPlainTitle">
      <h2 id="aixPlainTitle" className="cs-card-title">Diễn giải cho người vay</h2>
      <p className="aix-message">{dienGiai.thong_diep}</p>
      {dienGiai.ly_do_chinh.length > 0 && (
        <div className="aix-block">
          <h3>Vì sao</h3>
          <ul className="aix-list">{dienGiai.ly_do_chinh.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      )}
      {dienGiai.goi_y_cai_thien.length > 0 && (
        <div className="aix-block">
          <h3>Bạn nên làm gì</h3>
          <ol className="aix-list">{dienGiai.goi_y_cai_thien.map((x) => <li key={x}>{x}</li>)}</ol>
        </div>
      )}
    </section>
  );
}

function CotGop({ tieuDe, huong, yeuTo }: { tieuDe: string; huong: 'bat-loi' | 'co-loi'; yeuTo: YeuToGop[] }) {
  return (
    <div>
      <h3 className={`aix-col-title ${huong}`}>{tieuDe}</h3>
      <ul className="aix-gop-list">
        {yeuTo.map((y) => (
          <li key={y.ma_nhom}>
            <span>{y.mo_ta}</span>
            {/* Mạnh: màu trạng thái đầy đủ; Vừa: chữ màu trên nền xám; Nhẹ: xám. Luôn có chữ. */}
            <span className={`ui-pill sm aix-muc ${huong} ${y.muc_do}`}>{NHAN_MUC_DO[y.muc_do]}</span>
          </li>
        ))}
        {yeuTo.length === 0 && <li className="aix-none">Không có</li>}
      </ul>
    </div>
  );
}

/**
 * Bản gộp cho thẩm định viên: mỗi dữ kiện gốc một dòng. Backend đã cộng SHAP theo
 * dữ kiện gốc và bỏ nhóm lãi suất (rò rỉ dữ liệu).
 */
export function BanGop({ tomTat }: { tomTat: TomTatYeuTo }) {
  return (
    <section className="ui-card cs-card" aria-labelledby="aixGopTitle">
      <h2 id="aixGopTitle" className="cs-card-title">Yếu tố ảnh hưởng theo mô hình AI</h2>
      <p className="cs-card-sub">
        Chỉ để tham khảo. Mức Mạnh, Vừa, Nhẹ so sánh tương đối trong chính hồ sơ này, không phải thang chung. Đã gộp
        theo dữ kiện gốc và bỏ nhóm lãi suất. Căn cứ để duyệt hay từ chối là vết luật bên dưới.
      </p>
      <div className="aix-columns">
        <CotGop tieuDe="Đẩy rủi ro lên" huong="bat-loi" yeuTo={tomTat.bat_loi} />
        <CotGop tieuDe="Kéo rủi ro xuống" huong="co-loi" yeuTo={tomTat.co_loi} />
      </div>
    </section>
  );
}

/** Giá trị phân loại hiện nhãn tiếng Việt; số giữ nguyên như backend đọc được. */
function nhanGiaTri(giaTri: RuleTraceItem['gia_tri']): string {
  if (giaTri == null) return EMPTY;
  return typeof giaTri === 'string' ? GIA_TRI_LABEL[giaTri] ?? giaTri : String(giaTri);
}

/** Bảng vết luật: căn cứ thẩm định, mỗi điểm truy ngược được về một luật có tên. */
export function BangRuleTrace({ vet }: { vet: RuleTraceItem[] }) {
  if (vet.length === 0) return <div className="ui-empty">Không có luật nào được chạy.</div>;
  return (
    <div className="ui-table-wrap aix-trace-wrap">
      <table className="ui-table aix-trace">
        <thead>
          <tr><th>Luật</th><th>Giá trị đọc được</th><th className="num">Điểm</th></tr>
        </thead>
        <tbody>
          {vet.map((t) => (
            <tr key={t.ma}>
              <td>
                <div className="aix-rule-name">{t.mo_ta}</div>
                <div className="aix-rule-meta">
                  <code>{t.ma}</code>
                  {t.trong_so !== 1 && <span>trọng số ×{t.trong_so}</span>}
                </div>
              </td>
              <td>
                {t.thieu_du_lieu ? (
                  <span className="aix-missing">
                    <span className="ui-pill sm warning">Thiếu dữ liệu</span>
                    Dùng điểm trung tính
                  </span>
                ) : (
                  <span className="aix-value">{nhanGiaTri(t.gia_tri)}</span>
                )}
              </td>
              <td className="num"><span className="strong">{t.diem}</span><span className="aix-max">/{t.toi_da}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
