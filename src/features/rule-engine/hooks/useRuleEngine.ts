import { useState, useEffect, useCallback } from 'react';
import { useGetAiRulesQuery, useUpdateAiRulesMutation } from '../api/ruleEngineApi';
import type { AiRule } from '../types';
import { kiemTra, luatMoi, saoChep, sinhMa } from '../component/ruleEngineForm';

/**
 * Hook điều phối state và thao tác chỉnh sửa bộ luật chấm điểm của Rule Engine (D4).
 */
export function useRuleEngine() {
  const { data, isLoading, error } = useGetAiRulesQuery();
  const [updateRules, { isLoading: saving }] = useUpdateAiRulesMutation();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<AiRule[]>([]);
  // Chỉ số các luật vừa thêm trong phiên sửa này: mã còn tự sinh theo mô tả cho
  // tới khi admin sửa tay. Luật đã lưu thì mã cố định — nó nằm trong rule_trace
  // của các quyết định lịch sử.
  const [maTuSinh, setMaTuSinh] = useState<Set<number>>(new Set());
  const [formError, setFormError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (data) setForm(saoChep(data.rules));
  }, [data]);

  const startEditing = useCallback(() => {
    if (data) setForm(saoChep(data.rules));
    setMaTuSinh(new Set());
    setFormError('');
    setEditing(true);
  }, [data]);

  const cancelEditing = useCallback(() => {
    if (data) setForm(saoChep(data.rules));
    setMaTuSinh(new Set());
    setFormError('');
    setEditing(false);
  }, [data]);

  const danhSachTruong = data?.truong ?? [];
  const diemToiDa = data?.diem_toi_da_moi_luat ?? 20;
  const mocVoCuc = data?.nguong_vo_cuc ?? 1000000000;
  const danhMuc = new Map(danhSachTruong.map(t => [t.ma, t]));
  const luatBat = form.filter(r => r.bat);
  const tongTrongSo = luatBat.reduce((s, r) => s + r.trong_so, 0);

  async function handleSave() {
    const loi = kiemTra(form, danhMuc, diemToiDa);
    if (loi) {
      setFormError(loi);
      return false;
    }
    setFormError('');
    try {
      await updateRules({ rules: form }).unwrap();
      setEditing(false);
      setMaTuSinh(new Set());
      setSuccessMsg('Cập nhật bộ luật chấm điểm thành công.');
      setTimeout(() => setSuccessMsg(''), 4000);
      return true;
    } catch (err: unknown) {
      const detail =
        err && typeof err === 'object' && 'data' in err
          ? (err as { data?: { detail?: unknown } }).data?.detail
          : undefined;
      setFormError(typeof detail === 'string' ? detail : 'Lưu cấu hình luật thất bại.');
      return false;
    }
  }

  function sua(i: number, thayDoi: Partial<AiRule>) {
    setForm(prev => prev.map((r, j) => (j === i ? { ...r, ...thayDoi } : r)));
  }

  function suaMoTa(i: number, moTa: string) {
    const thayDoi: Partial<AiRule> = { mo_ta: moTa };
    if (maTuSinh.has(i)) thayDoi.ma = sinhMa(moTa);
    sua(i, thayDoi);
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
    if (!truongDau) return;
    setMaTuSinh(prev => new Set(prev).add(form.length));
    setForm(prev => [...prev, luatMoi(truongDau, mocVoCuc)]);
  }

  function xoaLuat(i: number) {
    setForm(prev => prev.filter((_, j) => j !== i));
    // Dồn chỉ số các luật phía sau lên một bậc để cờ "mã tự sinh" không lệch thẻ.
    setMaTuSinh(prev => {
      const s = new Set<number>();
      for (const j of prev) {
        if (j < i) s.add(j);
        else if (j > i) s.add(j - 1);
      }
      return s;
    });
  }

  function diChuyen(i: number, huong: -1 | 1) {
    const j = i + huong;
    if (j < 0 || j >= form.length) return;
    setForm(prev => {
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
    setMaTuSinh(prev => {
      const s = new Set<number>();
      for (const k of prev) s.add(k === i ? j : k === j ? i : k);
      return s;
    });
  }

  return {
    data,
    isLoading,
    error,
    saving,
    editing,
    form,
    danhMuc,
    danhSachTruong,
    diemToiDa,
    mocVoCuc,
    luatBat,
    tongTrongSo,
    formError,
    successMsg,
    startEditing,
    cancelEditing,
    handleSave,
    sua,
    suaMoTa,
    suaMa,
    themLuat,
    xoaLuat,
    diChuyen,
  };
}
