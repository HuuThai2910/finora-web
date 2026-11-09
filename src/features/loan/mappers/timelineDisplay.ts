import { APPLICATION_STATUS_LABELS, formatDate, formatMoney } from '../formatters';
import type { LoanApplicationHistoryItem, LoanApplicationStatus, LoanTimelineItem, TimelineStage } from '../types';
import { AI_POLICY_REJECTED, AI_POLICY_REVIEW, aiReviewReasonLabels, policyRejectionLabels } from './reviewDisplay';

/** Nhãn nhóm mốc; thứ tự cũng là thứ tự nút lọc trên tab Lịch sử xử lý. */
export const TIMELINE_STAGE_LABELS: Record<TimelineStage, string> = {
  APPLICATION: 'Hồ sơ',
  FUNDING: 'Gọi vốn',
  CONTRACT: 'Hợp đồng',
  DISBURSEMENT: 'Giải ngân',
  SERVICING: 'Trả nợ',
  RESTRUCTURE: 'Gia hạn, cơ cấu',
  COLLECTION: 'Thu hồi nợ',
};

export interface TimelineView {
  title: string;
  notes: string[];
  /** Mốc tiêu cực (rút, từ chối, hết hạn, hủy) chấm màu cảnh báo để dễ dò khi lịch sử dài. */
  tone: 'neutral' | 'warning' | 'success';
}

const FUNDING_CANCEL_REASONS: Record<string, string> = {
  BORROWER_WITHDREW: 'Người vay rút hồ sơ.',
  CONTRACT_DECLINED: 'Hợp đồng bị từ chối ký.',
  CONTRACT_EXPIRED: 'Hợp đồng hết hạn ký.',
  DISBURSEMENT_FAILED: 'Giải ngân không thực hiện được khi tiền chưa chuyển.',
};

const RESTRUCTURE_TYPE: Record<string, string> = {
  TERM_EXTENSION: 'gia hạn nợ',
  INSTALLMENT_ADJUSTMENT: 'điều chỉnh kỳ trả',
};

const COLLECTION_ACTIONS: Record<string, string> = {
  REMINDER_SENT: 'Gửi tin nhắc nợ',
  BORROWER_CONTACTED: 'Đã liên hệ người vay',
  PROMISE_TO_PAY: 'Người vay hẹn trả',
  LEGAL_REVIEW: 'Chuyển pháp lý xem xét',
  FIELD_COLLECTION: 'Thu hồi tại địa chỉ',
  WRITE_OFF_RECOMMENDED: 'Đề xuất xóa nợ',
  NOTE: 'Ghi chú nội bộ',
};

const COLLECTION_STAGES: Record<string, string> = {
  EARLY_REMINDER: 'nhắc sớm',
  ATTENTION: 'cần chú ý',
  NPL: 'nợ xấu',
  INTENSIVE: 'thu hồi tích cực',
  LOSS: 'có khả năng mất vốn',
};

const CLOSED_STATUS: Record<string, string> = {
  CURED: 'Người vay đã trả hết phần quá hạn.',
  SETTLED: 'Khoản vay đã tất toán.',
  WRITTEN_OFF: 'Khoản vay đã được xóa nợ.',
  DEFAULTED: 'Khoản vay bị chuyển vỡ nợ.',
};

const REFUNDING_NOTE = 'Khoản vay quay lại sàn để gọi số vốn còn thiếu; nhà đầu tư đã ký vẫn giữ nguyên.';

const money = (amount: number | null) => (amount == null ? null : formatMoney(amount));
const compact = (...notes: Array<string | null | undefined | false>) => notes.filter((note): note is string => !!note);

function applicationStatus(status: string | null): string {
  return status ? APPLICATION_STATUS_LABELS[status as LoanApplicationStatus] ?? status : '';
}

