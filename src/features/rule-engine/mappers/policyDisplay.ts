import { EMPTY, formatNumber } from '@/utils';

/**
 * Nhãn phiên bản chính sách cho người đọc: `CREDIT_POLICY_V12` thành "v12". finora-ai tăng số này mỗi lần lưu cấu hình
 * (`_next_decision_policy_version`) và ghi kèm từng quyết định chấm điểm. Chuỗi khác dạng thì trả `null` để giao diện ẩn
 * đi, không hiện mã kỹ thuật.
 */
export function nhanPhienBan(version: string | null | undefined): string | null {
  const match = /^CREDIT_POLICY_V(\d+)$/.exec(version ?? '');
  return match ? `v${match[1]}` : null;
}

/** Tiền kèm "đ" (không dùng ký hiệu ₫ của Intl), cùng cách viết với các màn vận hành. */
export function dong(value: number | null | undefined): string {
  const text = formatNumber(value);
  return text === EMPTY ? EMPTY : `${text} đ`;
}

/** Ô tiền nhập dạng chữ: chỉ giữ chữ số (tối đa 16), để gõ "25.000.000" hay dán "25,000,000" đều ra 25000000. */
export function soTuChuoi(value: string): number {
  const digits = value.replace(/\D/g, '').slice(0, 16);
  return digits ? Number(digits) : 0;
}

/** Tỷ lệ 0 đến 1 sang phần trăm để nhập/hiển thị, làm tròn 2 chữ số để tránh 85.00000000001. */
export const sangPhanTram = (tyLe: number) => Math.round(tyLe * 10000) / 100;

/** Phần trăm sang tỷ lệ gửi backend, làm tròn 4 chữ số như phép kiểm tổng của finora-ai (`round(..., 4)`). */
export const sangTyLe = (phanTram: number) => Math.round(phanTram * 100) / 10000;
