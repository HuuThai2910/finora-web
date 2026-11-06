import { useState } from 'react';
import { toast } from '@/lib/toast';
import { isPolicyConflict, toAiUiError } from '../mappers/aiApiError';
import { useGetAiRulesQuery, useUpdateAiRulesMutation } from '../api/ruleEngineApi';
import { nhanPhienBan } from '../mappers/policyDisplay';
import type { ThayDoi } from '../mappers/policyDiff';
import { diffBoLuat } from '../mappers/ruleDiff';
import { kiemTraChiTiet, luatMoi, saoChep, sinhMa } from '../schemas/ruleEngineForm';
import type { AiRule } from '../types';

/** Mặc định khi backend chưa trả: trùng `DIEM_TOI_DA_MOI_LUAT` và `NGUONG_VO_CUC` của finora-ai. */
const DIEM_TOI_DA_MAC_DINH = 20;
const MOC_VO_CUC_MAC_DINH = 1_000_000_000;

/**
 * Trạng thái phụ của một dòng trong phiên sửa, đi cùng luật ở cùng vị trí:
 * - `moi`: luật thêm trong phiên này. Luật đã lưu thì mã bị khóa vì mã nằm trong rule_trace của các quyết định lịch sử.
 * - `maTuSinh`: mã còn tự sinh theo mô tả, tới khi admin sửa tay.
 * - `daXoa`: đã bấm xóa nhưng còn hoàn tác được; luật chỉ thật sự bỏ khi lưu.
 */
export interface DongLuat {
  moi: boolean;
  maTuSinh: boolean;
  daXoa: boolean;
}

interface Phien {
  rules: AiRule[];
  meta: DongLuat[];
}

/**
 * Điều phối việc xem và sửa bộ luật chấm điểm.
 *
 * Bản nháp chỉ có khi đang sửa, chép sâu từ cache lúc bấm "Chỉnh sửa luật". "Lưu bộ luật" kiểm tra tại chỗ (lỗi thì
 * trả vị trí luật để giao diện cuộn tới thẻ đó), rồi mở bước xác nhận liệt kê thay đổi; xác nhận mới PUT. PUT thay TOÀN
 * BỘ danh sách luật theo thứ tự gửi lên và backend kiểm nguyên tử, nên gửi lại sau lỗi không gây ghi một nửa. Nút lưu
 * khóa trong lúc gửi.
 */
