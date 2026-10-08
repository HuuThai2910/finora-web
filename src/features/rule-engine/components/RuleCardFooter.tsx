import { GOI_Y_MAX } from '../constants';
import type { AiRule } from '../types';
import { IconAlertCircle } from './icons';

interface RuleCardFooterProps {
  luat: AiRule;
  idThe: string;
  editing: boolean;
  laPhanLoai: boolean;
  diemToiDa: number;
  onChange: (thayDoi: Partial<AiRule>) => void;
}

/** Chân thẻ luật: điểm khi thiếu dữ liệu và câu gợi ý cho người vay. */
export default function RuleCardFooter({ luat, idThe, editing, laPhanLoai, diemToiDa, onChange }: RuleCardFooterProps) {
  const goiY = luat.goi_y ?? '';
  // Nhãn chỉ gắn với ô nhập khi đang sửa; lúc xem là chữ thường.
  const nhan = (forId: string, text: string) => (editing ? <label htmlFor={forId}>{text}</label> : <span>{text}</span>);

  return (
    <footer className="rl-foot">
      <div className="rl-foot-row">
        {nhan(`${idThe}-thieu`, 'Điểm khi thiếu dữ liệu')}
        {editing ? (
          <input id={`${idThe}-thieu`} type="number" className="aip-input rl-num rl-cell-input" min="0" max={diemToiDa}
            value={luat.diem_khi_thieu} onChange={(e) => onChange({ diem_khi_thieu: Number(e.target.value) })} />
        ) : (
          <strong>{luat.diem_khi_thieu}</strong>
        )}
      </div>

      <div className="rl-foot-block">
        <div className="rl-foot-label">
          {nhan(`${idThe}-goi-y`, 'Gợi ý cho người vay')}
          {/* Biến {moc} chỉ có nghĩa với luật số (ngưỡng kế tiếp); luật phân loại không có. */}
          {!laPhanLoai && (
            <span className="rl-tip">
              <button type="button" className="rl-tip-btn" aria-label="Giải thích cách dùng biến {moc}" aria-describedby={`${idThe}-tip`}>
                <IconAlertCircle />
              </button>
              <span className="rl-tip-pop" role="tooltip" id={`${idThe}-tip`}>
                <span><strong>Biến <code>{'{moc}'}</code>:</strong> tự thay bằng ngưỡng kế tiếp người vay cần đạt theo bậc điểm.</span>
                <span>Ví dụ: "Giảm nợ xuống dưới <code>{'{moc}'}%</code> thu nhập".</span>
              </span>
            </span>
          )}
        </div>
        {editing ? (
          <>
            <textarea id={`${idThe}-goi-y`} className="aip-input rl-textarea" rows={3} maxLength={GOI_Y_MAX}
              placeholder="Bỏ trống để hệ thống tự ghép câu từ mô tả luật" value={goiY}
              onChange={(e) => onChange({ goi_y: e.target.value || null })} />
            <p className="rl-hint">
              <span>{!laPhanLoai && <>Chèn <code>{'{moc}'}</code> vào câu để hệ thống tự điền ngưỡng kế tiếp.</>}</span>
              <span className="rl-counter">{goiY.length}/{GOI_Y_MAX}</span>
            </p>
          </>
        ) : (
          <p className={`rl-goi-y${luat.goi_y ? '' : ' auto'}`}>
            {luat.goi_y ?? 'Tự ghép từ mô tả luật và ngưỡng kế tiếp'}
          </p>
        )}
      </div>
    </footer>
  );
}
