import type { EkycEvidenceItem, EkycEvidenceKind } from '../types';

/** Cách hiển thị một tệp, quyết định theo `contentType` backend ghi lúc lưu. */
export type EvidenceMediaKind = 'image' | 'video' | 'text' | 'other';

export function evidenceMediaKind(contentType: string): EvidenceMediaKind {
  const type = contentType.toLowerCase();
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('text/') || type.includes('json')) return 'text';
  return 'other';
}

const KIND_LABELS: Record<EkycEvidenceKind, string> = {
  CCCD_FRONT: 'Mặt trước thẻ',
  CCCD_BACK: 'Mặt sau thẻ',
  LIVENESS_VIDEO: 'Video kiểm tra khuôn mặt',
  LIVENESS_FRAME: 'Khung hình',
  RESULT: 'Tệp kết quả xử lý',
};

/** Nhãn khung hình AI trích ra (chính diện và đỉnh mỗi động tác). */
const FRAME_LABELS: Record<string, string> = {
  FRONTAL: 'nhìn thẳng',
  TURN_LEFT: 'quay trái',
  TURN_RIGHT: 'quay phải',
  LOOK_UP: 'ngẩng lên',
  LOOK_DOWN: 'cúi xuống',
};

/** Thứ tự khung hình theo chuỗi động tác; nhãn lạ xếp cuối. */
const FRAME_ORDER = ['FRONTAL', 'TURN_LEFT', 'TURN_RIGHT', 'LOOK_UP', 'LOOK_DOWN'];

export function frameRank(label: string | null): number {
  const index = FRAME_ORDER.indexOf(label ?? '');
  return index < 0 ? FRAME_ORDER.length : index;
}

export function evidenceCaption(item: EkycEvidenceItem): string {
  const kind = KIND_LABELS[item.kind] ?? item.kind;
  if (item.kind !== 'LIVENESS_FRAME' || !item.label) return kind;
  return `${kind} ${FRAME_LABELS[item.label] ?? item.label}`;
}

const SHORT_LABELS: Partial<Record<EkycEvidenceKind, string>> = {
  CCCD_FRONT: 'Mặt trước',
  CCCD_BACK: 'Mặt sau',
  LIVENESS_VIDEO: 'Video',
};

/** Tên ngắn dưới ô ảnh, vì thẻ chứa ô đã nói đó là giấy tờ hay khuôn mặt: "Mặt trước", "Video", "Quay trái". */
export function evidenceShortCaption(item: EkycEvidenceItem): string {
  if (item.kind === 'LIVENESS_FRAME') {
    const frame = item.label ? FRAME_LABELS[item.label] ?? item.label : 'khung hình';
    return frame.charAt(0).toUpperCase() + frame.slice(1);
  }
  return SHORT_LABELS[item.kind] ?? evidenceCaption(item);
}

/** Nội dung văn bản của tệp; JSON được thụt lề cho dễ đọc, nội dung khác giữ nguyên. */
export function formatEvidenceText(text: string, contentType: string): string {
  if (!contentType.toLowerCase().includes('json')) return text;
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    // Không phải JSON hợp lệ dù khai báo JSON: hiện nguyên văn để người duyệt vẫn đọc được.
    return text;
  }
}