export function useRuleEngine() {
  const query = useGetAiRulesQuery();
  const [updateRules, { isLoading: saving }] = useUpdateAiRulesMutation();
  const data = query.data;

  const [phien, setPhien] = useState<Phien | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  // Vị trí (trong danh sách đang hiển thị) của thẻ luật gây lỗi kiểm tra; giao diện tô viền và cuộn tới thẻ này.
  const [loiTaiThe, setLoiTaiThe] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  // Người khác vừa lưu bộ luật/chính sách: phải tải bản mới trước khi lưu tiếp.
  const [conflict, setConflict] = useState(false);
  const setNotice = (message: string | null) => { if (message) toast.info(message); };
  const [pending, setPending] = useState<ThayDoi[] | null>(null);

  const editing = phien !== null;
  const rules = phien?.rules ?? data?.rules ?? [];
  const meta = phien?.meta ?? [];
  const danhSachTruong = data?.truong ?? [];
  const diemToiDa = data?.diem_toi_da_moi_luat ?? DIEM_TOI_DA_MAC_DINH;
  const mocVoCuc = data?.nguong_vo_cuc ?? MOC_VO_CUC_MAC_DINH;
  const danhMuc = new Map(danhSachTruong.map(t => [t.ma, t]));
  // Luật sẽ được gửi khi lưu: bỏ các thẻ đang chờ hoàn tác xóa.
  const conLai = rules.filter((_, i) => !meta[i]?.daXoa);
  const soLuatBat = conLai.filter(r => r.bat).length;
  const tongTrongSo = conLai.filter(r => r.bat).reduce((s, r) => s + r.trong_so, 0);

  function resetPhien(next: Phien | null) {
    setPhien(next);
    setFormError(null);
    setLoiTaiThe(null);
    setSaveError(null);
    setPending(null);
  }

  const startEditing = () => {
    if (data) resetPhien({ rules: saoChep(data.rules), meta: data.rules.map(() => ({ moi: false, maTuSinh: false, daXoa: false })) });
  };
  const cancelEditing = () => resetPhien(null);

  function save() {
    if (!phien || !data || saving) return;
    const giuLai = phien.rules.map((_, i) => i).filter(i => !phien.meta[i].daXoa);
    const loi = kiemTraChiTiet(giuLai.map(i => phien.rules[i]), danhMuc, diemToiDa);
    setFormError(loi?.message ?? null);
    // Vị trí lỗi tính trên danh sách đã bỏ thẻ xóa; đổi về vị trí thẻ đang hiển thị.
    setLoiTaiThe(loi?.index != null ? giuLai[loi.index] : null);
    setSaveError(null);
    if (loi) return;
    const changes = diffBoLuat(data.rules, conLai, danhMuc, mocVoCuc);
    if (changes.length === 0) {
      resetPhien(null);
      setNotice('Không có thay đổi nào để lưu.');
      return;
    }
    setPending(changes);
  }

  async function confirmSave() {
    if (!phien || saving) return;
    try {
      const saved = await updateRules({ rules: conLai, expected_version: data?.decision_policy_version }).unwrap();
      resetPhien(null);
      const version = nhanPhienBan(saved.decision_policy_version);
      toast.success(version
        ? `Đã lưu bộ luật. Hồ sơ chấm điểm từ giờ theo chính sách tín dụng ${version}.`
        : 'Đã lưu bộ luật chấm điểm.');
    } catch (err: unknown) {
      // Đóng hộp xác nhận; bản nháp còn nguyên. Xung đột phiên bản hiện cảnh báo trong thẻ kèm nút tải lại.
      setPending(null);
      if (isPolicyConflict(err)) {
        setConflict(true);
        return;
      }
      toast.error(toAiUiError(err));
    }
  }

  const capNhat = (fn: (p: Phien) => Phien) => setPhien(prev => prev && fn(prev));
  const suaMeta = (i: number, thayDoi: Partial<DongLuat>) =>
    capNhat(p => ({ ...p, meta: p.meta.map((m, j) => (j === i ? { ...m, ...thayDoi } : m)) }));

  function sua(i: number, thayDoi: Partial<AiRule>) {
    capNhat(p => ({ ...p, rules: p.rules.map((r, j) => (j === i ? { ...r, ...thayDoi } : r)) }));
  }

  function suaMoTa(i: number, moTa: string) {
    sua(i, meta[i]?.maTuSinh ? { mo_ta: moTa, ma: sinhMa(moTa) } : { mo_ta: moTa });
  }

  /** Chỉ luật mới được đổi mã (ô mã của luật đã lưu bị khóa); sửa tay thì thôi tự sinh. */
  function suaMa(i: number, ma: string) {
    if (!meta[i]?.moi) return;
    suaMeta(i, { maTuSinh: false });
    sua(i, { ma: ma.toUpperCase() });
  }

  function themLuat() {
    const truongDau = danhSachTruong[0];
    if (!truongDau) return;
    capNhat(p => ({
      rules: [...p.rules, luatMoi(truongDau, mocVoCuc)],
      meta: [...p.meta, { moi: true, maTuSinh: true, daXoa: false }],
    }));
  }

  /**
   * Luật mới thêm (chưa từng lưu) thì bỏ hẳn; luật đã lưu thì chỉ đánh dấu xóa để còn "Hoàn tác" cho tới khi lưu
   * hoặc hủy phiên sửa.
   */
  function xoaLuat(i: number) {
    if (meta[i]?.moi) {
      capNhat(p => ({ rules: p.rules.filter((_, j) => j !== i), meta: p.meta.filter((_, j) => j !== i) }));
    } else {
      suaMeta(i, { daXoa: true });
    }
    setLoiTaiThe(null);
  }

  const hoanTacXoa = (i: number) => suaMeta(i, { daXoa: false });

  function diChuyen(i: number, huong: -1 | 1) {
    const j = i + huong;
    if (!phien || j < 0 || j >= phien.rules.length) return;
    const doi = <T,>(list: T[]) => {
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    };
    capNhat(p => ({ rules: doi(p.rules), meta: doi(p.meta) }));
    setLoiTaiThe(null);
  }

  return {
    data,
    phienBan: nhanPhienBan(data?.decision_policy_version),
    isLoading: query.isLoading,
    loadError: query.error,
    refetch: query.refetch,
    saving,
    editing,
    rules,
    meta,
    danhMuc,
    danhSachTruong,
    diemToiDa,
    mocVoCuc,
    soLuatBat,
    soLuat: conLai.length,
    tongTrongSo,
    formError,
    loiTaiThe,
    saveError,
    conflict,
    /** Bỏ bản nháp, đọc bộ luật mới nhất (sau khi người khác vừa lưu). */
    reloadLatest: () => {
      setConflict(false);
      resetPhien(null);
      void query.refetch();
    },
    pending,
    closeConfirm: () => setPending(null),
    startEditing,
    cancelEditing,
    save,
    confirmSave,
    sua,
    suaMoTa,
    suaMa,
    themLuat,
    xoaLuat,
    hoanTacXoa,
    diChuyen,
  };
}