/** Lý do của một lần chuyển trạng thái hồ sơ, dùng chung cho dòng lịch sử cũ và mốc mới. */
function applicationReasons(reasonCode: string | null, reasonDetail: string | null): string[] {
  if (!reasonDetail) return [];
  // Chính sách tự từ chối/chuyển thẩm định: Loan ghi danh sách mã vào reasonDetail nên dịch từng mã.
  if (reasonCode === AI_POLICY_REJECTED) return [policyRejectionLabels(reasonDetail).join('; ')];
  if (reasonCode === AI_POLICY_REVIEW) return [aiReviewReasonLabels(reasonDetail).join('; ')];
  return [reasonDetail];
}

function contractView(item: LoanTimelineItem, name: string): TimelineView {
  const contract = item.reasonDetail ? `hợp đồng ${item.reasonDetail}` : 'hợp đồng';
  switch (item.toStatus) {
    case 'PENDING_LENDER_SIGNATURES':
      return item.reasonCode === 'REFUNDED_CONTRACT_REISSUED'
        ? {
            title: 'Gọi đủ vốn bổ sung, phát hành lại hợp đồng',
            notes: ['Nhà đầu tư đã ký được giữ nguyên chữ ký; nhà đầu tư mới được mời ký.'],
            tone: 'success',
          }
        : { title: `Đã gọi đủ vốn, lập ${contract}`, notes: ['Chờ các nhà đầu tư ký.'], tone: 'success' };
    case 'PENDING_REFUNDING':
      // Nhà đầu tư nào rời đi và phần vốn bao nhiêu nằm ở mốc LENDER_DECLINED/LENDER_EXPIRED cùng thời điểm.
      return {
        title: 'Đưa lại lên sàn gọi vốn bổ sung',
        notes: [
          item.reasonCode === 'LENDER_SIGNATURE_EXPIRED'
            ? 'Hết hạn ký mà vẫn còn nhà đầu tư chưa ký.'
            : 'Một nhà đầu tư rút trước khi ký hợp đồng.',
          REFUNDING_NOTE,
        ],
        tone: 'warning',
      };
    case 'PENDING_SIGNATURE':
      return { title: `Lập ${contract}`, notes: ['Chờ người vay ký.'], tone: 'neutral' };
    case 'PENDING_BORROWER_SIGNATURE':
      return { title: 'Các nhà đầu tư đã ký đủ', notes: ['Chờ người vay ký.'], tone: 'success' };
    case 'SIGNING':
      return { title: 'Người vay đang ký số', notes: [], tone: 'neutral' };
    case 'SIGNED':
      return { title: 'Người vay đã ký hợp đồng', notes: [], tone: 'success' };
    case 'EFFECTIVE':
      return { title: 'Hợp đồng có hiệu lực', notes: ['Đủ chữ ký các bên; bắt đầu giải ngân.'], tone: 'success' };
    case 'DECLINED':
      if (item.reasonCode === 'FUNDING_WITHDRAWN_BY_BORROWER') {
        return { title: 'Người vay rút hồ sơ khi đang gọi vốn bổ sung', notes: ['Hợp đồng đóng.'], tone: 'warning' };
      }
      return item.actorType === 'INVESTOR'
        ? { title: `Nhà đầu tư ${name} từ chối hợp đồng`, notes: ['Hợp đồng đóng.'], tone: 'warning' }
        : { title: 'Người vay từ chối hợp đồng', notes: ['Hợp đồng đóng.'], tone: 'warning' };
    case 'EXPIRED':
      return item.reasonCode === 'FUNDING_EXPIRED'
        ? { title: 'Hợp đồng đóng do hết hạn gọi vốn bổ sung', notes: [], tone: 'warning' }
        : { title: 'Hợp đồng hết hạn ký', notes: [], tone: 'warning' };
    case 'COMPLETED':
      return { title: 'Hợp đồng hoàn tất', notes: [], tone: 'success' };
    default:
      return { title: `Hợp đồng chuyển trạng thái ${item.toStatus ?? ''}`.trim(), notes: [], tone: 'neutral' };
  }
}

