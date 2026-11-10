import type { LoanTimelineItem } from '@/features/loan';

/**
 * Các mốc của đợt gọi vốn đọc từ lịch sử xử lý của Loan (`timeline` trong chi tiết hồ sơ vay quản trị).
 *
 * Investment không lưu ai đã ký hợp đồng, lúc nào mở gọi vốn hay hợp đồng có hiệu lực; Loan có đủ trong timeline (ghép
 * từ history hồ sơ, history hợp đồng và các bên ký). Hàm thuần, chỉ đọc mốc có thật; thiếu mốc nào thì trường đó null để
 * giao diện ẩn đi chứ không đoán.
 */
export interface FundingFacts {
  /**
   * Có đọc được lịch sử hồ sơ vay bên Loan (cần quyền đọc hồ sơ vay). Không có thì các mốc chỉ có trong lịch sử (số vòng
   * gọi vốn bổ sung, yêu cầu giải ngân…) để trống, phần ký hợp đồng lấy từ API hợp đồng quản trị.
   */
  hasTimeline: boolean;
  /** Lần đầu đưa lên sàn (FUNDING_REQUESTED). */
  openedAt: string | null;
  /** Lần đầu đủ vốn và lập hợp đồng (CONTRACT_STATUS → PENDING_LENDER_SIGNATURES). */
  contractIssuedAt: string | null;
  /** Lần gần nhất khoản vay quay lại sàn gọi vốn bổ sung (→ PENDING_REFUNDING). */
  reopenedAt: string | null;
  /** Số lần gọi vốn bổ sung; vòng gọi vốn hiện tại là số này cộng một. */
  reopenCount: number;
  /** Mọi nhà đầu tư đã ký, chờ người vay (→ PENDING_BORROWER_SIGNATURE), lần gần nhất. */
  lendersCompletedAt: string | null;
  /** Người vay ký (→ SIGNED). */
  borrowerSignedAt: string | null;
  /** Người vay từ chối ký (→ DECLINED do người vay). */
  borrowerDeclinedAt: string | null;
  /** Hợp đồng có hiệu lực (→ EFFECTIVE). */
  effectiveAt: string | null;
  /** Trạng thái hợp đồng mới nhất theo Loan (mã gốc). */
  contractStatus: string | null;
  /** Yêu cầu giải ngân (DISBURSEMENT_REQUESTED) và giải ngân xong (DISBURSED). */
  disbursementRequestedAt: string | null;
  disbursedAt: string | null;
  /** Nhà đầu tư đã ký: mã nhà đầu tư → thời điểm ký (mỗi người ký một lần cho mọi phần vốn của mình). */
  signedLenders: Map<string, string>;
  /** Nhà đầu tư từ chối hoặc hết hạn ký (phần vốn đã được nhả, khoản vay gọi vốn bổ sung). */
  leftLenders: Set<string>;
}

/** So hai thời điểm ISO theo giá trị thật (chuỗi có thể khác số chữ số phần giây nên không so chuỗi được). */
const byTime = (a: string, b: string) => new Date(a).getTime() - new Date(b).getTime();

/** Trạng thái hợp đồng không chỉ chuyển một lần (gọi vốn bổ sung phát hành lại): lấy mốc mới nhất hoặc cũ nhất. */
function contractMoments(items: LoanTimelineItem[], status: string): string[] {
  return items
    .filter((item) => item.eventCode === 'CONTRACT_STATUS' && item.toStatus === status)
    .map((item) => item.occurredAt)
    .sort(byTime);
}

const first = (values: string[]): string | null => values[0] ?? null;
const last = (values: string[]): string | null => values[values.length - 1] ?? null;

export function readFundingFacts(timeline: LoanTimelineItem[] | undefined): FundingFacts | null {
  if (!timeline) return null;
  const byCode = (code: string) => timeline.filter((item) => item.eventCode === code).map((item) => item.occurredAt).sort(byTime);
  const contractEvents = timeline
    .filter((item) => item.eventCode === 'CONTRACT_STATUS')
    .sort((a, b) => byTime(a.occurredAt, b.occurredAt));

  const signedLenders = new Map<string, string>();
  const leftLenders = new Set<string>();
  timeline.forEach((item) => {
    if (!item.actorId) return;
    if (item.eventCode === 'LENDER_SIGNED') signedLenders.set(item.actorId, item.occurredAt);
    if (item.eventCode === 'LENDER_DECLINED' || item.eventCode === 'LENDER_EXPIRED') leftLenders.add(item.actorId);
  });

  const reopened = contractMoments(timeline, 'PENDING_REFUNDING');
  const declined = timeline
    .filter((item) => item.eventCode === 'CONTRACT_STATUS' && item.toStatus === 'DECLINED' && item.actorType === 'BORROWER')
    .map((item) => item.occurredAt)
    .sort(byTime);

  return {
    hasTimeline: true,
    openedAt: first(byCode('FUNDING_REQUESTED')),
    contractIssuedAt: first(contractMoments(timeline, 'PENDING_LENDER_SIGNATURES')),
    reopenedAt: last(reopened),
    reopenCount: reopened.length,
    lendersCompletedAt: last(contractMoments(timeline, 'PENDING_BORROWER_SIGNATURE')),
    borrowerSignedAt: last(contractMoments(timeline, 'SIGNED')),
    borrowerDeclinedAt: last(declined),
    effectiveAt: last(contractMoments(timeline, 'EFFECTIVE')),
    contractStatus: contractEvents[contractEvents.length - 1]?.toStatus ?? null,
    disbursementRequestedAt: last(byCode('DISBURSEMENT_REQUESTED')),
    disbursedAt: last(byCode('DISBURSED')),
    signedLenders,
    leftLenders,
  };
}

/** Các nhóm mốc thuộc đợt gọi vốn; thẩm định hồ sơ và trả nợ nằm ở trang hồ sơ vay. */
const FUNDING_STAGES = new Set(['FUNDING', 'CONTRACT', 'DISBURSEMENT']);

/**
 * Lịch sử xử lý của đợt gọi vốn: lọc timeline Loan theo nhóm gọi vốn, đổi số hợp đồng tra cứu (`LC-…`) sang mã hiển thị
 * (`HĐ-…`) và ghép thêm mốc phát hành phần vốn của Investment (Loan không có). Mới nhất ở trên như backend.
 */
export function fundingHistory(
  timeline: LoanTimelineItem[],
  contract: { number: string | null; code: string | null | undefined },
  notesIssued: { at: string; count: number } | null,
): LoanTimelineItem[] {
  const items = timeline
    .filter((item) => FUNDING_STAGES.has(item.stage))
    .map((item) => (contract.code && contract.number && item.reasonDetail === contract.number
      ? { ...item, reasonDetail: contract.code }
      : item));
  if (notesIssued) {
    items.push({
      key: 'investment-notes-issued',
      occurredAt: notesIssued.at,
      stage: 'DISBURSEMENT',
      eventCode: 'NOTES_ISSUED',
      fromStatus: null,
      toStatus: null,
      reasonCode: null,
      reasonDetail: `${notesIssued.count} phần vốn cho các nhà đầu tư.`,
      actorType: 'SYSTEM',
      actorId: 'SYSTEM',
      amount: null,
    });
  }
  return items.sort((a, b) => byTime(b.occurredAt, a.occurredAt));
}
