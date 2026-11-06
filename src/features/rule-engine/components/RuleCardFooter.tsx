import { GOI_Y_MAX } from '../constants';
import type { AiRule } from '../types';
import { IconAlertCircle } from './icons';
import { RULE_CELL_INPUT, RULE_FIELD_INPUT } from './styles';

const CODE = 'px-1 rounded-[4px] font-mono text-[12px]';
const TIP_CODE = `${CODE} bg-[rgba(255,255,255,0.14)] text-white`;

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
    <footer className="rl-foot flex flex-col gap-2 mt-auto pt-3 border-t border-t-divider text-[13px]">
      <div className="rl-foot-row flex items-center justify-between gap-3 min-h-7.5 pr-2.5 text-secondary font-medium">
        {nhan(`${idThe}-thieu`, 'Điểm khi thiếu dữ liệu')}
        {editing ? (
          <input id={`${idThe}-thieu`} type="number" className={`aip-input rl-num rl-cell-input ${RULE_CELL_INPUT} w-16`} min="0" max={diemToiDa}
            value={luat.diem_khi_thieu} onChange={(e) => onChange({ diem_khi_thieu: Number(e.target.value) })} />
        ) : (
          <strong className="text-primary [font-variant-numeric:tabular-nums]">{luat.diem_khi_thieu}</strong>
        )}
      </div>

      <div className="rl-foot-block flex flex-col gap-1">
        <div className="rl-foot-label flex items-center gap-1 text-secondary font-medium">
          {nhan(`${idThe}-goi-y`, 'Gợi ý cho người vay')}
          {/* Biến {moc} chỉ có nghĩa với luật số (ngưỡng kế tiếp); luật phân loại không có. */}
          {!laPhanLoai && (
            // Chú giải biến {moc}: hiện khi rê chuột hoặc focus vào nút.
            <span className="rl-tip relative inline-flex">
              <button
                type="button"
                className="rl-tip-btn inline-grid place-items-center size-5 text-muted hover:text-primary [&_svg]:size-3.5"
                aria-label="Giải thích cách dùng biến {moc}"
                aria-describedby={`${idThe}-tip`}
              >
                <IconAlertCircle />
              </button>
              <span
                className="rl-tip-pop absolute bottom-[calc(100%+8px)] -left-2 z-50 flex flex-col gap-1 w-70 max-w-[calc(100vw-40px)] py-2 px-3 rounded-md bg-primary shadow-pop text-[#eef2fa] text-[12px] font-normal leading-normal opacity-0 invisible transition-[opacity,visibility] duration-150 [.rl-tip:hover_&]:opacity-100 [.rl-tip:hover_&]:visible [.rl-tip:focus-within_&]:opacity-100 [.rl-tip:focus-within_&]:visible"
                role="tooltip"
                id={`${idThe}-tip`}
              >
                <span><strong className="text-white font-semibold">Biến <code className={TIP_CODE}>{'{moc}'}</code>:</strong> tự thay bằng ngưỡng kế tiếp người vay cần đạt theo bậc điểm.</span>
                <span>Ví dụ: "Giảm nợ xuống dưới <code className={TIP_CODE}>{'{moc}'}%</code> thu nhập".</span>
              </span>
            </span>
          )}
        </div>
        {editing ? (
          <>
            <textarea id={`${idThe}-goi-y`} className={`aip-input rl-textarea ${RULE_FIELD_INPUT} min-h-18 resize-y`} rows={3} maxLength={GOI_Y_MAX}
              placeholder="Bỏ trống để hệ thống tự ghép câu từ mô tả luật" value={goiY}
              onChange={(e) => onChange({ goi_y: e.target.value || null })} />
            <p className="rl-hint flex items-baseline justify-between gap-3 text-muted text-[12px] leading-normal">
              <span>{!laPhanLoai && <>Chèn <code className={`${CODE} bg-fill`}>{'{moc}'}</code> vào câu để hệ thống tự điền ngưỡng kế tiếp.</>}</span>
              <span className="rl-counter shrink-0 [font-variant-numeric:tabular-nums]">{goiY.length}/{GOI_Y_MAX}</span>
            </p>
          </>
        ) : (
          <p className={`rl-goi-y${luat.goi_y ? '' : ' auto'} text-secondary leading-normal [&.auto]:text-muted`}>
            {luat.goi_y ?? 'Tự ghép từ mô tả luật và ngưỡng kế tiếp'}
          </p>
        )}
      </div>
    </footer>
  );
}