function restructureView(item: LoanTimelineItem): TimelineView {
  const kind = RESTRUCTURE_TYPE[item.toStatus ?? ''] ?? 'cơ cấu nợ';
  switch (item.eventCode) {
    case 'RESTRUCTURE_REQUESTED':
      return {
        title: `Người vay yêu cầu ${kind}`,
        notes: compact(item.toStatus === 'TERM_EXTENSION' && item.reasonDetail && `Thêm ${item.reasonDetail} kỳ.`),
        tone: 'neutral',
      };
    case 'RESTRUCTURE_APPROVED':
      return { title: `Duyệt yêu cầu ${kind}`, notes: compact(item.reasonDetail), tone: 'neutral' };
    case 'RESTRUCTURE_REJECTED':
      return { title: `Từ chối yêu cầu ${kind}`, notes: compact(item.reasonDetail), tone: 'warning' };
    case 'RESTRUCTURE_COMPLETED':
      return {
        title: item.toStatus === 'TERM_EXTENSION' ? 'Đã gia hạn nợ' : 'Đã điều chỉnh kỳ trả',
        notes: compact(item.reasonDetail && `Ngày đáo hạn mới ${formatDate(item.reasonDetail)}.`),
        tone: 'success',
      };
    case 'RESTRUCTURE_INVESTOR_REJECTED':
      return { title: `Nhà đầu tư không đồng ý ${kind}`, notes: [], tone: 'warning' };
    case 'RESTRUCTURE_RECONCILIATION_REQUIRED':
      return { title: `Yêu cầu ${kind} cần đối soát`, notes: [], tone: 'warning' };
    case 'RESTRUCTURE_MANUAL_REVIEW':
      return { title: `Yêu cầu ${kind} chờ xử lý thủ công`, notes: [], tone: 'warning' };
    default:
      return { title: `Cập nhật yêu cầu ${kind}`, notes: [], tone: 'neutral' };
  }
}

