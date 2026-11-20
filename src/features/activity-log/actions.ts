/**
 * Bảng tra lượt gọi → tên việc người gọi đã làm, cho Nhật ký hoạt động: thao tác ghi (POST/PUT/PATCH/DELETE) ở `RULES`,
 * lượt xem (GET) ở `VIEW_RULES`.
 *
 * Gateway không đổi đường dẫn khi chuyển tiếp (không RewritePath/StripPrefix), nên mẫu ở đây là đường dẫn thật của
 * controller trong finora-platform (cập nhật 10/11/2026, đủ mọi endpoint ghi đi qua Gateway). Nhiều thao tác không gửi
 * body (đánh dấu đã đọc, lập lại giấy xác nhận, làm mới phiên...): khi đó chỉ đường dẫn cho biết người dùng làm gì.
 *
 * Mẫu viết theo kiểu Spring, chỗ `{...}` là tham số trên đường dẫn và chữ trong ngoặc là tên dễ hiểu của tham số đó
 * (giá trị hiện ở cột "Đối tượng"). Không khớp mẫu nào thì trả `null` để giao diện hiện đường dẫn, không đoán bừa.
 */

type WriteMethod = 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** Một tham số lấy từ đường dẫn: tên dễ hiểu và giá trị (mã hồ sơ, mã hợp đồng, id...). */
export interface ActionTarget {
  label: string;
  value: string;
}

export interface ActivityAction {
  /** Tên thao tác tiếng Việt, ví dụ "Duyệt hồ sơ vay". */
  name: string;
  targets: ActionTarget[];
}

type RuleMethod = WriteMethod | 'GET';

interface ActionRule {
  method: RuleMethod;
  pattern: string;
  /** Tên cố định, hoặc tính từ body khi cùng một đường dẫn làm nhiều việc (mua hay bán, loại ghi nhận thu hồi). */
  name: string | ((body: string | null) => string);
}

/**
 * Đọc một trường chuỗi trong body. Body có thể đã bị Gateway cắt ở 1000 ký tự nên không parse JSON được; tìm thẳng
 * cặp `"tên": "giá trị"` vẫn đọc được trường nằm ở đầu body.
 */
function bodyField(body: string | null, field: string): string | null {
  if (!body) return null;
  const match = new RegExp(`"${field}"\\s*:\\s*"([^"]*)"`).exec(body);
  return match ? match[1] : null;
}

/** Chiều lệnh trên sổ lệnh (`PlaceBookOrderRequest.side`): BID mua, ASK bán. */
function bookOrderName(body: string | null): string {
  const side = bodyField(body, 'side');
  if (side === 'BID') return 'Đặt lệnh mua phần vốn';
  if (side === 'ASK') return 'Đặt lệnh bán phần vốn';
  return 'Đặt lệnh mua/bán phần vốn';
}

/** Nhãn loại ghi nhận thu hồi nợ, cùng chữ với trang Quản lý khoản vay (`CollectionActionType` của finora-loan). */
const COLLECTION_ACTIONS: Record<string, string> = {
  REMINDER_SENT: 'Gửi tin nhắc nợ',
  BORROWER_CONTACTED: 'Đã liên hệ người vay',
  PROMISE_TO_PAY: 'Người vay hẹn trả',
  LEGAL_REVIEW: 'Chuyển pháp lý xem xét',
  FIELD_COLLECTION: 'Thu hồi tại địa chỉ',
  WRITE_OFF_RECOMMENDED: 'Đề xuất xóa nợ',
  NOTE: 'Ghi chú nội bộ',
};

function collectionActionName(body: string | null): string {
  const type = bodyField(body, 'actionType');
  const label = type ? COLLECTION_ACTIONS[type] : undefined;
  return label ? `Ghi nhận thu hồi nợ: ${label.toLowerCase()}` : 'Ghi nhận xử lý hồ sơ thu hồi nợ';
}

/* Tên tham số dùng lại nhiều lần, giữ chữ thống nhất giữa các mẫu. */
const APP = '{Hồ sơ vay}';
const CONTRACT = '{Hợp đồng}';
const LOAN = '{Khoản vay}';
const PRODUCT = '{Sản phẩm vay}';
const LISTING = '{Khoản gọi vốn}';
const TRADE = '{Lần khớp}';
const RESCHEDULE = '{Yêu cầu cơ cấu nợ}';

