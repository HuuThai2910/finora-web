import type { AiRule, AiTruong, RuleBac } from '../types';

/**
 * Hằng số, hàm dựng luật mặc định và kiểm tra tại chỗ cho bảng cấu hình luật.
 *
 * Tách khỏi component để test được bằng hàm thuần và để `RuleEnginePanel` chỉ
 * còn điều phối state. Mọi ràng buộc ở đây PHẢI trùng với backend
 * (`finora-ai/app/api/config_router.py`): UI chỉ báo sớm, backend mới là nơi
 * quyết định — nếu hai bên lệch nhau thì hoặc UI chặn oan, hoặc UI cho qua rồi
 * backend trả 422.
 */

export const NGUON_LABEL: Record<AiTruong['nguon'], string> = {
  ho_so: 'Hồ sơ tự khai',
  cic: 'Dữ liệu CIC',
  fineract: 'Sản phẩm vay',
  dan_xuat: 'Chỉ số dẫn xuất',
};

/** Nhãn tiếng Việt cho giá trị phân loại; giá trị chưa có nhãn hiện mã gốc. */
export const GIA_TRI_LABEL: Record<string, string> = {
  OWN: 'Sở hữu riêng',
  MORTGAGE: 'Đang thế chấp',
  RENT: 'Thuê',
  OTHER: 'Khác',
  debt_consolidation: 'Đảo nợ',
  credit_card: 'Thẻ tín dụng',
  home_improvement: 'Sửa nhà',
  major_purchase: 'Mua sắm lớn',
  medical: 'Y tế',
  car: 'Mua xe',
  small_business: 'Kinh doanh nhỏ',
  moving: 'Chuyển nhà',
  vacation: 'Du lịch',
  education: 'Học tập',
  other: 'Khác',
  Verified: 'Đã xác minh',
  'Source Verified': 'Xác minh qua nguồn',
  'Not Verified': 'Chưa xác minh',
};

export const MAU_MA_LUAT = /^[A-Z][A-Z0-9_]{2,63}$/;
export const TRONG_SO_MIN = 0.1;
export const TRONG_SO_MAX = 10;
export const GOI_Y_MAX = 300;

/** Ngưỡng cuối cùng biểu diễn "mọi giá trị còn lại" — không hiển thị dạng số. */
export function laNguongVoCuc(nguong: number, moc: number) {
  return nguong >= moc;
}

export function dinhDangNguong(nguong: number, moc: number, nghichDao: boolean) {
  if (laNguongVoCuc(nguong, moc)) return 'còn lại';
  return `${nghichDao ? '≤' : '≥'} ${nguong}`;
}

/** Đơn vị hiển thị ở cột ngưỡng; trường 0–1 nói rõ là tỷ lệ để khỏi nhập 20 thay vì 0.2. */
export function donViNguong(truong: AiTruong | undefined): string {
  if (!truong) return '';
  if (truong.la_ty_le) return 'tỷ lệ 0–1';
  return truong.don_vi;
}

/** Sinh mã luật từ mô tả: bỏ dấu, viết hoa, gạch dưới. "Tuổi người vay" → TUOI_NGUOI_VAY. */
export function sinhMa(moTa: string): string {
  const khongDau = moTa
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
  let ma = khongDau.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  if (!/^[A-Z]/.test(ma)) ma = `LUAT_${ma}`;
  return ma.slice(0, 64);
}

export function bacMacDinh(nghichDao: boolean, mocVoCuc: number): RuleBac[] {
  // Bậc đầu là bậc tốt nhất (20 điểm). Luật nghịch đảo kết bằng "còn lại".
  return nghichDao ? [[1, 20], [mocVoCuc, 0]] : [[1, 20], [0, 0]];
}

export function bangDiemMacDinh(truong: AiTruong): Record<string, number> {
  // Mọi giá trị 20 để qua ràng buộc "loại tốt nhất = 20"; admin hạ dần từng loại.
  return Object.fromEntries(truong.gia_tri_hop_le.map(k => [k, 20]));
}

/** Luật trống khi bấm "Thêm luật" — chọn trường đầu tiên trong danh mục. */
export function luatMoi(truong: AiTruong, mocVoCuc: number): AiRule {
  return {
    ma: '',
    mo_ta: '',
    truong: truong.ma,
    nghich_dao: false,
    trong_so: 1,
    bat: true,
    diem_khi_thieu: 10,
    bac: truong.kieu === 'so' ? bacMacDinh(false, mocVoCuc) : null,
    bang_diem: truong.kieu === 'phan_loai' ? bangDiemMacDinh(truong) : null,
    goi_y: null,
  };
}

/** Bản sao sâu để form sửa không đụng cache RTK Query. */
export function saoChep(rules: AiRule[]): AiRule[] {
  return rules.map(r => ({
    ...r,
    bac: r.bac ? r.bac.map(b => [...b] as RuleBac) : null,
    bang_diem: r.bang_diem ? { ...r.bang_diem } : null,
  }));
}

