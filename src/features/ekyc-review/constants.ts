import type { EkycAttemptStatus } from './types';

/** Một trang bảng trên web quản trị (quy tắc bảng: 10 dòng mỗi trang; backend cho tối đa 100). */
export const EKYC_REVIEW_PAGE_SIZE = 10;

export const EKYC_REVIEW_LIST_PATH = '/customers/ekyc-review';

export const ekycReviewDetailPath = (attemptId: string) => `${EKYC_REVIEW_LIST_PATH}/${encodeURIComponent(attemptId)}`;

/** Mặc định mở hàng chờ duyệt tay: đó là việc quản trị viên cần làm. */
export const DEFAULT_ATTEMPT_FILTER: EkycAttemptStatus = 'MANUAL_REVIEW';

/** Thứ tự tab: hàng chờ trước, rồi các kết quả, cuối là lượt chưa xong hoặc bỏ dở. */
export const ATTEMPT_FILTERS: EkycAttemptStatus[] = ['MANUAL_REVIEW', 'APPROVED', 'REJECTED', 'VERIFIED', 'IN_PROGRESS', 'ABANDONED'];

export function isAttemptFilter(value: string | null): value is EkycAttemptStatus {
  return ATTEMPT_FILTERS.some((status) => status === value);
}

export const EMPTY_LIST_TEXT: Record<EkycAttemptStatus, string> = {
  MANUAL_REVIEW: 'Không còn lượt nào chờ duyệt tay.',
  APPROVED: 'Chưa có lượt nào được duyệt tay.',
  REJECTED: 'Chưa có lượt nào bị từ chối.',
  VERIFIED: 'Chưa có lượt nào được xác minh tự động.',
  IN_PROGRESS: 'Không có lượt nào đang thực hiện.',
  ABANDONED: 'Không có lượt nào bị bỏ dở.',
};

/** Cột `ekyc_attempts.review_note` là VARCHAR(1000). */
export const REVIEW_NOTE_MAX = 1000;

/** Lý do gợi ý khi từ chối; quản trị viên vẫn sửa tự do, backend chỉ yêu cầu ghi chú không rỗng. */
export const REJECT_NOTE_SUGGESTIONS = [
  'Ảnh thẻ không rõ, không đối chiếu được thông tin.',
  'Khuôn mặt trong video không khớp ảnh chân dung trên thẻ.',
  'Thông tin đọc được không khớp với ảnh thẻ.',
  'Video không cho thấy người thật thực hiện động tác.',
];
