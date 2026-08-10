import './LoanEvaluationPage.css';

const GRADES = [
  { grade: 'A', range: '80 – 100', limit: '50.000.000 đ', risk: 'Thấp' },
  { grade: 'B', range: '60 – dưới 80', limit: '30.000.000 đ', risk: 'Trung bình' },
  { grade: 'C', range: '40 – dưới 60', limit: '15.000.000 đ', risk: 'Cao' },
  { grade: 'D', range: 'Dưới 40', limit: '5.000.000 đ', risk: 'Rất cao' },
];

const RULE_FACTORS = [
  { name: 'Tỷ lệ khoản vay/thu nhập năm', detail: '≤20%: 25 điểm · ≤50%: 15 điểm · còn lại: 5 điểm' },
  { name: 'Thâm niên làm việc', detail: '≥5 năm: 25 điểm · ≥2 năm: 15 điểm · còn lại: 5 điểm' },
  { name: 'Tình trạng nhà ở', detail: 'Sở hữu: 25 · thế chấp: 20 · thuê: 10 · khác: 5 điểm' },
  { name: 'Thu nhập năm', detail: '≥300 triệu: 25 điểm · ≥120 triệu: 15 điểm · còn lại: 5 điểm' },
];

/**
 * Trình bày chính sách đang được mã nguồn AI v10 áp dụng.
 * Đây là màn chỉ đọc vì hệ thống chưa có API quản trị/version hóa chính sách; không giả lập thao tác lưu.
 */
export default function LoanEvaluationPage() {
  return (
    <section className="policy-page">
      <header className="policy-header">
        <div>
          <span className="policy-eyebrow">Mô hình v10.0.0</span>
          <h1>Chính sách đánh giá AI</h1>
          <p>Giải thích cách kết quả mô hình và các quy tắc tường minh được kết hợp để hỗ trợ thẩm định.</p>
        </div>
        <span className="policy-readonly">Chỉ đọc</span>
      </header>

      <div className="policy-note">
        Các giá trị dưới đây phản ánh mã nguồn AI v10 hiện tại. Hệ thống chưa có API quản trị để thay đổi an toàn,
        nên chỉnh giao diện không được phép làm thay đổi kết quả chấm điểm. Khi bổ sung API, cần version, audit và kiểm thử hồi quy.
      </div>

      <div className="policy-grid policy-summary">
        <article className="policy-card"><span>Trọng số xác suất rủi ro</span><strong>60%</strong><p>(1 − PD) × 100</p></article>
        <article className="policy-card"><span>Trọng số điểm quy tắc</span><strong>40%</strong><p>Risk score 0–100</p></article>
        <article className="policy-card"><span>Tự động từ chối</span><strong>&lt; 10</strong><p>Hoặc vi phạm quy tắc chặn</p></article>
        <article className="policy-card"><span>Tự động đề xuất duyệt</span><strong>≥ 90</strong><p>Còn lại chờ admin thẩm định</p></article>
      </div>

      <article className="policy-panel">
        <div className="policy-panel-heading">
          <div><span className="policy-eyebrow">Credit grading</span><h2>Phân hạng và hạn mức gợi ý</h2></div>
          <span>Evaluation score = PD score × 60% + risk score × 40%</span>
        </div>
        <div className="policy-table-wrap">
          <table className="policy-table">
            <thead><tr><th>Hạng</th><th>Khoảng điểm</th><th>Mức rủi ro</th><th>Hạn mức AI gợi ý</th></tr></thead>
            <tbody>
              {GRADES.map((grade) => (
                <tr key={grade.grade}>
                  <td><strong className={`policy-grade grade-${grade.grade.toLowerCase()}`}>{grade.grade}</strong></td>
                  <td>{grade.range}</td><td>{grade.risk}</td><td>{grade.limit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </article>

      <div className="policy-grid">
        <article className="policy-panel">
          <div className="policy-panel-heading"><div><span className="policy-eyebrow">Rule engine 5C</span><h2>Bốn yếu tố chấm điểm</h2></div></div>
          <ol className="policy-list">
            {RULE_FACTORS.map((factor) => <li key={factor.name}><strong>{factor.name}</strong><span>{factor.detail}</span></li>)}
          </ol>
        </article>
        <article className="policy-panel">
          <div className="policy-panel-heading"><div><span className="policy-eyebrow">Knock-out rules</span><h2>Điều kiện chặn cứng</h2></div></div>
          <ul className="policy-list">
            <li><strong>Lãi suất không hợp lệ</strong><span>Không lớn hơn 20%/năm và phải lớn hơn 0.</span></li>
            <li><strong>Kỳ hạn vượt giới hạn</strong><span>Không quá 24 tháng theo policy hiện tại.</span></li>
            <li><strong>Áp lực trả nợ quá cao</strong><span>Khoản trả tháng vượt 50% thu nhập tháng.</span></li>
            <li><strong>Tuổi và kinh nghiệm bất hợp lý</strong><span>Loại khi dữ liệu cho thấy bắt đầu làm việc trước 10 tuổi.</span></li>
          </ul>
        </article>
      </div>
    </section>
  );
}
