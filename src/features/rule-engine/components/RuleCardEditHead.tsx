import { useState } from 'react';
import { Modal } from '@/components/Modal';
import { NGUON_LABEL, TRONG_SO_MAX, TRONG_SO_MIN } from '../constants';
import { bacMacDinh, bangDiemMacDinh } from '../schemas/ruleEngineForm';
import type { AiRule, AiTruong } from '../types';
import { IconArrowDown, IconArrowUp, IconTrash } from './icons';
import type { RuleCardProps } from './RuleCard';
import { RULE_FIELD_INPUT, RULE_TOOL_BOX } from './styles';

const nhanTruong = (t: AiTruong) => `${t.mo_ta}${t.don_vi ? ` (${t.don_vi})` : ''}`;

const FIELD = 'rl-field flex flex-col gap-1 min-w-0';
const FIELD_LABEL = 'text-secondary text-[13px] font-medium';
const SELECT = `aip-input rl-select ${RULE_FIELD_INPUT} cursor-pointer text-ellipsis`;

/** Thay đổi đang chờ xác nhận vì sẽ dựng lại bậc điểm (hoặc bảng điểm) của luật. */
interface DoiCanXacNhan {
  thayDoi: Partial<AiRule>;
  cauHoi: string;
  nut: string;
}

/** Luật đang có bậc/bảng điểm do admin đặt (khác mặc định), tức là dựng lại sẽ làm mất phần đã nhập. */
function coDiemRieng(luat: AiRule, truong: AiTruong | undefined, mocVoCuc: number): boolean {
  if (truong?.kieu === 'phan_loai') {
    return JSON.stringify(luat.bang_diem ?? {}) !== JSON.stringify(bangDiemMacDinh(truong));
  }
  return JSON.stringify(luat.bac ?? []) !== JSON.stringify(bacMacDinh(luat.nghich_dao, mocVoCuc));
}

/**
 * Phần đầu thẻ luật khi đang sửa: thanh công cụ, tên và mã, trường dữ liệu, chiều, trọng số.
 *
 * Đổi chiều đánh giá, hoặc đổi trường mà phải dựng lại bậc/bảng điểm, khi luật đang có điểm admin đã đặt thì hỏi xác
 * nhận trước: một lần chọn nhầm trong ô thả xuống không được xóa mất các bậc.
 */
