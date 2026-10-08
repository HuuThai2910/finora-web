import { useState } from 'react';
import { useExplainCreditMutation } from '../api/creditScoreApi';
import { HO_SO_MAC_DINH } from '../constants';
import { kiemTraHoSo, type LoiHoSo, type TruongChu, type TruongSo } from '../schemas/scoringForm';
import type { CreditScoreRequest } from '../types';

/**
 * Form hồ sơ giả định và lời gọi chấm điểm kèm giải thích.
 *
 * Không lưu gì: màn hình là công cụ thử phản ứng của mô hình và bộ luật. Ô số để
 * trống nghĩa là "không khai" và phải gửi `undefined` (backend điền median), không
 * phải 0. Nút chấm bị khóa trong lúc gọi nên không gửi trùng.
 */
export function useCreditScoring() {
  const [form, setForm] = useState<CreditScoreRequest>(HO_SO_MAC_DINH);
  const [loi, setLoi] = useState<LoiHoSo>({});
  // Hồ sơ của kết quả đang hiện: chú thích cuối trang đọc từ đây, không từ form đang sửa.
  const [hoSoDaCham, setHoSoDaCham] = useState<CreditScoreRequest | null>(null);
  // Mặc định hiện bản đọc được; số SHAP thô chỉ mở khi cần đối chứng mô hình.
  const [hienKyThuat, setHienKyThuat] = useState(false);
  const [explain, { data: ketQua, isLoading, error }] = useExplainCreditMutation();

  function datSo(khoa: TruongSo, raw: string) {
    setForm((truoc) => ({ ...truoc, [khoa]: raw === '' ? undefined : Number(raw) }));
  }

  function datChu(khoa: TruongChu, value: string) {
    setForm((truoc) => ({ ...truoc, [khoa]: value || undefined }));
  }

  function gui(hoSo: CreditScoreRequest) {
    const loiMoi = kiemTraHoSo(hoSo);
    setLoi(loiMoi);
    if (isLoading || Object.keys(loiMoi).length > 0) return;
    setHoSoDaCham(hoSo);
    // Lỗi được giữ trong state của mutation và hiển thị ở khung kết quả.
    void explain(hoSo);
  }

  function chonKichBan(ghiDe: Partial<CreditScoreRequest>) {
    const hoSo = { ...HO_SO_MAC_DINH, ...ghiDe };
    setForm(hoSo);
    gui(hoSo);
  }

  return {
    form,
    loi,
    datSo,
    datChu,
    chamDiem: () => gui(form),
    chonKichBan,
    ketQua,
    hoSoDaCham,
    isLoading,
    error,
    hienKyThuat,
    doiKyThuat: () => setHienKyThuat((v) => !v),
  };
}