function kiemTraBangDiem(ten: string, r: AiRule, truong: AiTruong, diemToiDa: number): string {
  const bang = r.bang_diem ?? {};
  const khoa = Object.keys(bang);
  if (khoa.length !== truong.gia_tri_hop_le.length || !truong.gia_tri_hop_le.every(k => k in bang)) {
    return `${ten}: bảng điểm phải có đúng các loại ${truong.gia_tri_hop_le.join(', ')}.`;
  }
  const diem = Object.values(bang);
  if (diem.some(d => d < 0 || d > diemToiDa)) {
    return `${ten}: điểm phải trong khoảng 0–${diemToiDa}.`;
  }
  if (Math.max(...diem) !== diemToiDa) {
    return `${ten}: loại tốt nhất phải đạt đúng ${diemToiDa} điểm — luật nặng nhẹ khác nhau thì dùng trọng số.`;
  }
  return '';
}

function kiemTraBac(ten: string, r: AiRule, diemToiDa: number): string {
  const bac = r.bac ?? [];
  if (bac.length < 2) return `${ten}: cần ít nhất 2 bậc điểm.`;
  const diem = bac.map(b => b[1]);
  if (diem.some(d => d < 0 || d > diemToiDa)) {
    return `${ten}: điểm mỗi bậc phải trong khoảng 0–${diemToiDa}.`;
  }
  if (Math.max(...diem) !== diemToiDa) {
    return `${ten}: bậc tốt nhất phải đạt đúng ${diemToiDa} điểm — luật nặng nhẹ khác nhau thì dùng trọng số.`;
  }
  for (let i = 1; i < diem.length; i++) {
    if (diem[i] > diem[i - 1]) return `${ten}: điểm phải giảm dần — bậc đầu là bậc tốt nhất.`;
  }
  const nguong = bac.map(b => b[0]);
  for (let i = 1; i < nguong.length; i++) {
    if (nguong[i] === nguong[i - 1]) {
      return `${ten}: các bậc không được trùng ngưỡng nhau (bậc ${i} và ${i + 1} đều là ${nguong[i]}).`;
    }
    const sai = r.nghich_dao ? nguong[i] < nguong[i - 1] : nguong[i] > nguong[i - 1];
    if (sai) return `${ten}: ngưỡng phải ${r.nghich_dao ? 'tăng' : 'giảm'} dần theo thứ tự bậc.`;
  }
  return '';
}

/** Kiểm tra tại chỗ, cùng bộ luật với backend. Trả về thông báo lỗi đầu tiên hoặc ''. */
export function kiemTra(rules: AiRule[], danhMuc: Map<string, AiTruong>, diemToiDa: number): string {
  if (rules.length === 0) return 'Phải có ít nhất một luật.';
  if (!rules.some(r => r.bat)) {
    return 'Phải bật ít nhất một luật, nếu không hệ thống không còn cơ sở chấm điểm.';
  }

  const daThay = new Set<string>();
  for (const [i, r] of rules.entries()) {
    const ten = r.mo_ta.trim() || `Luật #${i + 1}`;

    if (!r.mo_ta.trim()) return `Luật #${i + 1}: chưa có mô tả.`;
    if (!MAU_MA_LUAT.test(r.ma)) {
      return `${ten}: mã luật phải là chữ hoa, số, gạch dưới, bắt đầu bằng chữ, 3–64 ký tự.`;
    }
    if (daThay.has(r.ma)) return `Mã luật ${r.ma} bị trùng.`;
    daThay.add(r.ma);

    const truong = danhMuc.get(r.truong);
    if (!truong) return `${ten}: trường "${r.truong}" không có trong danh mục.`;

    if (r.trong_so < TRONG_SO_MIN || r.trong_so > TRONG_SO_MAX) {
      return `${ten}: trọng số phải trong khoảng ${TRONG_SO_MIN}–${TRONG_SO_MAX}.`;
    }
    if (r.diem_khi_thieu < 0 || r.diem_khi_thieu > diemToiDa) {
      return `${ten}: điểm khi thiếu dữ liệu phải trong khoảng 0–${diemToiDa}.`;
    }
    if (r.goi_y) {
      if (r.goi_y.length > GOI_Y_MAX) return `${ten}: gợi ý tối đa ${GOI_Y_MAX} ký tự.`;
      const la = [...r.goi_y.matchAll(/\{([^{}]*)\}/g)].map(m => m[1]).filter(x => x !== 'moc');
      if (la.length) return `${ten}: gợi ý chỉ được dùng chỗ trống {moc}, không hiểu {${la[0]}}.`;
    }

    const loi = truong.kieu === 'phan_loai'
      ? kiemTraBangDiem(ten, r, truong, diemToiDa)
      : kiemTraBac(ten, r, diemToiDa);
    if (loi) return loi;
  }
  return '';
}