export default function RuleCardEditHead({
  luat, index, total, truong, danhSachTruong, mocVoCuc, khoaMa, onChange, onMoTa, onMa, onXoa, onDiChuyen, idThe,
}: RuleCardProps & { idThe: string }) {
  const [canXacNhan, setCanXacNhan] = useState<DoiCanXacNhan | null>(null);
  const xin = (doi: DoiCanXacNhan) => {
    if (coDiemRieng(luat, truong, mocVoCuc)) setCanXacNhan(doi);
    else onChange(doi.thayDoi);
  };
  const laPhanLoai = truong?.kieu === 'phan_loai';
  const ten = luat.mo_ta || String(index + 1);

  function doiTruong(maTruong: string) {
    const moi = danhSachTruong.find((t) => t.ma === maTruong);
    if (!moi) return;
    // Từ trường số sang trường số thì giữ bậc đang có; còn lại dựng lại bậc/bảng điểm mặc định.
    if (moi.kieu === 'so' && truong?.kieu === 'so' && luat.bac) {
      onChange({ truong: maTruong, bang_diem: null, bac: luat.bac });
      return;
    }
    const thayDoi: Partial<AiRule> = moi.kieu === 'so'
      ? { truong: maTruong, bang_diem: null, bac: bacMacDinh(luat.nghich_dao, mocVoCuc) }
      : { truong: maTruong, nghich_dao: false, bac: null, bang_diem: bangDiemMacDinh(moi) };
    const dangCo = truong?.kieu === 'phan_loai' ? 'bảng điểm' : 'các bậc điểm';
    xin({
      thayDoi,
      cauHoi: `Đổi sang trường "${moi.mo_ta}" sẽ xóa ${dangCo} đang có của luật này và dựng lại mặc định.`,
      nut: 'Đổi trường',
    });
  }

  // Chiều đổi thì thứ tự ngưỡng hợp lệ đổi theo: dựng lại bậc cho khỏi kẹt lỗi.
  const doiChieu = (nghichDao: boolean) => xin({
    thayDoi: { nghich_dao: nghichDao, bac: bacMacDinh(nghichDao, mocVoCuc) },
    cauHoi: `Đổi sang "${nghichDao ? 'càng thấp càng tốt' : 'càng cao càng tốt'}" sẽ xóa các bậc điểm đang có của luật này và dựng lại mặc định.`,
    nut: 'Đổi chiều',
  });

  return (
    <header className="rl-item-head editing flex flex-col items-stretch justify-between gap-3">
      <div className="rl-edit-bar flex items-center justify-between flex-wrap gap-2">
        <span className="ui-tag">Luật #{index + 1}</span>
        <div className="rl-tools flex items-center flex-wrap justify-end gap-2 max-[640px]:w-full max-[640px]:justify-start">
          <button type="button" className={`rl-tool ${RULE_TOOL_BOX}`} aria-label={`Chuyển luật ${ten} lên trên`} title="Chuyển lên"
            onClick={() => onDiChuyen(-1)} disabled={index === 0}>
            <IconArrowUp />
          </button>
          <button type="button" className={`rl-tool ${RULE_TOOL_BOX}`} aria-label={`Chuyển luật ${ten} xuống dưới`} title="Chuyển xuống"
            onClick={() => onDiChuyen(1)} disabled={index === total - 1}>
            <IconArrowDown />
          </button>
          {/* Công tắc: trạng thái đọc được bằng vị trí núm và nhãn chữ, không chỉ bằng màu. Checkbox ẩn nhưng vẫn
              focus được; ray và núm vẽ theo trạng thái của nó. */}
          <label className="rl-switch inline-flex items-center gap-2 text-secondary text-[13px] font-medium cursor-pointer select-none">
            <input type="checkbox" className="absolute w-px h-px opacity-0" checked={luat.bat} onChange={() => onChange({ bat: !luat.bat })} />
            <span
              className="rl-switch-track relative flex-none w-8 h-4.5 rounded-[999px] bg-line-strong transition-[background] duration-200 [input:checked+&]:bg-brand [input:focus-visible+&]:[outline:2px_solid_var(--color-brand)] [input:focus-visible+&]:outline-offset-2 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:size-3.5 after:rounded-[50%] after:bg-white after:transition-[transform] after:duration-200 [input:checked+&]:after:transform-[translateX(14px)]"
              aria-hidden="true"
            />
            <span>{luat.bat ? 'Đang bật' : 'Đã tắt'}</span>
          </label>
          <button
            type="button"
            className="rl-delete inline-flex items-center gap-1.5 h-8 px-3 border border-danger rounded-md bg-white text-danger text-[13px] font-medium hover:bg-danger-bg [&_svg]:size-3.5"
            aria-label={`Xóa luật ${ten}`}
            onClick={onXoa}
          >
            <IconTrash />
            <span>Xóa</span>
          </button>
        </div>
      </div>

      {/* Các trường sắp theo bề ngang của thẻ (container rl-card), không theo màn hình. */}
      <div className="rl-name-fields grid grid-cols-[1fr] gap-3 @min-[340px]/rl-card:grid-cols-[minmax(0,1.4fr)_minmax(150px,1fr)]">
        <div className={FIELD}>
          <label htmlFor={`${idThe}-mo-ta`} className={FIELD_LABEL}>Tên luật</label>
          <input id={`${idThe}-mo-ta`} type="text" className={`aip-input ${RULE_FIELD_INPUT}`} placeholder="Ví dụ: Tuổi người vay"
            value={luat.mo_ta} onChange={(e) => onMoTa(e.target.value)} />
        </div>
        <div className={FIELD}>
          <label htmlFor={`${idThe}-ma`} className={FIELD_LABEL}>Mã luật</label>
          {/* Luật đã lưu khóa mã: mã nằm trong vết chấm điểm của các quyết định cũ, đổi mã là mất liên kết. */}
          <input id={`${idThe}-ma`} type="text"
            className={`aip-input rl-input-code ${RULE_FIELD_INPUT} read-only:bg-surface-muted read-only:text-secondary`}
            placeholder="MA_LUAT" value={luat.ma} readOnly={khoaMa} aria-describedby={khoaMa ? `${idThe}-ma-note` : undefined}
            onChange={(e) => onMa(e.target.value)} />
          {khoaMa && <span id={`${idThe}-ma-note`} className="text-muted text-[12px]">Luật đã lưu không đổi được mã</span>}
        </div>
      </div>

      {/* Luật số có thêm ô "Chiều đánh giá": thẻ vừa thì "Trường dữ liệu" chiếm cả hàng, thẻ rộng thì ba ô một hàng. */}
      <div
        className={`rl-fields${laPhanLoai ? ' two' : ''} grid grid-cols-[1fr] gap-3 @min-[340px]/rl-card:grid-cols-[minmax(0,1fr)_84px] @min-[340px]/rl-card:[align-items:end] @min-[340px]/rl-card:[&:not(.two)>.rl-field:first-child]:col-span-full @min-[600px]/rl-card:[&:not(.two)]:grid-cols-[minmax(0,1fr)_170px_84px] @min-[600px]/rl-card:[&:not(.two)>.rl-field:first-child]:col-auto`}
      >
        <div className={FIELD}>
          <label htmlFor={`${idThe}-truong`} className={FIELD_LABEL}>Trường dữ liệu</label>
          <select id={`${idThe}-truong`} className={SELECT} value={luat.truong}
            onChange={(e) => doiTruong(e.target.value)} title={truong ? nhanTruong(truong) : luat.truong}>
            {(Object.keys(NGUON_LABEL) as AiTruong['nguon'][]).map((nguon) => (
              <optgroup key={nguon} label={NGUON_LABEL[nguon]}>
                {danhSachTruong.filter((t) => t.nguon === nguon).map((t) => (
                  <option key={t.ma} value={t.ma}>{nhanTruong(t)}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        {!laPhanLoai && (
          <div className={FIELD}>
            <label htmlFor={`${idThe}-chieu`} className={FIELD_LABEL}>Chiều đánh giá</label>
            <select id={`${idThe}-chieu`} className={SELECT} value={luat.nghich_dao ? 'nghich' : 'thuan'}
              onChange={(e) => doiChieu(e.target.value === 'nghich')}>
              <option value="thuan">Càng cao càng tốt</option>
              <option value="nghich">Càng thấp càng tốt</option>
            </select>
          </div>
        )}
        <div className={FIELD}>
          <label htmlFor={`${idThe}-trong-so`} className={FIELD_LABEL}>Trọng số</label>
          <input id={`${idThe}-trong-so`} type="number" className={`aip-input rl-num ${RULE_FIELD_INPUT} text-right`} min={TRONG_SO_MIN} max={TRONG_SO_MAX}
            step="0.1" value={luat.trong_so} onChange={(e) => onChange({ trong_so: Number(e.target.value) })} />
        </div>
      </div>

      {canXacNhan && (
        <Modal
          title="Đặt lại bậc điểm?"
          subtitle={luat.mo_ta || `Luật #${index + 1}`}
          onClose={() => setCanXacNhan(null)}
          footer={(
            <>
              <button type="button" className="ui-btn ghost" onClick={() => setCanXacNhan(null)}>Giữ nguyên</button>
              <button
                type="button"
                className="ui-btn danger"
                onClick={() => { onChange(canXacNhan.thayDoi); setCanXacNhan(null); }}
              >
                {canXacNhan.nut}
              </button>
            </>
          )}
        >
          <p>{canXacNhan.cauHoi}</p>
        </Modal>
      )}
    </header>
  );
}
