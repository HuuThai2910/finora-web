import { useState } from 'react';
import { useExplainCreditMutation } from '../api/creditScoreApi';
import { HO_SO_MAC_DINH } from '../constant';
import type { CreditScoreRequest } from '../types';

/**
 * Hook quản lý form nhập liệu hồ sơ và thao tác gọi giải thích điểm tín dụng (TreeSHAP + Rule Trace).
 */
export function useCreditScoring(khoiTao: CreditScoreRequest = HO_SO_MAC_DINH) {
  const [form, setForm] = useState<CreditScoreRequest>(khoiTao);
  // Mặc định hiện bản người vay đọc được; số SHAP thô chỉ bật khi cần đối chứng.
  const [hienKyThuat, setHienKyThuat] = useState(false);
  const [explain, { data: kq, isLoading, error }] = useExplainCreditMutation();

  function dat<K extends keyof CreditScoreRequest>(
    khoa: K,
    giaTri: CreditScoreRequest[K],
  ) {
    setForm((truoc) => ({ ...truoc, [khoa]: giaTri }));
  }

  /** Ô số để trống nghĩa là "không khai", phải gửi undefined chứ không phải 0. */
  function datSo(khoa: keyof CreditScoreRequest, raw: string) {
    dat(khoa, (raw === "" ? undefined : Number(raw)) as never);
  }

  function chonKichBan(ghiDe: Partial<CreditScoreRequest>) {
    const hoSo = { ...HO_SO_MAC_DINH, ...ghiDe };
    setForm(hoSo);
    explain(hoSo);
  }

  function chamDiem() {
    explain(form);
  }

  const g = kq?.giai_thich_mo_hinh;
  const maxDongGop = g
    ? Math.max(
        ...[...g.yeu_to_bat_loi, ...g.yeu_to_co_loi].map((y) =>
          Math.abs(y.muc_dong_gop),
        ),
        0,
      )
    : 0;

  return {
    form,
    hienKyThuat,
    setHienKyThuat,
    kq,
    isLoading,
    error,
    dat,
    datSo,
    chonKichBan,
    chamDiem,
    g,
    maxDongGop,
  };
}
