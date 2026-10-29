import type { PillTone } from '@/components/StatusPill';
import type { EkycReasonEntry } from '../types';
import type { PillDisplay } from './attemptDisplay';

/** Một lý do đã dịch: nhãn cho người duyệt, mã gốc giữ lại để đối chiếu log. */
export interface ReasonView {
  code: string;
  label: string;
  tone: PillTone;
  /** Mã chưa có trong danh mục: nhãn đang là mã gốc hoặc thông điệp backend. */
  known: boolean;
}

/*
 * Nhãn cho người duyệt (khác thông điệp hướng dẫn người dùng ở EKYC-002 §3.6). Danh mục gồm mã lý do,
 * cảnh báo, lý do chụp lại của bước đọc giấy tờ (§2.1) và mã liveness (§2.2, §3.4). Màu: xanh là tín
 * hiệu tốt, cam cần xem thêm, đỏ là dấu hiệu trượt; chữ luôn đi kèm nên màu chỉ bổ trợ.
 */
const REASON_CATALOG: Record<string, PillDisplay> = {
  // Đọc giấy tờ
  QR_MRZ_AGREE: { label: 'Mã QR khớp dòng MRZ', tone: 'success' },
  SOURCES_DISAGREE: { label: 'Các nguồn đọc thẻ chưa khớp nhau', tone: 'warning' },
  SOURCES_DISAGREE_PERSISTENT: { label: 'Các nguồn vẫn lệch nhau sau nhiều lần chụp lại', tone: 'warning' },
  ID_PROVINCE_UNKNOWN: { label: 'Mã tỉnh của số định danh không có trong danh mục', tone: 'warning' },
  ID_STRUCTURE_MISMATCH: { label: 'Số định danh lệch năm sinh hoặc giới tính', tone: 'warning' },
  FULL_NAME_MISMATCH: { label: 'Họ tên khác hồ sơ đã khai', tone: 'warning' },
  DOB_MISMATCH: { label: 'Ngày sinh khác hồ sơ đã khai', tone: 'warning' },
  BLUR: { label: 'Ảnh thẻ bị mờ', tone: 'warning' },
  GLARE: { label: 'Ảnh thẻ bị loá', tone: 'warning' },
  CARD_CUT: { label: 'Ảnh không đủ bốn góc thẻ', tone: 'warning' },
  WRONG_SIDE: { label: 'Chụp nhầm mặt thẻ', tone: 'warning' },
  MRZ_UNREADABLE: { label: 'Không đọc được dòng MRZ', tone: 'warning' },
  QR_UNREADABLE: { label: 'Không đọc được mã QR', tone: 'warning' },
  PORTRAIT_UNUSABLE: { label: 'Ảnh chân dung trên thẻ không dùng được', tone: 'warning' },
  NO_DATA: { label: 'Không đọc được thông tin trên thẻ', tone: 'warning' },
  QR_MISSING: { label: 'Không có dữ liệu mã QR', tone: 'warning' },
  MRZ_MISSING: { label: 'Không có dữ liệu MRZ', tone: 'warning' },
  SINGLE_SOURCE: { label: 'Chỉ có một nguồn đọc tất định (QR hoặc MRZ)', tone: 'warning' },
  SINGLE_SOURCE_CONFIRMED: { label: 'Một nguồn tất định, có nguồn đọc độc lập xác nhận', tone: 'success' },
  SOURCES_INCOMPLETE: { label: 'Thiếu nguồn để đối chiếu chéo', tone: 'warning' },
  AI_ONLY: { label: 'Chỉ có AI đọc, không có nguồn tất định', tone: 'warning' },
  ID_RULES_OK: { label: 'Cấu trúc số định danh khớp năm sinh, giới tính', tone: 'success' },
  ID_RULES_FAILED: { label: 'Số định danh không qua kiểm tra cấu trúc', tone: 'warning' },
  MRZ_ID12_CHECK_FAILED: { label: 'Chữ số kiểm tra số định danh trong MRZ không khớp', tone: 'warning' },
  FRONT_BACK_LINKED: { label: 'Hai mặt thẻ gắn cùng một số định danh', tone: 'success' },
  NOT_LINKED: { label: 'Chưa gắn được mặt trước với mặt sau', tone: 'warning' },
  PORTRAIT_OK: { label: 'Ảnh chân dung trên thẻ dùng được', tone: 'success' },
  QUALITY_OK: { label: 'Chất lượng ảnh thẻ đạt', tone: 'success' },
  QUALITY_LOW: { label: 'Chất lượng ảnh thẻ thấp', tone: 'warning' },
  GALLERY_SOURCE: { label: 'Ảnh chọn từ thư viện, không chụp trực tiếp', tone: 'warning' },
  QR_CLIENT_MISMATCH: { label: 'Mã QR app gửi khác mã QR đọc từ ảnh', tone: 'warning' },
  EXPIRY_UNREADABLE: { label: 'Không đọc được hạn thẻ', tone: 'warning' },
  EXPIRY_MILESTONE_MISMATCH: { label: 'Hạn thẻ không khớp mốc đổi thẻ theo tuổi', tone: 'warning' },
  NO_EXPIRY_UNVERIFIED: { label: 'Thẻ "không thời hạn", chưa xác minh được', tone: 'warning' },
  SOFT_FLAGS: { label: 'Có cờ cảnh báo mềm', tone: 'warning' },
  CARD_CMND: { label: 'Chứng minh nhân dân, không được chấp nhận', tone: 'danger' },
  CARD_BARCODE: { label: 'CCCD mã vạch, không có QR/MRZ', tone: 'warning' },
  CARD_UNKNOWN: { label: 'Không nhận diện được loại thẻ', tone: 'warning' },
  // Liveness và so khớp khuôn mặt
  ACTIONS_MATCH: { label: 'Làm đúng chuỗi động tác', tone: 'success' },
  FACE_MATCH_HIGH: { label: 'Khuôn mặt khớp ảnh thẻ ở mức cao', tone: 'success' },
  FACE_MATCH_GRAY: { label: 'Độ khớp khuôn mặt ở vùng xám', tone: 'warning' },
  FACE_MISMATCH: { label: 'Khuôn mặt không khớp ảnh thẻ', tone: 'danger' },
  VIDEO_UNREADABLE: { label: 'Không đọc được video', tone: 'warning' },
  VIDEO_TOO_SHORT: { label: 'Video quá ngắn', tone: 'warning' },
  VIDEO_GAPS: { label: 'Video bị hở khung hình', tone: 'warning' },
  NO_FACE: { label: 'Không thấy khuôn mặt', tone: 'warning' },
  FACE_TOO_SMALL: { label: 'Khuôn mặt quá nhỏ, đứng quá xa', tone: 'warning' },
  TOO_DARK: { label: 'Ảnh quá tối', tone: 'warning' },
  FACE_TOO_DARK: { label: 'Khuôn mặt quá tối', tone: 'warning' },
  BLURRY: { label: 'Video bị mờ', tone: 'warning' },
  MULTIPLE_FACES: { label: 'Có hơn một khuôn mặt trong khung hình', tone: 'danger' },
  TRACK_BROKEN: { label: 'Mất dấu khuôn mặt giữa video', tone: 'warning' },
  ACTIONS_MISMATCH: { label: 'Động tác sai thứ tự hoặc sai hướng', tone: 'danger' },
  ACTIONS_MISSING: { label: 'Thiếu động tác', tone: 'danger' },
  ACTIONS_EXTRA: { label: 'Có động tác thừa', tone: 'danger' },
  INTERVALS_MISMATCH: { label: 'Nhịp động tác không khớp lời nhắc', tone: 'danger' },
  IDENTITY_INCONSISTENT: { label: 'Khuôn mặt không nhất quán trong video', tone: 'danger' },
  STILLS_MODE: { label: 'Quay bằng ảnh chụp liên tiếp thay cho video', tone: 'warning' },
  SOFT_ENCODER_TAG: { label: 'Video mang dấu bộ mã hoá phần mềm', tone: 'warning' },
  MEDIA_REPLAYED: { label: 'Video đã được dùng ở lượt trước', tone: 'danger' },
};

