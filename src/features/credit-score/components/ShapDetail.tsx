import type { GiaiThichMoHinh } from '../types';
import { ThanhDongGop } from './AiExplanation';

/** Chevron của nút mở chi tiết kỹ thuật; xoay 180 độ khi đang mở. */
function IconChevron() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

interface ShapDetailProps {
  giaiThich: GiaiThichMoHinh;
  open: boolean;
  onToggle: () => void;
}

/** Chi tiết kỹ thuật: đóng góp SHAP thô từng đặc trưng, ẩn mặc định. */
export function ShapDetail({ giaiThich: g, open, onToggle }: ShapDetailProps) {
  const max = Math.max(...[...g.yeu_to_bat_loi, ...g.yeu_to_co_loi].map((y) => Math.abs(y.muc_dong_gop)), 0);

  return (
    <>
      <div className="cs-mode">
        <button type="button" className={`ui-btn ghost cs-mode-btn${open ? ' open' : ''}`} onClick={onToggle}
          aria-expanded={open} aria-controls="csShapDetail">
          {open ? 'Ẩn chi tiết kỹ thuật' : 'Xem chi tiết kỹ thuật (SHAP từng đặc trưng)'}
          <IconChevron />
        </button>
        <span className="cs-mode-hint">
          Số liệu trên thang log-odds, dùng để đối chứng mô hình, không cần cho thẩm định thường ngày.
        </span>
      </div>

      {open && (
        <div id="csShapDetail" className="cs-shap">
          {g.canh_bao.length > 0 && (
            <div className="cs-warning" role="note">
              <b>Cảnh báo chất lượng giải thích.</b> {g.canh_bao.join(' ')}
            </div>
          )}
          <section className="ui-card cs-card" aria-labelledby="csShapTitle">
            <h2 id="csShapTitle" className="cs-card-title">Đóng góp SHAP từng đặc trưng (bản thô)</h2>
            <p className="cs-card-sub">
              Từng đặc trưng đúng như mô hình nhìn thấy, để đối chứng với bản gộp ở trên. Đóng góp trên thang
              log-odds; tổng mọi đóng góp cộng giá trị cơ sở ({g.gia_tri_co_so}) bằng đúng đầu ra.
            </p>
            <div className="aix-columns">
              {([['bat-loi', 'Đẩy về phía rủi ro', g.yeu_to_bat_loi], ['co-loi', 'Kéo về phía an toàn', g.yeu_to_co_loi]] as const).map(
                ([huong, tieuDe, ds]) => (
                  <div key={huong}>
                    <h3 className={`aix-col-title ${huong}`}>{tieuDe}</h3>
                    <ul className="aix-shap-list">
                      {ds.map((y) => <ThanhDongGop key={y.dac_trung} yeuTo={y} max={max} huong={huong} />)}
                      {ds.length === 0 && <li className="aix-none">Không có</li>}
                    </ul>
                  </div>
                ),
              )}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
