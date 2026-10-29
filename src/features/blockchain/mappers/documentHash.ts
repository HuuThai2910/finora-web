import type { UiApiError } from '@/lib/api/errors';

/** Kết quả so hash của tệp PDF tải về với hash đã neo trong dữ liệu nguồn của proof. */
export interface PdfHashCheck {
  /** `documentHash` trong `proofArtifact` (64 ký tự hex thường, SHA-256 của chính tệp PDF đã ký). */
  expected: string;
  /** SHA-256 trình duyệt vừa tính trên đúng các byte của tệp tải về. */
  actual: string;
  matched: boolean;
}

/**
 * SHA-256 dạng hex thường của tệp, tính bằng Web Crypto ngay trong trình duyệt (không gửi tệp đi đâu khác).
 * `crypto.subtle` chỉ có trong ngữ cảnh an toàn (HTTPS hoặc localhost); thiếu thì báo lỗi rõ ràng thay vì đoán.
 */
export async function sha256Hex(blob: Blob): Promise<string> {
  if (!globalThis.crypto?.subtle) {
    const error: UiApiError = {
      code: 'WEB_CRYPTO_UNAVAILABLE',
      message: 'Trình duyệt không hỗ trợ tính SHA-256 (cần mở trang qua HTTPS hoặc localhost).',
    };
    throw error;
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** Đọc `documentHash` trong dữ liệu nguồn; dữ liệu nguồn là JSON tự do nên phải kiểm kiểu trước khi dùng. */
export function artifactDocumentHash(artifact: Record<string, unknown>): string | null {
  const value = artifact.documentHash;
  return typeof value === 'string' && value.trim() ? value.trim().toLowerCase() : null;
}