function describe(code: string, message: string | null): ReasonView {
  const known = Object.prototype.hasOwnProperty.call(REASON_CATALOG, code);
  if (known) return { code, ...REASON_CATALOG[code], known };
  return { code, label: message || code, tone: 'neutral', known };
}

/** Chuẩn hoá mảng lý do (mã hoặc `{code, message}`) thành danh sách hiển thị, bỏ mã trùng và mã rỗng. */
export function toReasonViews(entries: readonly EkycReasonEntry[] | null | undefined): ReasonView[] {
  const seen = new Set<string>();
  const views: ReasonView[] = [];
  for (const entry of entries ?? []) {
    const code = typeof entry === 'string' ? entry : entry.code;
    if (!code || seen.has(code)) continue;
    seen.add(code);
    views.push(describe(code, typeof entry === 'string' ? null : entry.message ?? null));
  }
  return views;
}

export type FaceMatchZone = 'HIGH' | 'GRAY' | 'LOW';

export const FACE_ZONE_DISPLAY: Record<FaceMatchZone, PillDisplay> = {
  HIGH: { label: 'Khớp cao', tone: 'success' },
  GRAY: { label: 'Vùng xám', tone: 'warning' },
  LOW: { label: 'Không khớp', tone: 'danger' },
};

/**
 * Vùng điểm so mặt lấy từ mã lý do AI trả (`FACE_MATCH_HIGH`, `FACE_MATCH_GRAY`, `FACE_MISMATCH`).
 * Không tự so điểm với ngưỡng: ngưỡng là cấu hình tạm của finora-ai và có thể đổi theo phiên bản.
 * Gặp nhiều mã thì lấy vùng thận trọng nhất. Không có mã nào thì trả `null` (chỉ hiện điểm).
 */
export function faceMatchZone(reasons: readonly ReasonView[]): FaceMatchZone | null {
  const codes = new Set(reasons.map((reason) => reason.code));
  if (codes.has('FACE_MISMATCH')) return 'LOW';
  if (codes.has('FACE_MATCH_GRAY')) return 'GRAY';
  if (codes.has('FACE_MATCH_HIGH')) return 'HIGH';
  return null;
}