/** Dịch một mốc sang tiêu đề và ghi chú tiếng Việt; mã lạ vẫn hiện được, không làm vỡ tab. */
export function describeTimelineItem(item: LoanTimelineItem, displayName: (id: string | null) => string): TimelineView {
  const name = displayName(item.actorId);
  switch (item.eventCode) {
    case 'APPLICATION_STATUS':
      return {
        title: applicationStatus(item.toStatus),
        notes: [
          item.fromStatus ? `Chuyển từ ${applicationStatus(item.fromStatus)}` : 'Hồ sơ được khởi tạo',
          ...applicationReasons(item.reasonCode, item.reasonDetail),
        ],
        tone: item.toStatus === 'REJECTED' || item.toStatus === 'WITHDRAWN' ? 'warning' : 'neutral',
      };
    case 'FUNDING_WITHDRAWN_BY_BORROWER':
      return { title: 'Người vay rút hồ sơ khi đang gọi vốn', notes: compact(item.reasonDetail), tone: 'warning' };
    case 'TERMS_ACCEPTED':
      return { title: 'Người vay chấp nhận điều khoản cuối', notes: [], tone: 'neutral' };
    case 'TERMS_DECLINED':
      return { title: 'Người vay từ chối điều khoản cuối', notes: [], tone: 'warning' };
    case 'TERMS_EXPIRED':
      return { title: 'Hết hạn xác nhận điều khoản cuối', notes: [], tone: 'warning' };
    case 'FUNDING_REQUESTED':
      return { title: 'Đưa lên sàn gọi vốn', notes: compact(money(item.amount) && `Cần gọi ${money(item.amount)}.`), tone: 'neutral' };
    case 'FUNDING_EXPIRED':
      return {
        title: 'Hết hạn gọi vốn',
        notes: ['Không gọi đủ vốn trước hạn; tiền giữ được trả lại nhà đầu tư.'],
        tone: 'warning',
      };
    case 'FUNDING_CANCELLED':
      return {
        title: 'Hủy đợt gọi vốn',
        notes: compact(FUNDING_CANCEL_REASONS[item.reasonCode ?? ''], 'Tiền giữ được trả lại nhà đầu tư.'),
        tone: 'warning',
      };
    case 'CONTRACT_STATUS':
      return contractView(item, name);
    case 'LENDER_SIGNED':
      return { title: `Nhà đầu tư ${name} đã ký`, notes: compact(money(item.amount) && `Phần vốn ${money(item.amount)}.`), tone: 'neutral' };
    case 'LENDER_DECLINED':
      return {
        title: `Nhà đầu tư ${name} từ chối ký`,
        notes: compact(money(item.amount) && `Phần vốn ${money(item.amount)} được trả lại ví nhà đầu tư.`),
        tone: 'warning',
      };
    case 'LENDER_EXPIRED':
      return {
        title: `Nhà đầu tư ${name} không ký đúng hạn`,
        notes: compact(money(item.amount) && `Phần vốn ${money(item.amount)} được trả lại ví nhà đầu tư.`),
        tone: 'warning',
      };
    case 'DISBURSEMENT_REQUESTED':
      return { title: 'Yêu cầu giải ngân', notes: compact(money(item.amount)), tone: 'neutral' };
    case 'DISBURSED':
      return { title: 'Đã giải ngân cho người vay', notes: compact(money(item.amount)), tone: 'success' };
    case 'DISBURSEMENT_FAILED':
      return { title: 'Giải ngân thất bại', notes: ['Tiền chưa chuyển; đợt gọi vốn được hủy.'], tone: 'warning' };
    case 'DISBURSEMENT_REPAIR_REQUIRED':
      return { title: 'Giải ngân cần xử lý', notes: ['Tiền đã chuyển nhưng ghi sổ khoản vay chưa xong.'], tone: 'warning' };
    case 'DISBURSEMENT_REPAIRED':
      return { title: 'Đã xử lý sự cố giải ngân', notes: compact(item.reasonDetail), tone: 'neutral' };
    case 'LOAN_ACTIVATED':
      return { title: 'Khoản vay bắt đầu trả nợ', notes: compact(money(item.amount) && `Dư nợ gốc ${money(item.amount)}.`), tone: 'success' };
    case 'COLLECTION_OPENED':
      return {
        title: 'Mở hồ sơ thu hồi nợ',
        notes: compact(
          item.reasonDetail && `Quá hạn ${item.reasonDetail} ngày, mức ${COLLECTION_STAGES[item.toStatus ?? ''] ?? 'thu hồi'}.`,
          money(item.amount) && `Số tiền quá hạn ${money(item.amount)}.`,
        ),
        tone: 'warning',
      };
    case 'COLLECTION_ACTION':
      return {
        title: `Ghi nhận thu hồi: ${COLLECTION_ACTIONS[item.toStatus ?? ''] ?? 'ghi chú'}`,
        notes: compact(money(item.amount) && `Hẹn trả ${money(item.amount)}.`),
        tone: 'neutral',
      };
    case 'COLLECTION_CLOSED':
      return { title: 'Đóng hồ sơ thu hồi nợ', notes: compact(CLOSED_STATUS[item.toStatus ?? '']), tone: 'success' };
    case 'LOAN_CLOSED':
      return {
        title: 'Khoản vay đã đóng',
        notes: compact(CLOSED_STATUS[item.toStatus ?? '']),
        tone: item.toStatus === 'SETTLED' ? 'success' : 'warning',
      };
    default:
      if (item.stage === 'RESTRUCTURE') return restructureView(item);
      return { title: 'Cập nhật hồ sơ', notes: [], tone: 'neutral' };
  }
}

/** Backend cũ chỉ trả `recentHistory`: chuyển sang cùng dạng mốc để tab hiển thị một kiểu. */
export function historyAsTimeline(history: LoanApplicationHistoryItem[]): LoanTimelineItem[] {
  return history.map((item) => ({
    key: `application-${item.id}`,
    occurredAt: item.createdAt,
    stage: 'APPLICATION',
    eventCode: 'APPLICATION_STATUS',
    fromStatus: item.fromStatus,
    toStatus: item.toStatus,
    reasonCode: item.reasonCode,
    reasonDetail: item.reasonDetail,
    actorType: item.actorType,
    actorId: item.actorId,
    amount: null,
  }));
}