const RULES: ActionRule[] = [
  // ── Đăng nhập, tài khoản (finora-user) ──
  { method: 'POST', pattern: '/api/v1/auth/login', name: 'Đăng nhập' },
  { method: 'POST', pattern: '/api/v1/auth/logout', name: 'Đăng xuất' },
  { method: 'POST', pattern: '/api/v1/auth/refresh', name: 'Làm mới phiên đăng nhập' },
  { method: 'POST', pattern: '/api/v1/auth/register', name: 'Đăng ký tài khoản' },
  { method: 'POST', pattern: '/api/v1/auth/register/resend-otp', name: 'Gửi lại mã OTP đăng ký' },
  { method: 'POST', pattern: '/api/v1/auth/verify-registration', name: 'Xác nhận mã OTP đăng ký' },
  { method: 'POST', pattern: '/api/v1/auth/forgot-password', name: 'Yêu cầu đặt lại mật khẩu' },
  { method: 'POST', pattern: '/api/v1/auth/verify-reset-otp', name: 'Xác nhận mã OTP đặt lại mật khẩu' },
  { method: 'POST', pattern: '/api/v1/auth/reset-password', name: 'Đặt lại mật khẩu' },
  { method: 'POST', pattern: '/api/v1/users/me/change-password', name: 'Đổi mật khẩu' },
  { method: 'DELETE', pattern: '/api/v1/users/me/devices/{Thiết bị đăng nhập}', name: 'Đăng xuất một thiết bị đăng nhập' },
  { method: 'POST', pattern: '/api/v1/users/me/pin', name: 'Tạo mã PIN giao dịch' },
  { method: 'PUT', pattern: '/api/v1/users/me/pin', name: 'Đổi mã PIN giao dịch' },
  { method: 'POST', pattern: '/api/v1/users/me/pin/reset', name: 'Đặt lại mã PIN giao dịch' },
  { method: 'POST', pattern: '/api/v1/users/me/pin/verify', name: 'Nhập mã PIN giao dịch' },
  { method: 'POST', pattern: '/api/v1/users/profile/ekyc/consent', name: 'Đồng ý cho xử lý dữ liệu xác minh danh tính' },
  { method: 'DELETE', pattern: '/api/v1/users/profile/ekyc/consent', name: 'Rút lại đồng ý xử lý dữ liệu xác minh danh tính' },
  { method: 'POST', pattern: '/api/v1/users/profile/ekyc-verify', name: 'Gửi ảnh giấy tờ để xác minh danh tính' },
  { method: 'POST', pattern: '/api/v1/users/profile/ekyc/liveness/challenge', name: 'Bắt đầu kiểm tra khuôn mặt' },
  { method: 'POST', pattern: '/api/v1/users/profile/ekyc/liveness', name: 'Gửi video/ảnh kiểm tra khuôn mặt' },
  { method: 'POST', pattern: '/api/v1/users/profile/ekyc-confirm', name: 'Xác nhận thông tin xác minh danh tính' },
  { method: 'POST', pattern: '/api/v1/users/profile/ekyc-manual-review', name: 'Gửi hồ sơ xác minh danh tính cho nhân viên duyệt khi hệ thống gặp sự cố' },
  { method: 'POST', pattern: '/api/v1/users/profile/ekyc-withdraw', name: 'Rút lại hồ sơ xác minh danh tính đang chờ duyệt' },

  // ── Quản trị người dùng, nhân viên (finora-user) ──
  { method: 'POST', pattern: '/api/v1/admin/users', name: 'Tạo tài khoản nhân viên' },
  { method: 'POST', pattern: '/api/v1/admin/users/{Người dùng}/lock', name: 'Khóa tài khoản' },
  { method: 'POST', pattern: '/api/v1/admin/users/{Người dùng}/unlock', name: 'Mở khóa tài khoản' },
  { method: 'POST', pattern: '/api/v1/admin/users/{Người dùng}/roles', name: 'Đổi vai trò của tài khoản' },
  { method: 'POST', pattern: '/api/v1/admin/users/ekyc-attempts/{Lượt xác minh danh tính}/approve', name: 'Duyệt xác minh danh tính' },
  { method: 'POST', pattern: '/api/v1/admin/users/ekyc-attempts/{Lượt xác minh danh tính}/reject', name: 'Từ chối xác minh danh tính' },
  { method: 'POST', pattern: '/api/v1/admin/staff-roles', name: 'Tạo vai trò nhân viên' },
  { method: 'PUT', pattern: '/api/v1/admin/staff-roles/{Vai trò}', name: 'Sửa quyền của vai trò nhân viên' },
  { method: 'DELETE', pattern: '/api/v1/admin/staff-roles/{Vai trò}', name: 'Xóa vai trò nhân viên' },

  // ── Hồ sơ vay, hợp đồng của người vay (finora-loan) ──
  { method: 'POST', pattern: `/api/v1/loan-products/${PRODUCT}/repayment-previews`, name: 'Tính thử lịch trả nợ' },
  { method: 'POST', pattern: '/api/v1/loan-applications', name: 'Nộp hồ sơ vay' },
  { method: 'POST', pattern: `/api/v1/loan-applications/${APP}/terms/accept`, name: 'Chấp nhận điều kiện vay' },
  { method: 'POST', pattern: `/api/v1/loan-applications/${APP}/terms/decline`, name: 'Từ chối điều kiện vay' },
  { method: 'POST', pattern: `/api/v1/loan-applications/${APP}/withdraw`, name: 'Rút hồ sơ vay' },
  { method: 'POST', pattern: `/api/v1/loan-contracts/${CONTRACT}/sign`, name: 'Người vay ký hợp đồng' },
  { method: 'POST', pattern: `/api/v1/loan-contracts/${CONTRACT}/decline`, name: 'Người vay từ chối ký hợp đồng' },
  { method: 'POST', pattern: `/api/v1/loan-contracts/${CONTRACT}/signature/refresh`, name: 'Người vay cập nhật trạng thái chữ ký hợp đồng' },
  { method: 'POST', pattern: `/api/v1/loans/${LOAN}/reschedule-requests`, name: 'Gửi yêu cầu cơ cấu nợ' },

  // ── Hợp đồng của nhà đầu tư (finora-loan) ──
  { method: 'POST', pattern: `/api/v1/investor/loan-contracts/${CONTRACT}/sign`, name: 'Nhà đầu tư ký hợp đồng' },
  { method: 'POST', pattern: `/api/v1/investor/loan-contracts/${CONTRACT}/decline`, name: 'Nhà đầu tư từ chối ký hợp đồng' },
  { method: 'POST', pattern: `/api/v1/investor/loan-contracts/${CONTRACT}/signature/refresh`, name: 'Nhà đầu tư cập nhật trạng thái chữ ký hợp đồng' },

  // ── Quản trị khoản vay (finora-loan) ──
  { method: 'POST', pattern: `/api/v1/admin/loan-applications/${APP}/approve`, name: 'Duyệt hồ sơ vay' },
  { method: 'POST', pattern: `/api/v1/admin/loan-applications/${APP}/reject`, name: 'Từ chối hồ sơ vay' },
  { method: 'POST', pattern: `/api/v1/admin/loan-applications/${APP}/scoring-retry`, name: 'Chấm điểm lại hồ sơ vay' },
  { method: 'POST', pattern: '/api/v1/admin/loan-products', name: 'Tạo sản phẩm vay' },
  { method: 'PUT', pattern: `/api/v1/admin/loan-products/${PRODUCT}`, name: 'Sửa sản phẩm vay' },
  { method: 'POST', pattern: `/api/v1/admin/loan-products/${PRODUCT}/activate`, name: 'Kích hoạt sản phẩm vay' },
  { method: 'POST', pattern: `/api/v1/admin/loan-products/${PRODUCT}/deactivate`, name: 'Tạm dừng sản phẩm vay' },
  { method: 'POST', pattern: `/api/v1/admin/loan-products/${PRODUCT}/archive`, name: 'Lưu trữ sản phẩm vay' },
  { method: 'POST', pattern: `/api/v1/admin/loan-products/${PRODUCT}/core-sync`, name: 'Đồng bộ sản phẩm vay sang hệ thống lõi' },
  { method: 'POST', pattern: `/api/v1/admin/loan-reschedule-requests/${RESCHEDULE}/approve`, name: 'Duyệt yêu cầu cơ cấu nợ' },
  { method: 'POST', pattern: `/api/v1/admin/loan-reschedule-requests/${RESCHEDULE}/reject`, name: 'Từ chối yêu cầu cơ cấu nợ' },
  { method: 'POST', pattern: `/api/v1/admin/loan-reschedule-requests/${RESCHEDULE}/retry`, name: 'Chạy lại yêu cầu cơ cấu nợ' },
  { method: 'POST', pattern: `/api/v1/admin/loan-reschedule-requests/${RESCHEDULE}/cancel`, name: 'Đóng yêu cầu cơ cấu nợ bị lỗi' },
  { method: 'POST', pattern: '/api/v1/admin/collection-cases/{Hồ sơ thu hồi nợ}/actions', name: collectionActionName },
  { method: 'POST', pattern: '/api/v1/admin/disbursement-sagas/{Lệnh giải ngân}/requeue', name: 'Chạy lại lệnh giải ngân' },
  { method: 'POST', pattern: `/api/v1/admin/loan-servicing-reconciliation/${LOAN}/reconcile`, name: 'Đối soát khoản vay với hệ thống lõi' },
  { method: 'POST', pattern: '/api/v1/admin/repayment-event-quarantine/{Sự kiện trả nợ}/replay', name: 'Xử lý lại sự kiện trả nợ bị giữ lại' },

  // ── Ví, nạp/rút, trả nợ (finora-payment) ──
  { method: 'POST', pattern: '/api/v1/wallets/me/top-ups', name: 'Tạo lệnh nạp tiền vào ví' },
  { method: 'POST', pattern: '/api/v1/wallets/me/top-ups/{Lệnh nạp tiền}/mock-complete', name: 'Hoàn tất nạp tiền (giả lập)' },
  { method: 'POST', pattern: '/api/v1/wallets/me/withdrawals', name: 'Rút tiền về tài khoản ngân hàng' },
  { method: 'POST', pattern: '/api/v1/wallets/me/bank-accounts', name: 'Bắt đầu liên kết tài khoản ngân hàng' },
  { method: 'POST', pattern: '/api/v1/wallets/me/bank-accounts/inquiry', name: 'Tra cứu tên chủ tài khoản ngân hàng' },
  { method: 'POST', pattern: '/api/v1/wallets/me/bank-accounts/link-requests/{Yêu cầu liên kết}/confirm', name: 'Xác nhận liên kết tài khoản ngân hàng' },
  { method: 'POST', pattern: '/api/v1/wallets/me/bank-accounts/link-requests/{Yêu cầu liên kết}/resend-otp', name: 'Gửi lại OTP liên kết tài khoản ngân hàng' },
  { method: 'PUT', pattern: '/api/v1/wallets/me/bank-accounts/{Tài khoản ngân hàng}/default', name: 'Đặt tài khoản ngân hàng mặc định' },
  { method: 'DELETE', pattern: '/api/v1/wallets/me/bank-accounts/{Tài khoản ngân hàng}', name: 'Hủy liên kết tài khoản ngân hàng' },
  { method: 'POST', pattern: '/api/v1/wallets/callbacks/zalopay', name: 'ZaloPay báo kết quả thanh toán' },
  { method: 'POST', pattern: '/api/v1/wallets/callbacks/mock-payout', name: 'Báo kết quả chi tiền (giả lập)' },
  { method: 'POST', pattern: '/api/v1/repayments', name: 'Trả nợ kỳ' },
  { method: 'POST', pattern: '/api/v1/repayments/{Giao dịch trả nợ}/cancel', name: 'Hủy giao dịch trả nợ' },
  { method: 'POST', pattern: '/api/v1/repayments/early-settlement-quotes', name: 'Tính số tiền tất toán trước hạn' },
  { method: 'POST', pattern: '/api/v1/repayments/early-settlement', name: 'Tất toán khoản vay trước hạn' },
  { method: 'POST', pattern: '/api/v1/repayments/partial-prepayment-quotes', name: 'Tính số tiền trả trước một phần' },
  { method: 'POST', pattern: '/api/v1/repayments/partial-prepayment', name: 'Trả trước một phần khoản vay' },
  { method: 'POST', pattern: '/api/v1/transactions/holds', name: 'Tạm giữ tiền trong ví' },
  { method: 'POST', pattern: '/api/v1/transactions/holds/{Khoản tạm giữ}/release', name: 'Trả lại tiền tạm giữ' },
  { method: 'POST', pattern: '/api/v1/transactions/holds/{Khoản tạm giữ}/settlements', name: 'Thanh toán từ tiền tạm giữ' },
  { method: 'POST', pattern: '/api/v1/transactions/transfers', name: 'Chuyển tiền giữa hai ví' },
  { method: 'POST', pattern: '/api/v1/admin/repayment-reconciliation/{Giao dịch trả nợ}/reconcile', name: 'Đối soát giao dịch trả nợ' },
  { method: 'POST', pattern: '/api/v1/admin/repayment-reconciliation/{Giao dịch trả nợ}/repost', name: 'Ghi lại giao dịch trả nợ vào hệ thống lõi' },
  { method: 'POST', pattern: '/api/v1/admin/disbursement-reconciliation/{Lệnh giải ngân}/recheck', name: 'Kiểm tra lại lệnh giải ngân' },
  { method: 'POST', pattern: '/api/v1/admin/withdrawals/{Lệnh rút tiền}/recheck', name: 'Kiểm tra lại lệnh rút tiền' },

  // ── Gọi vốn, sổ lệnh, chợ chuyển nhượng (finora-investment) ──
  { method: 'POST', pattern: `/api/v1/investments/listings/${LISTING}/orders`, name: 'Đặt lệnh góp vốn' },
  { method: 'POST', pattern: '/api/v1/investments/orders/{Lệnh góp vốn}/cancel', name: 'Rút lệnh góp vốn' },
  { method: 'POST', pattern: '/api/v1/investments/order-books/{Sổ lệnh}/orders', name: bookOrderName },
  { method: 'DELETE', pattern: '/api/v1/investments/order-books/orders/{Lệnh mua/bán}', name: 'Hủy lệnh mua/bán phần vốn' },
  { method: 'POST', pattern: `/api/v1/investments/reschedule-consents/${RESCHEDULE}/approve`, name: 'Nhà đầu tư đồng ý cơ cấu nợ' },
  { method: 'POST', pattern: `/api/v1/investments/reschedule-consents/${RESCHEDULE}/reject`, name: 'Nhà đầu tư không đồng ý cơ cấu nợ' },
  { method: 'PUT', pattern: '/api/v1/investments/admin/settings', name: 'Sửa cài đặt gọi vốn' },
  { method: 'POST', pattern: '/api/v1/investments/admin/listings/close-expired', name: 'Đóng các khoản gọi vốn quá hạn' },
  { method: 'POST', pattern: `/api/v1/investments/admin/listings/${LISTING}/finalize`, name: 'Khóa phần vốn của khoản đã giải ngân' },
  { method: 'POST', pattern: `/api/v1/investments/admin/listings/${LISTING}/activate-notes`, name: 'Phát hành phần vốn còn thiếu' },
  { method: 'POST', pattern: '/api/v1/investments/admin/order-incidents/{Lệnh góp vốn}/retry', name: 'Thử lại lệnh góp vốn bị dừng' },
  { method: 'POST', pattern: `/api/v1/investments/admin/order-books/trades/${TRADE}/retry-settlement`, name: 'Thanh toán lại lần khớp' },
  { method: 'POST', pattern: `/api/v1/investments/admin/transfer-documents/${TRADE}/retry`, name: 'Lập lại giấy xác nhận chuyển nhượng' },

  // ── Thông báo (finora-notification) ──
  { method: 'POST', pattern: '/api/v1/notifications/{Thông báo}/read', name: 'Đánh dấu đã đọc thông báo' },
  { method: 'POST', pattern: '/api/v1/notifications/read-all', name: 'Đánh dấu đã đọc mọi thông báo' },
  { method: 'POST', pattern: '/api/v1/notifications/devices', name: 'Đăng ký thiết bị nhận thông báo' },
  { method: 'DELETE', pattern: '/api/v1/notifications/devices/{Thiết bị nhận thông báo}', name: 'Xóa thiết bị nhận thông báo' },
  { method: 'PUT', pattern: '/api/v1/notifications/preferences', name: 'Sửa cài đặt nhận thông báo' },
  { method: 'POST', pattern: '/api/v1/notifications/admin/push-deliveries/{Lượt gửi thông báo}/requeue', name: 'Gửi lại thông báo đẩy' },

  // ── Blockchain ──
  { method: 'POST', pattern: '/api/v1/blockchain/proofs/{Bằng chứng}/verify', name: 'Kiểm tra toàn vẹn bằng chứng' },
  { method: 'POST', pattern: '/api/v1/blockchain/proofs/{Bằng chứng}/retry', name: 'Gửi lại bằng chứng lên blockchain' },

  // ── AI (finora-ai) ──
  { method: 'PUT', pattern: '/api/v1/ai/config/product', name: 'Sửa chính sách đánh giá AI (khoảng điểm, ngưỡng duyệt)' },
  { method: 'PUT', pattern: '/api/v1/ai/config/rules', name: 'Sửa bộ luật chấm điểm' },
  { method: 'POST', pattern: '/api/v1/ai/credit/explain', name: 'Giải thích điểm tín dụng' },
  { method: 'POST', pattern: '/api/v1/ai/ekyc/document', name: 'AI đọc ảnh giấy tờ' },
  { method: 'POST', pattern: '/api/v1/ai/ekyc/liveness', name: 'AI kiểm tra khuôn mặt người thật' },
  { method: 'POST', pattern: '/api/v1/ai/fraud/detect', name: 'Kiểm tra dấu hiệu gian lận' },
];

