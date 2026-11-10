/**
 * Bảng tra thao tác ghi (POST/PUT/PATCH/DELETE) → tên việc người gọi đã làm, cho Nhật ký hoạt động.
 *
 * Gateway không đổi đường dẫn khi chuyển tiếp (không RewritePath/StripPrefix), nên mẫu ở đây là đường dẫn thật của
 * controller trong finora-platform (cập nhật 10/11/2026, đủ mọi endpoint ghi đi qua Gateway). Nhiều thao tác không gửi
 * body (đánh dấu đã đọc, lập lại giấy xác nhận, làm mới phiên...): khi đó chỉ đường dẫn cho biết người dùng làm gì.
 *
 * Mẫu viết theo kiểu Spring, chỗ `{...}` là tham số trên đường dẫn và chữ trong ngoặc là tên dễ hiểu của tham số đó
 * (hiện ở dòng "Đối tượng"). Không khớp mẫu nào thì trả `null` để giao diện giữ cách hiển thị cũ, không đoán bừa.
 * GET không tra: xem dữ liệu thì đường dẫn đã đủ nói lên việc đang làm.
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

interface ActionRule {
  method: WriteMethod;
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

interface CompiledRule {
  method: WriteMethod;
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

const COMPILED = RULES.map(compile);

/** Số mẫu thao tác trong bảng tra (dùng cho kiểm thử). */
export const ACTION_RULE_COUNT = RULES.length;

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
 * Tra tên thao tác của một lượt gọi ghi. Trả `null` khi là GET hoặc đường dẫn chưa có trong bảng tra
 * (endpoint mới, đường dẫn gõ sai): giao diện khi đó hiện nhãn phương thức và đường dẫn như cũ.
 */
export function describeAction(method: string, path: string, body: string | null = null): ActivityAction | null {
  if (!isWriteMethod(method)) return null;
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
