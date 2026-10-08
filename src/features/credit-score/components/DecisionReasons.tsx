import { NHAN_LY_DO_THAM_DINH, NHAN_MA_LOAI_TRUC_TIEP } from '@/features/rule-engine';

interface DecisionReasonsProps {
  rejection: string[];
  review: string[];
}

/**
 * Luật loại trực tiếp bị vi phạm và lý do bắt buộc thẩm định thủ công. Nhãn tiếng
 * Việt kèm mã gốc monospace để đối chiếu log; mã chưa có nhãn hiện nguyên mã.
 */
export function DecisionReasons({ rejection, review }: DecisionReasonsProps) {
  return (
    <>
      {rejection.length > 0 && (
        <section className="ui-card cs-card" aria-labelledby="csKnockoutTitle">
          <h2 id="csKnockoutTitle" className="cs-card-title">Vi phạm luật loại trực tiếp</h2>
          <ul className="cs-reasons">
            {rejection.map((ma) => (
              <li key={ma}>
                <span className="cs-reason danger">{NHAN_MA_LOAI_TRUC_TIEP[ma] ?? ma}</span>
                <code className="ui-mono">{ma}</code>
              </li>
            ))}
          </ul>
          <p className="cs-card-note">
            Vi phạm luật loại trực tiếp cho kết quả từ chối bất kể điểm số. Hệ thống trả về tất cả vi phạm thay vì
            dừng ở lỗi đầu tiên, để người vay sửa một lần.
          </p>
        </section>
      )}
      {review.length > 0 && (
        <section className="ui-card cs-card" aria-labelledby="csReviewTitle">
          <h2 id="csReviewTitle" className="cs-card-title">Lý do phải thẩm định thủ công</h2>
          <ul className="cs-reasons">
            {review.map((ma) => (
              <li key={ma}>
                <span className="cs-reason warning">{NHAN_LY_DO_THAM_DINH[ma] ?? ma}</span>
                <code className="ui-mono">{ma}</code>
              </li>
            ))}
          </ul>
          <p className="cs-card-note">Hồ sơ không được duyệt tự động nhưng đây không phải lý do từ chối.</p>
        </section>
      )}
    </>
  );
}