/*
 * Lượt xem (GET), theo đường dẫn controller thật trong finora-platform (17/11/2026). Đường dẫn chữ cố định đứng trước
 * mẫu có tham số cùng chỗ (`/admin/users/stats` trước `/admin/users/{Người dùng}`) vì mẫu đầu tiên khớp được dùng.
 */
const ACCOUNT = '{Người dùng}';
const ATTEMPT = '{Lượt xác minh danh tính}';
const view = (pattern: string, name: string): ActionRule => ({ method: 'GET', pattern, name });

const VIEW_RULES: ActionRule[] = [
  // ── Người dùng (finora-user) ──
  view('/api/v1/admin/activity-logs', 'Xem nhật ký hoạt động'),
  view('/api/v1/admin/activity-logs/export', 'Xuất nhật ký hoạt động'),
  view('/api/v1/admin/users', 'Xem danh sách người dùng'),
  view('/api/v1/admin/users/stats', 'Xem thống kê người dùng'),
  view('/api/v1/admin/users/stats/series', 'Xem thống kê người dùng'),
  view('/api/v1/admin/users/ekyc-attempts', 'Xem danh sách lượt xác minh danh tính'),
  view(`/api/v1/admin/users/ekyc-attempts/${ATTEMPT}`, 'Xem lượt xác minh danh tính'),
  view(`/api/v1/admin/users/ekyc-attempts/${ATTEMPT}/evidence/{Ảnh, video xác minh}`, 'Xem ảnh, video xác minh danh tính'),
  view(`/api/v1/admin/users/${ACCOUNT}`, 'Xem hồ sơ người dùng'),
  view(`/api/v1/admin/users/${ACCOUNT}/devices`, 'Xem thiết bị đăng nhập của người dùng'),
  view('/api/v1/admin/staff-roles', 'Xem vai trò nhân viên'),
  view('/api/v1/admin/staff-roles/permissions', 'Xem danh mục quyền'),
  view('/api/v1/users/me', 'Xem hồ sơ của mình'),
  view('/api/v1/users/me/devices', 'Xem thiết bị đăng nhập của mình'),
  view('/api/v1/users/me/ekyc-status', 'Xem trạng thái xác minh danh tính'),
  view('/api/v1/users/me/kyc-summary', 'Xem trạng thái xác minh danh tính'),
  view('/api/v1/users/me/pin', 'Xem trạng thái mã PIN giao dịch'),
  view('/api/v1/users/profile/ekyc/consent', 'Xem đồng ý xử lý dữ liệu xác minh danh tính'),

  // ── Khoản vay (finora-loan) ──
  view('/api/v1/admin/loan-applications', 'Xem danh sách hồ sơ vay'),
  view('/api/v1/admin/loan-applications/lookup', 'Tra cứu hồ sơ vay'),
  view('/api/v1/admin/loan-applications/numbers', 'Tra cứu hồ sơ vay'),
  view(`/api/v1/admin/loan-applications/${APP}/assessments`, 'Xem kết quả chấm điểm hồ sơ vay'),
  view(`/api/v1/admin/loan-applications/${APP}/assessments/{Lần chấm điểm}`, 'Xem kết quả chấm điểm hồ sơ vay'),
  view(`/api/v1/admin/loan-applications/${APP}/explanation`, 'Xem giải thích điểm tín dụng'),
  view(`/api/v1/admin/loan-applications/${APP}/review`, 'Xem hồ sơ vay'),
  view('/api/v1/admin/loan-contracts/signing-policy', 'Xem chính sách ký hợp đồng'),
  view(`/api/v1/admin/loan-contracts/${CONTRACT}`, 'Xem hợp đồng vay'),
  view(`/api/v1/admin/loan-contracts/${CONTRACT}/document`, 'Xem văn bản hợp đồng vay'),
  view('/api/v1/admin/loan-products', 'Xem danh sách sản phẩm vay'),
  view(`/api/v1/admin/loan-products/${PRODUCT}`, 'Xem sản phẩm vay'),
  view('/api/v1/admin/loan-reschedule-requests', 'Xem yêu cầu cơ cấu nợ'),
  view('/api/v1/admin/loan-servicing-reconciliation', 'Xem đối soát khoản vay'),
  view('/api/v1/admin/loan-servicing-reconciliation/incidents', 'Xem đối soát khoản vay'),
  view(`/api/v1/admin/loan-servicing-reconciliation/${LOAN}`, 'Xem đối soát khoản vay'),
  view('/api/v1/admin/loan-statistics/series', 'Xem thống kê khoản vay'),
  view('/api/v1/admin/loan-statistics/summary', 'Xem thống kê khoản vay'),
  view(`/api/v1/admin/loans/${LOAN}/installments`, 'Xem kỳ trả nợ của khoản vay'),
  view('/api/v1/admin/repayment-event-quarantine', 'Xem sự kiện trả nợ bị giữ lại'),
  view('/api/v1/admin/collection-cases', 'Xem hồ sơ thu hồi nợ'),
  view('/api/v1/admin/collection-cases/{Hồ sơ thu hồi nợ}/actions', 'Xem lịch sử xử lý thu hồi nợ'),
  view('/api/v1/admin/disbursement-sagas', 'Xem lệnh giải ngân'),
  view(`/api/v1/investor/loan-applications/${APP}/borrower-profile`, 'Xem hồ sơ người vay'),
  view('/api/v1/investor/loan-contracts/me', 'Xem hợp đồng góp vốn của mình'),
  view(`/api/v1/investor/loan-contracts/${CONTRACT}`, 'Xem hợp đồng vay'),
  view(`/api/v1/investor/loan-contracts/${CONTRACT}/document`, 'Xem văn bản hợp đồng vay'),
  view(`/api/v1/investor/loan-contracts/${CONTRACT}/signed-document`, 'Xem văn bản hợp đồng vay đã ký'),
  view(`/api/v1/investor/loan-contracts/${CONTRACT}/receipt`, 'Xem biên nhận hợp đồng vay'),
  view('/api/v1/loan-applications/me', 'Xem hồ sơ vay của mình'),
  view(`/api/v1/loan-applications/${APP}`, 'Xem hồ sơ vay'),
  view(`/api/v1/loan-applications/${APP}/history`, 'Xem lịch sử hồ sơ vay'),
  view('/api/v1/loan-contracts/me', 'Xem hợp đồng vay của mình'),
  view(`/api/v1/loan-contracts/${CONTRACT}`, 'Xem hợp đồng vay'),
  view(`/api/v1/loan-contracts/${CONTRACT}/document`, 'Xem văn bản hợp đồng vay'),
  view(`/api/v1/loan-contracts/${CONTRACT}/signed-document`, 'Xem văn bản hợp đồng vay đã ký'),
  view(`/api/v1/loan-contracts/${CONTRACT}/receipt`, 'Xem biên nhận hợp đồng vay'),
  view(`/api/v1/loan-contracts/${CONTRACT}/history`, 'Xem lịch sử hợp đồng vay'),
  view('/api/v1/loan-products', 'Xem danh sách sản phẩm vay'),
  view(`/api/v1/loan-products/${PRODUCT}`, 'Xem sản phẩm vay'),
  view('/api/v1/loan-purposes', 'Xem danh sách mục đích vay'),
  view('/api/v1/loans/me', 'Xem khoản vay của mình'),
  view('/api/v1/loans/pending-activation', 'Xem khoản vay chờ kích hoạt'),
  view('/api/v1/loans/reschedule-policy', 'Xem chính sách cơ cấu nợ'),
  view(`/api/v1/loans/${LOAN}`, 'Xem khoản vay'),
  view(`/api/v1/loans/${LOAN}/repayment-schedule`, 'Xem lịch trả nợ'),
  view(`/api/v1/loans/${LOAN}/reschedule-policy`, 'Xem chính sách cơ cấu nợ'),
  view(`/api/v1/loans/${LOAN}/reschedule-requests`, 'Xem yêu cầu cơ cấu nợ'),

  // ── Thanh toán (finora-payment) ──
  view('/api/v1/admin/disbursement-reconciliation', 'Xem đối soát giải ngân'),
  view('/api/v1/admin/disbursement-reconciliation/{Lệnh giải ngân}', 'Xem đối soát giải ngân'),
  view('/api/v1/admin/repayment-reconciliation', 'Xem đối soát trả nợ'),
  view('/api/v1/admin/withdrawals', 'Xem danh sách lệnh rút tiền'),
  view('/api/v1/admin/withdrawals/{Lệnh rút tiền}', 'Xem lệnh rút tiền'),
  view('/api/v1/repayments/early-settlement-quotes/{Báo giá}', 'Xem số tiền tất toán trước hạn'),
  view('/api/v1/repayments/partial-prepayment-quotes/{Báo giá}', 'Xem số tiền trả trước một phần'),
  view('/api/v1/repayments/scheduled-due', 'Xem kỳ trả nợ sắp đến hạn'),
  view('/api/v1/repayments/{Giao dịch trả nợ}', 'Xem giao dịch trả nợ'),
  view('/api/v1/transactions/holds', 'Xem tiền tạm giữ'),
  view('/api/v1/wallets/banks', 'Xem danh sách ngân hàng'),
  view('/api/v1/wallets/me', 'Xem ví'),
  view('/api/v1/wallets/me/bank-accounts', 'Xem tài khoản ngân hàng liên kết'),
  view('/api/v1/wallets/me/top-ups/{Lệnh nạp tiền}', 'Xem lệnh nạp tiền'),
  view('/api/v1/wallets/me/transactions', 'Xem lịch sử giao dịch ví'),
  view('/api/v1/wallets/me/withdrawals', 'Xem lệnh rút tiền của mình'),
  view('/api/v1/wallets/me/withdrawals/{Lệnh rút tiền}', 'Xem lệnh rút tiền'),
  view('/api/v1/wallets/withdrawal-policy', 'Xem chính sách rút tiền'),

  // ── Đầu tư (finora-investment) ──
  view('/api/v1/investments/admin/investors/{Nhà đầu tư}/notes', 'Xem phần vốn của nhà đầu tư'),
  view('/api/v1/investments/admin/commitments/{Lệnh góp vốn}/notes', 'Xem phần vốn của lệnh góp vốn'),
  view(`/api/v1/investments/admin/listings/${LISTING}/investors`, 'Xem nhà đầu tư của khoản gọi vốn'),
  view('/api/v1/investments/admin/order-books', 'Xem chợ chuyển nhượng'),
  view('/api/v1/investments/admin/order-books/summary', 'Xem chợ chuyển nhượng'),
  view('/api/v1/investments/admin/order-books/trades', 'Xem danh sách lần khớp lệnh'),
  view(`/api/v1/investments/admin/order-books/trades/${TRADE}`, 'Xem lần khớp lệnh'),
  view(`/api/v1/investments/admin/order-books/trades/${TRADE}/notes`, 'Xem phần vốn của lần khớp lệnh'),
  view(`/api/v1/investments/admin/order-books/${LISTING}`, 'Xem sổ lệnh'),
  view(`/api/v1/investments/admin/order-books/${LISTING}/notes`, 'Xem phần vốn của khoản gọi vốn'),
  view('/api/v1/investments/admin/order-incidents', 'Xem sự cố lệnh góp vốn'),
  view('/api/v1/investments/admin/settings', 'Xem cài đặt gọi vốn'),
  view('/api/v1/investments/admin/statistics/series', 'Xem thống kê đầu tư'),
  view('/api/v1/investments/admin/statistics/summary', 'Xem thống kê đầu tư'),
  view('/api/v1/investments/admin/transfer-documents', 'Xem giấy xác nhận chuyển nhượng'),
  view(`/api/v1/investments/admin/transfer-documents/${TRADE}`, 'Xem giấy xác nhận chuyển nhượng'),
  view(`/api/v1/investments/admin/transfer-documents/${TRADE}/pdf`, 'Tải giấy xác nhận chuyển nhượng'),
  view('/api/v1/investments/commitments', 'Xem lệnh góp vốn của mình'),
  view('/api/v1/investments/order-books', 'Xem chợ chuyển nhượng'),
  view('/api/v1/investments/order-books/orders/mine', 'Xem lệnh mua/bán của mình'),
  view(`/api/v1/investments/order-books/${LISTING}`, 'Xem sổ lệnh'),
  view(`/api/v1/investments/order-books/${LISTING}/me`, 'Xem lệnh của mình trên sổ lệnh'),
  view('/api/v1/investments/portfolio', 'Xem danh mục đầu tư'),
  view('/api/v1/investments/reschedule-consents', 'Xem yêu cầu đồng ý cơ cấu nợ'),
  view(`/api/v1/investments/reschedule-consents/${RESCHEDULE}`, 'Xem yêu cầu đồng ý cơ cấu nợ'),
  view('/api/v1/market/listings', 'Xem danh sách gọi vốn'),
  view(`/api/v1/market/listings/${LISTING}`, 'Xem khoản gọi vốn'),
  view(`/api/v1/market/listings/${LISTING}/progress`, 'Xem tiến độ gọi vốn'),

  // ── Thông báo, blockchain, AI ──
  view('/api/v1/notifications', 'Xem thông báo'),
  view('/api/v1/notifications/unread-count', 'Đếm thông báo chưa đọc'),
  view('/api/v1/notifications/preferences', 'Xem cài đặt thông báo'),
  view('/api/v1/notifications/admin/deferred-events', 'Xem thông báo chờ gửi'),
  view('/api/v1/notifications/admin/push-deliveries', 'Xem tình trạng gửi thông báo đẩy'),
  view('/api/v1/blockchain/proofs', 'Xem bằng chứng blockchain'),
  view('/api/v1/blockchain/proofs/{Bằng chứng}', 'Xem bằng chứng blockchain'),
  view('/api/v1/ai/config/product', 'Xem chính sách đánh giá AI'),
  view('/api/v1/ai/config/rules', 'Xem bộ luật chấm điểm'),
];

