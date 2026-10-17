/*
 * Hàm hiển thị thuần cho ngăn chat. Không tính số tiền hay tỷ lệ nghiệp vụ: mọi con số người dùng đọc
 * là chuỗi server đã định dạng; ở đây chỉ kiểm đường dẫn an toàn và đổi ngày sang kiểu Việt Nam.
 */

/**
 * Chỉ nhận đường dẫn nội bộ của web ("/loans/..."). Server dựng `path` từ bảng cố định, nhưng vẫn
 * chặn "//host", "\" và mọi scheme để một phản hồi lạ không đưa quản trị viên ra trang ngoài.
 */
export function safeInternalPath(path: string | null): string | null {
  if (!path || !path.startsWith('/') || path.startsWith('//') || path.includes('\\')) return null;
  return path;
}

/** Link văn bản pháp luật chỉ nhận http/https; link hỏng thì chỉ hiện tên văn bản. */
export function safeExternalUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.href : null;
  } catch {
    return null;
  }
}

/**
 * "2026-10-15" → "15/10/2026". Ngày kiểm là ngày thuần (không giờ) nên tách chuỗi, không qua `Date`
 * để khỏi lệch một ngày theo múi giờ. Chuỗi khác khuôn thì giữ nguyên.
 */
export function formatCheckedAt(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/**
 * Độ dài thanh tiến độ (0–100) của thẻ `progress`. Chỉ dùng để vẽ; con số hiển thị là `label` server
 * đã định dạng. Thiếu số hoặc `max` không dương thì `null` (thanh rỗng, vẫn hiện nhãn).
 */
export function progressPercent(value: number | null, max: number | null): number | null {
  if (value === null || max === null || !Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return null;
  return Math.round(Math.min(100, Math.max(0, (value / max) * 100)));
}
