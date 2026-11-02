/** Duyệt xác minh mở từ menu dòng của trang Khách hàng; xong thì quay về danh sách đó. */
export const EKYC_REVIEW_LIST_PATH = '/customers/kyc';

export const ekycReviewDetailPath = (attemptId: string) => `/customers/kyc/review/${encodeURIComponent(attemptId)}`;

/**
 * Số lượt chờ duyệt tay tải một lần để tìm lượt của từng khách trong bảng (backend cho tối đa 100 dòng mỗi trang).
 * API danh sách lượt chưa lọc được theo khách hàng nên trang Khách hàng tra trong trang này.
 */
export const PENDING_ATTEMPT_LOOKUP_SIZE = 100;

/** Cột `ekyc_attempts.review_note` là VARCHAR(1000). */
export const REVIEW_NOTE_MAX = 1000;

/** Lý do gợi ý khi từ chối; quản trị viên vẫn sửa tự do, backend chỉ yêu cầu ghi chú không rỗng. */
export const REJECT_NOTE_SUGGESTIONS = [
  'Ảnh thẻ không rõ, không đối chiếu được thông tin.',
  'Khuôn mặt trong video không khớp ảnh chân dung trên thẻ.',
  'Thông tin đọc được không khớp với ảnh thẻ.',
  'Video không cho thấy người thật thực hiện động tác.',
];