interface CompiledRule {
  method: RuleMethod;
  regex: RegExp;
  labels: string[];
  name: ActionRule['name'];
}

const escapeRegex = (text: string) => text.replace(/[.*+?^$()|[\]\\]/g, '\\$&');

/** `/a/{Tên}/b` → regex khớp trọn đường dẫn, mỗi `{...}` là một đoạn không chứa `/`. */
function compile(rule: ActionRule): CompiledRule {
  const labels: string[] = [];
  const source = rule.pattern
    .split(/(\{[^}]+\})/)
    .map((part) => {
      if (part.startsWith('{') && part.endsWith('}')) {
        labels.push(part.slice(1, -1));
        return '([^/]+)';
      }
      return escapeRegex(part);
    })
    .join('');
  return { method: rule.method, regex: new RegExp(`^${source}$`), labels, name: rule.name };
}

const COMPILED = [...RULES, ...VIEW_RULES].map(compile);

/** Số mẫu thao tác trong bảng tra (dùng cho kiểm thử). */
export const ACTION_RULE_COUNT = RULES.length + VIEW_RULES.length;

/** Giá trị trên đường dẫn có thể đã mã hóa URL (khoảng trắng, dấu tiếng Việt); giải mã hỏng thì giữ nguyên. */
function decode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/** `true` với POST/PUT/PATCH/DELETE: các lượt gọi làm thay đổi hoặc gửi yêu cầu, không chỉ xem. */
export const isWriteMethod = (method: string): method is WriteMethod =>
  method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';

/**
 * Tra tên thao tác của một lượt gọi. Trả `null` khi đường dẫn chưa có trong bảng tra (endpoint mới, đường dẫn gõ sai)
 * hoặc phương thức lạ: giao diện khi đó hiện đường dẫn.
 */
export function describeAction(method: string, path: string, body: string | null = null): ActivityAction | null {
  if (method !== 'GET' && !isWriteMethod(method)) return null;
  // Gateway ghi path không kèm query; bỏ dấu `/` cuối để `/api/v1/auth/login/` vẫn khớp.
  const clean = path.length > 1 ? path.replace(/\/+$/, '') : path;
  for (const rule of COMPILED) {
    if (rule.method !== method) continue;
    const match = rule.regex.exec(clean);
    if (!match) continue;
    return {
      name: typeof rule.name === 'function' ? rule.name(body) : rule.name,
      targets: rule.labels.map((label, index) => ({ label, value: decode(match[index + 1]) })),
    };
  }
  return null;
}
