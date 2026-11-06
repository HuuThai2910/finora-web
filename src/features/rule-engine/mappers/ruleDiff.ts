import { GIA_TRI_LABEL } from '../constants';
import { dinhDangNguong } from '../schemas/ruleEngineForm';
import type { AiRule, AiTruong } from '../types';
import type { ThayDoi } from './policyDiff';

const GOI_Y_TU_GHEP = 'tự ghép từ mô tả luật';

const cat = (text: string, max = 80) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

function moTaBac(luat: AiRule, mocVoCuc: number): string {
  return (luat.bac ?? []).map(([nguong, diem]) => `${dinhDangNguong(nguong, mocVoCuc, luat.nghich_dao)}: ${diem}`).join('; ');
}

function moTaBangDiem(luat: AiRule): string {
  return Object.entries(luat.bang_diem ?? {}).map(([khoa, diem]) => `${GIA_TRI_LABEL[khoa] ?? khoa} ${diem}`).join('; ');
}

const tenTruong = (ma: string, danhMuc: Map<string, AiTruong>) => danhMuc.get(ma)?.mo_ta ?? ma;
const chieu = (nghichDao: boolean) => (nghichDao ? 'càng thấp càng tốt' : 'càng cao càng tốt');

/** Các thuộc tính đã đổi của một luật có trong cả bản đang áp dụng và bản nháp. */
function diffMotLuat(cu: AiRule, moi: AiRule, danhMuc: Map<string, AiTruong>, mocVoCuc: number): ThayDoi[] {
  const ten = `"${moi.mo_ta || cu.mo_ta}"`;
  const list: ThayDoi[] = [];
  const them = (muc: string, a: string, b: string) => {
    if (a !== b) list.push({ muc: `${ten}, ${muc}`, cu: a, moi: b });
  };
  them('tên luật', cu.mo_ta, moi.mo_ta);
  them('trường dữ liệu', tenTruong(cu.truong, danhMuc), tenTruong(moi.truong, danhMuc));
  them('chiều đánh giá', chieu(cu.nghich_dao), chieu(moi.nghich_dao));
  them('trọng số', `×${cu.trong_so}`, `×${moi.trong_so}`);
  them('trạng thái', cu.bat ? 'đang bật' : 'đã tắt', moi.bat ? 'đang bật' : 'đã tắt');
  them('điểm khi thiếu dữ liệu', String(cu.diem_khi_thieu), String(moi.diem_khi_thieu));
  them('bậc điểm', moTaBac(cu, mocVoCuc), moTaBac(moi, mocVoCuc));
  them('bảng điểm', moTaBangDiem(cu), moTaBangDiem(moi));
  them('gợi ý cho người vay', cat(cu.goi_y ?? GOI_Y_TU_GHEP), cat(moi.goi_y ?? GOI_Y_TU_GHEP));
  return list;
}

/**
 * So bộ luật nháp với bộ đang áp dụng theo mã luật (mã của luật đã lưu bị khóa nên là khóa so sánh ổn định). Liệt kê
 * luật thêm, luật xóa, thuộc tính đổi của từng luật và việc đổi thứ tự (backend lưu và hiển thị đúng thứ tự gửi lên).
 */
export function diffBoLuat(
  daLuu: AiRule[], nhap: AiRule[], danhMuc: Map<string, AiTruong>, mocVoCuc: number,
): ThayDoi[] {
  const theoMa = new Map(daLuu.map((luat) => [luat.ma, luat]));
  const maNhap = new Set(nhap.map((luat) => luat.ma));
  const list: ThayDoi[] = [];
  for (const luat of nhap) {
    const cu = theoMa.get(luat.ma);
    if (cu) {
      list.push(...diffMotLuat(cu, luat, danhMuc, mocVoCuc));
    } else {
      list.push({ muc: `Thêm luật "${luat.mo_ta}"`, moi: `đọc ${tenTruong(luat.truong, danhMuc)}, trọng số ×${luat.trong_so}` });
    }
  }
  for (const luat of daLuu) {
    if (!maNhap.has(luat.ma)) list.push({ muc: `Xóa luật "${luat.mo_ta}"` });
  }
  const thuTuCu = daLuu.map((luat) => luat.ma).filter((ma) => maNhap.has(ma));
  const thuTuMoi = nhap.map((luat) => luat.ma).filter((ma) => theoMa.has(ma));
  if (thuTuCu.join('|') !== thuTuMoi.join('|')) list.push({ muc: 'Đổi thứ tự các luật' });
  return list;
}
