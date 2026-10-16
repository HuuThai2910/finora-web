import { EMPTY } from '@/utils';
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

const FRAME_ORDER = ['FRONTAL', 'TURN_LEFT', 'TURN_RIGHT', 'LOOK_UP', 'LOOK_DOWN'];

export function evidenceCaption(item: EkycEvidenceItem): string {
  const kind = KIND_LABELS[item.kind] ?? item.kind;
  if (item.kind !== 'LIVENESS_FRAME' || !item.label) return kind;
  return `${kind} ${FRAME_LABELS[item.label] ?? item.label}`;
}

export interface EvidenceGroup {
  key: 'card' | 'liveness' | 'other';
  title: string;
  items: EkycEvidenceItem[];
}

const kindRank = (kinds: readonly string[], kind: string) => {
  const index = kinds.indexOf(kind);
  return index < 0 ? kinds.length : index;
};

const frameRank = (label: string | null) => kindRank(FRAME_ORDER, label ?? '');

/**
 * Chia tệp thành ảnh thẻ, kiểm tra khuôn mặt (video trước, khung theo thứ tự động tác) và tệp khác.
 * Nhóm rỗng bị bỏ; thứ tự trong nhóm giữ ổn định theo thứ tự backend trả khi cùng hạng.
 */
export function groupEvidence(items: readonly EkycEvidenceItem[]): EvidenceGroup[] {
  const cardKinds = ['CCCD_FRONT', 'CCCD_BACK'];
  const livenessKinds = ['LIVENESS_VIDEO', 'LIVENESS_FRAME'];
  const card = items
    .filter((item) => cardKinds.includes(item.kind))
    .sort((a, b) => kindRank(cardKinds, a.kind) - kindRank(cardKinds, b.kind));
  const liveness = items
    .filter((item) => livenessKinds.includes(item.kind))
    .sort((a, b) => kindRank(livenessKinds, a.kind) - kindRank(livenessKinds, b.kind) || frameRank(a.label) - frameRank(b.label));
  const other = items.filter((item) => !cardKinds.includes(item.kind) && !livenessKinds.includes(item.kind));

  const groups: EvidenceGroup[] = [
    { key: 'card', title: 'Ảnh căn cước', items: card },
    { key: 'liveness', title: 'Kiểm tra khuôn mặt', items: liveness },
    { key: 'other', title: 'Tệp khác', items: other },
  ];
  return groups.filter((group) => group.items.length > 0);
}

const SIZE_KB = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });
const SIZE_MB = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return EMPTY;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${SIZE_KB.format(bytes / 1024)} KB`;
  return `${SIZE_MB.format(bytes / (1024 * 1024))} MB`;
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
