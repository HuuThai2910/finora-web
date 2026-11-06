/**
 * Mã hồ sơ vay do finora-loan sinh: "LA-" và 20 ký tự chữ hoa/số (phần đầu một UUID). Nhận cả mã cũ ngắn hơn, cả khi
 * người dùng chỉ dán phần sau "LA-", chữ thường hoặc có khoảng trắng.
 */
const APPLICATION_NUMBER = /^LA-[0-9A-Z]{1,40}$/;

export type ApplicationNumberResult = { ok: true; value: string } | { ok: false; message: string };

export function normalizeApplicationNumber(raw: string): ApplicationNumberResult {
  const compact = raw.replace(/\s+/g, '').toUpperCase();
  if (!compact) return { ok: false, message: 'Nhập mã hồ sơ dạng LA-… rồi bấm Enter.' };
  const value = compact.startsWith('LA-') ? compact : `LA-${compact}`;
  return APPLICATION_NUMBER.test(value)
    ? { ok: true, value }
    : { ok: false, message: 'Mã hồ sơ có dạng LA- kèm chữ và số.' };
}
