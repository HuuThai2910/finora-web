/**
 * Mã nhân viên dán vào ô "Mở hồ sơ theo mã". Hai loại:
 * - mã hiển thị finora-loan sinh cho người đọc: hồ sơ `HS-yyyyMMdd-XXXX`, hợp đồng `HĐ-yyyyMMdd-XXXX` (gõ không dấu
 *   `HD-…` cũng nhận), và mã tra cứu hợp đồng `LC-…`: phải hỏi Loan hồ sơ nào ứng với mã (`direct: false`);
 * - mã tra cứu hồ sơ `LA-` kèm chữ hoa/số (phần đầu một UUID): mở thẳng trang thẩm định (`direct: true`). Nhận cả khi
 *   người dùng chỉ dán phần sau "LA-".
 * Chữ thường hoặc có khoảng trắng đều được chuẩn hóa.
 */
const DISPLAY_CODE = /^(HS|HĐ)-\d{8}-[0-9A-Z]{4}$/;
const CONTRACT_NUMBER = /^LC-[0-9A-Z]{1,40}$/;
const APPLICATION_NUMBER = /^LA-[0-9A-Z]{1,40}$/;

export type ApplicationNumberResult =
  | { ok: true; value: string; direct: boolean }
  | { ok: false; message: string };

export function normalizeApplicationNumber(raw: string): ApplicationNumberResult {
  let compact = raw.replace(/\s+/g, '').toUpperCase();
  if (!compact) return { ok: false, message: 'Nhập mã hồ sơ hoặc mã hợp đồng rồi bấm Enter.' };
  if (compact.startsWith('HD-')) compact = `HĐ-${compact.slice(3)}`;
  if (DISPLAY_CODE.test(compact) || CONTRACT_NUMBER.test(compact)) return { ok: true, value: compact, direct: false };
  if (/^(HS|HĐ)-/.test(compact)) {
    return { ok: false, message: 'Mã có dạng HS-ngàyThángNăm-4 ký tự (hồ sơ) hoặc HĐ-… (hợp đồng).' };
  }
  const value = compact.startsWith('LA-') ? compact : `LA-${compact}`;
  return APPLICATION_NUMBER.test(value)
    ? { ok: true, value, direct: true }
    : { ok: false, message: 'Mã có dạng HS-ngàyThángNăm-4 ký tự (hồ sơ) hoặc HĐ-… (hợp đồng).' };
}
