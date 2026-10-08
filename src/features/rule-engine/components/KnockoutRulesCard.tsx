import { formatCurrency, formatPercent } from '@/utils';
import { CAN_CU_TRAN, NHOM_NO_XAU_TOI_THIEU } from '../constants';
import type { LegalLimits } from '../types';

interface KnockoutRow {
  ten: string;
  dieuKien: string;
  canCu: string;
}

/**
 * Luật loại trực tiếp theo `kiem_tra_chot_chan_cung` của finora-ai.
 *
 * finora-ai CHƯA có API liệt kê các luật này, nên danh sách là mô tả cố định đối
 * chiếu với mã nguồn backend (ghi rõ trên giao diện). Các mức trần lấy từ
 * `legal_limits` của API nên đổi theo cấu hình. Hai luật CIC là chính sách rủi ro
 * nội bộ (diễn giải của backend nói rõ), không phải quy định pháp luật.
 * Bản trước còn liệt kê "trả nợ quá 50% thu nhập" và "đi làm trước 10 tuổi":
 * backend không còn chặn hai điều kiện đó nên đã bỏ.
 */
function buildRows(limits: LegalLimits): KnockoutRow[] {
  const laiSuat = formatPercent(limits.max_interest_rate * 100);
  return [
    { ten: 'Lãi suất không hợp lệ', dieuKien: `Lãi suất bằng 0, âm hoặc vượt ${laiSuat}/năm`, canCu: CAN_CU_TRAN.max_interest_rate },
    { ten: 'Kỳ hạn vượt giới hạn', dieuKien: `Kỳ hạn trên ${limits.max_term_months} tháng`, canCu: CAN_CU_TRAN.max_term_months },
    { ten: 'Nợ xấu tại CIC', dieuKien: `Đang có nợ từ nhóm ${NHOM_NO_XAU_TOI_THIEU} trở lên`, canCu: 'Chính sách rủi ro nội bộ' },
    { ten: 'Đang phục hồi sau nợ xấu', dieuKien: 'Dữ liệu CIC còn trong thời gian tạm khóa vay', canCu: 'Chính sách rủi ro nội bộ' },
    {
      ten: 'Vượt trần tổng dư nợ',
      dieuKien: `Dư nợ hiện có cộng khoản vay này vượt ${formatCurrency(limits.max_total_debt_all_platforms)} trên mọi nền tảng`,
      canCu: CAN_CU_TRAN.max_total_debt_all_platforms,
    },
  ];
}

export function KnockoutRulesCard({ limits }: { limits: LegalLimits }) {
  return (
    <article className="ui-card aip-card" aria-labelledby="aipKnockoutTitle">
      <div className="aip-card-head">
        <div className="aip-head-main">
          <h2 id="aipKnockoutTitle">Luật loại trực tiếp</h2>
          <span className="aip-meta">Vi phạm một luật là từ chối, bất kể điểm số</span>
        </div>
        <span className="ui-tag">Chỉ đọc</span>
      </div>
      <div className="ui-table-wrap aip-table-wrap">
        <table className="ui-table list aip-wrap-table">
          <thead>
            <tr><th>Luật</th><th>Loại hồ sơ khi</th><th>Căn cứ</th></tr>
          </thead>
          <tbody>
            {buildRows(limits).map((row) => (
              <tr key={row.ten}>
                <td className="strong">{row.ten}</td>
                <td>{row.dieuKien}</td>
                <td className="aip-muted">{row.canCu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="aip-foot">
        Danh sách cố định theo dịch vụ chấm điểm, chưa đọc được qua API; các mức trần lấy từ cấu hình pháp lý ở trên.
      </p>
    </article>
  );
}
