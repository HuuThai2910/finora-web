import { useCallback, useState } from 'react';
import { useGetAiRulesQuery, useUpdateAiRulesMutation } from '../api/ruleEngineApi';
import { kiemTra, luatMoi, saoChep, sinhMa } from '../schemas/ruleEngineForm';
import type { AiRule } from '../types';

/** Mặc định khi backend chưa trả: trùng `DIEM_TOI_DA_MOI_LUAT` và `NGUONG_VO_CUC` của finora-ai. */
const DIEM_TOI_DA_MAC_DINH = 20;
const MOC_VO_CUC_MAC_DINH = 1_000_000_000;

/**
 * Điều phối việc xem và sửa bộ luật chấm điểm.
 *
 * Bản nháp `form` chỉ có khi đang sửa, chép sâu từ cache lúc bấm "Chỉnh sửa luật".
 * PUT thay TOÀN BỘ danh sách luật theo thứ tự gửi lên và backend kiểm nguyên tử,
 * nên gửi lại sau lỗi không gây ghi một nửa. Nút lưu khóa trong lúc gửi.
 */
export function useRuleEngine() {
  const query = useGetAiRulesQuery();
  const [updateRules, { isLoading: saving }] = useUpdateAiRulesMutation();
  const data = query.data;

  const [form, setForm] = useState<AiRule[] | null>(null);
  // Chỉ số các luật vừa thêm trong phiên sửa này: mã còn tự sinh theo mô tả cho tới
  // khi admin sửa tay. Luật đã lưu thì mã cố định vì nó nằm trong rule_trace của
  // các quyết định lịch sử.
  const [maTuSinh, setMaTuSinh] = useState<Set<number>>(new Set());
  const [formError, setFormError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const editing = form !== null;
  const rules = form ?? data?.rules ?? [];
  const danhSachTruong = data?.truong ?? [];
  const diemToiDa = data?.diem_toi_da_moi_luat ?? DIEM_TOI_DA_MAC_DINH;
  const mocVoCuc = data?.nguong_vo_cuc ?? MOC_VO_CUC_MAC_DINH;
  const danhMuc = new Map(danhSachTruong.map(t => [t.ma, t]));
  const soLuatBat = rules.filter(r => r.bat).length;
  const tongTrongSo = rules.filter(r => r.bat).reduce((s, r) => s + r.trong_so, 0);

  function resetPhien(next: AiRule[] | null) {
    setForm(next);
    setMaTuSinh(new Set());
    setFormError(null);
    setSaveError(null);
  }

  const startEditing = () => { if (data) resetPhien(saoChep(data.rules)); };
  const cancelEditing = () => resetPhien(null);

  async function save() {
    if (!form || saving) return;
    const loi = kiemTra(form, danhMuc, diemToiDa);
    setFormError(loi || null);
    setSaveError(null);
    if (loi) return;
    try {
      await updateRules({ rules: form }).unwrap();
      resetPhien(null);
      setNotice('Đã lưu bộ luật chấm điểm.');
    } catch (err: unknown) {
      setSaveError(err);
    }
  }

  function sua(i: number, thayDoi: Partial<AiRule>) {
    setForm(prev => prev && prev.map((r, j) => (j === i ? { ...r, ...thayDoi } : r)));
  }

  function suaMoTa(i: number, moTa: string) {
    sua(i, maTuSinh.has(i) ? { mo_ta: moTa, ma: sinhMa(moTa) } : { mo_ta: moTa });
  }

  function suaMa(i: number, ma: string) {
    setMaTuSinh(prev => {
      const s = new Set(prev);
      s.delete(i);
      return s;
    });
    sua(i, { ma: ma.toUpperCase() });
  }

  function themLuat() {
    const truongDau = danhSachTruong[0];
    if (!truongDau || !form) return;
    setMaTuSinh(prev => new Set(prev).add(form.length));
    setForm([...form, luatMoi(truongDau, mocVoCuc)]);
  }

  function xoaLuat(i: number) {
    setForm(prev => prev && prev.filter((_, j) => j !== i));
    // Dồn chỉ số các luật phía sau lên một bậc để cờ "mã tự sinh" không lệch thẻ.
    setMaTuSinh(prev => new Set([...prev].filter(j => j !== i).map(j => (j > i ? j - 1 : j))));
  }

  function diChuyen(i: number, huong: -1 | 1) {
    const j = i + huong;
    if (!form || j < 0 || j >= form.length) return;
    const next = [...form];
    [next[i], next[j]] = [next[j], next[i]];
    setForm(next);
    setMaTuSinh(prev => new Set([...prev].map(k => (k === i ? j : k === j ? i : k))));
  }

  return {
    data,
    isLoading: query.isLoading,
    loadError: query.error,
    refetch: query.refetch,
    saving,
    editing,
    rules,
    danhMuc,
    danhSachTruong,
    diemToiDa,
    mocVoCuc,
    soLuatBat,
    tongTrongSo,
    formError,
    saveError,
    notice,
    dismissNotice,
    startEditing,
    cancelEditing,
    save,
    sua,
    suaMoTa,
    suaMa,
    themLuat,
    xoaLuat,
    diChuyen,
  };
}
