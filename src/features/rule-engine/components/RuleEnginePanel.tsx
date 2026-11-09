import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SearchBox } from '@/components/SearchBox';
import { usePermission } from '@/features/auth';
import { matchesSearch } from '@/utils';
import { useRuleEngine } from '../hooks/useRuleEngine';
import { AiErrorNotice } from './AiErrorNotice';
import { IconEdit, IconPlus } from './icons';
import RuleCard from './RuleCard';
import { DeletedRuleCard } from './DeletedRuleCard';
import { SaveConfirmModal } from './SaveConfirmModal';
import { CARD, CARD_HEAD, CARD_TITLE, HEAD_MAIN, META, META_STRONG } from './styles';

/**
 * Bộ luật chấm điểm rủi ro.
 *
 * Luật là dữ liệu: admin thêm, sửa, xoá, sắp xếp, bật/tắt luật tuỳ ý. Mỗi luật đọc
 * MỘT trường trong danh mục backend công bố, quy đổi ra điểm theo bậc ngưỡng
 * (trường số) hoặc bảng tra (trường phân loại), và có trọng số riêng.
 */
export default function RuleEnginePanel() {
  const re = useRuleEngine();
  // Bộ luật tải hết một lần nên lọc ở client (mã, mô tả luật, tên trường); từ khóa giữ trên URL. Đang sửa thì hiện đủ
  // để không giấu luật đang chỉnh hay luật mới thêm.
  const [searchParams, setSearchParams] = useSearchParams();
  const search = re.editing ? '' : (searchParams.get('q') ?? '').trim();
  const updateSearch = (next: string) => {
    const params = new URLSearchParams(searchParams);
    if (next) params.set('q', next);
    else params.delete('q');
    setSearchParams(params, { replace: true });
  };
  const visible = (index: number) => {
    const luat = re.rules[index];
    return matchesSearch(search, luat.ma, luat.mo_ta, luat.truong, re.danhMuc.get(luat.truong)?.mo_ta);
  };
  const shownCount = search ? re.rules.filter((_, index) => visible(index)).length : re.rules.length;
  // Sửa bộ luật cần quyền Thao tác "Chính sách AI"; chỉ có quyền Xem thì không có nút chỉnh sửa.
  const canEdit = usePermission().canAct('ai-policy');
  const { loiTaiThe, formError } = re;

  // Lưu bị chặn vì một luật sai: cuộn tới thẻ đó (bộ luật dài, câu báo lỗi ở đầu thẻ bộ luật dễ bị khuất) và đưa focus
  // vào ô đầu tiên của thẻ để sửa ngay.
  useEffect(() => {
    if (loiTaiThe == null || !formError) return;
    const the = document.getElementById(`rl-the-${loiTaiThe}`);
    if (!the) return;
    the.scrollIntoView({ block: 'start', behavior: 'smooth' });
    the.querySelector<HTMLElement>('input:not([readonly]), select')?.focus({ preventScroll: true });
  }, [loiTaiThe, formError]);

  const actions = !re.editing ? (
    <button type="button" className="ui-btn ghost" onClick={re.startEditing}>
      <IconEdit />
      Chỉnh sửa luật
    </button>
  ) : (
    <div className="rl-actions flex gap-2 shrink-0">
      <button type="button" className="ui-btn ghost" onClick={re.cancelEditing} disabled={re.saving}>Hủy</button>
      <button type="button" className="ui-btn primary" onClick={re.save} disabled={re.saving}>
        {re.saving ? 'Đang lưu...' : 'Lưu bộ luật'}
      </button>
    </div>
  );

  return (
    // Giảm chuyển động: tắt hẳn chuyển tiếp của mọi phần tử trong bộ luật, kể cả núm công tắc (::after).
    <article
      className={`ui-card aip-card rl-panel ${CARD} motion-reduce:**:[transition:none]! motion-reduce:[&_*::after]:[transition:none]!`}
      aria-labelledby="rlTitle"
    >
      <div className={`aip-card-head ${CARD_HEAD}`}>
        <div className={`aip-head-main ${HEAD_MAIN}`}>
          <h2 id="rlTitle" className={CARD_TITLE}>Bộ luật chấm điểm rủi ro</h2>
          {re.data && (
            <span className={`aip-meta ${META}`} aria-live="polite">
              Đang bật <strong className={META_STRONG}>{re.soLuatBat}/{re.soLuat}</strong> luật
              {re.soLuatBat > 0 && <>, tổng trọng số <strong className={META_STRONG}>{Number(re.tongTrongSo.toFixed(2))}</strong></>}
            </span>
          )}
        </div>
        {re.data && canEdit && actions}
      </div>

      {re.loadError ? (
        <div className="rl-state pt-3 px-4 pb-0"><AiErrorNotice error={re.loadError} onRetry={re.refetch} /></div>
      ) : re.isLoading || !re.data ? (
        <div className="ui-empty" aria-busy="true">Đang tải bộ luật chấm điểm...</div>
      ) : (
        <>
          <p className="rl-note py-2.5 px-4 border-b border-b-line bg-surface-muted text-secondary text-[13px] leading-normal">
            Mỗi luật đọc một trường của hồ sơ và cho tối đa {re.diemToiDa} điểm. Điểm tổng quy về thang 100 theo trọng
            số các luật đang bật, nên thêm, bớt hay tắt luật không làm lệch thang. Khi hồ sơ thiếu dữ liệu, luật dùng
            "điểm khi thiếu dữ liệu": nên đặt ở mức trung tính, vì không tra được thông tin là sự cố hệ thống, không
            phải bằng chứng người vay rủi ro.
          </p>

          {!re.editing && re.rules.length > 0 && (
            <div className="rl-toolbar flex justify-end py-2.5 px-4 border-b border-b-line">
              <SearchBox
                className="rl-search w-72 max-[760px]:w-full"
                value={search}
                onSearch={updateSearch}
                label="Tìm luật chấm điểm"
                placeholder="Tìm theo mô tả luật hoặc trường dữ liệu"
              />
            </div>
          )}

          {(re.formError || re.conflict) && (
            <div className="rl-state pt-3 px-4 pb-0">
              {re.formError
                ? <div className="ui-alert" role="alert">{re.formError}</div>
                : <div className="ui-alert aip-conflict" role="alert">
                  <div>
                    Chính sách vừa được người khác lưu nên chưa lưu được thay đổi của bạn.
                    <small>Tải bản mới để xem họ đã đổi gì, rồi sửa lại.</small>
                  </div>
                  <button type="button" className="ui-btn soft" onClick={re.reloadLatest}>Tải bản mới</button>
                </div>}
            </div>
          )}

          {/* Lưới thẻ luật: một cột trên màn hẹp, nhiều cột khi đủ rộng (thẻ đang sửa cần rộng hơn). Viền giữa các
              thẻ là viền phải/dưới của từng thẻ; lề âm giấu viền ở mép thẻ cha. */}
          <div
            className={`rl-list${re.editing ? ' editing' : ''} [--rl-col-min:320px] [&.editing]:[--rl-col-min:420px] grid grid-cols-[repeat(auto-fit,minmax(min(var(--rl-col-min),100%),1fr))] -mr-px -mb-px`}
          >
            {re.rules.length === 0 && !re.editing && (
              <p className="rl-empty col-span-full py-6 px-4 text-secondary text-[13px] text-center">
                Chưa có luật nào. Bấm "Chỉnh sửa luật" để thêm.
              </p>
            )}
            {search && shownCount === 0 && (
              <p className="rl-empty col-span-full py-6 px-4 text-secondary text-[13px] text-center">
                Không tìm thấy luật khớp "{search}".
              </p>
            )}
            {re.rules.map((luat, i) => (!visible(i) ? null : re.meta[i]?.daXoa ? (
              <DeletedRuleCard key={i} ten={luat.mo_ta} onUndo={() => re.hoanTacXoa(i)} />
            ) : (
              <RuleCard
                // Khi sửa, thẻ mới có mã rỗng và mã có thể trùng tạm thời nên dùng chỉ số làm key.
                key={re.editing ? i : luat.ma}
                luat={luat}
                index={i}
                total={re.rules.length}
                editing={re.editing}
                truong={re.danhMuc.get(luat.truong)}
                danhSachTruong={re.danhSachTruong}
                diemToiDa={re.diemToiDa}
                mocVoCuc={re.mocVoCuc}
                tyTrong={luat.bat && re.tongTrongSo > 0 ? Math.round((luat.trong_so / re.tongTrongSo) * 100) : 0}
                khoaMa={re.editing && !re.meta[i]?.moi}
                coLoi={re.loiTaiThe === i}
                onChange={(thayDoi) => re.sua(i, thayDoi)}
                onMoTa={(moTa) => re.suaMoTa(i, moTa)}
                onMa={(ma) => re.suaMa(i, ma)}
                onXoa={() => re.xoaLuat(i)}
                onDiChuyen={(huong) => re.diChuyen(i, huong)}
              />
            )))}
            {re.editing && (
              <button
                type="button"
                className="rl-add flex flex-col items-center justify-center gap-1 min-h-30 py-6 px-4 border-r border-b border-r-line border-b-line [outline:1px_dashed_var(--color-line-strong)] -outline-offset-8 bg-white text-brand text-[13px] font-medium hover:bg-brand-50 focus-visible:[outline:2px_solid_var(--color-brand)] focus-visible:-outline-offset-4 [&_svg]:size-4.5"
                onClick={re.themLuat}
              >
                <IconPlus />
                <span>Thêm luật</span>
                <small className="text-muted text-[12px] font-normal">Chọn trường dữ liệu và đặt bậc điểm</small>
              </button>
            )}
          </div>
        </>
      )}

      {re.pending && (
        <SaveConfirmModal
          title="Lưu bộ luật chấm điểm"
          phienBan={re.phienBan}
          changes={re.pending}
          saving={re.saving}
          onConfirm={re.confirmSave}
          onClose={re.closeConfirm}
        />
      )}
    </article>
  );
}
