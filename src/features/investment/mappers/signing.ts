import type { PillTone } from '@/components/StatusPill';
import { parseDecimal } from '../formatters';
import type { ListingInvestor } from '../types';
import type { FundingFacts } from './loanTimeline';

/** Chữ ký hợp đồng của một nhà đầu tư: đã ký, chưa ký, không ký (từ chối/hết hạn, phần vốn đã nhả). */
export type LenderSign = 'SIGNED' | 'UNSIGNED' | 'LEFT';

export const LENDER_SIGN_PILL: Record<LenderSign, { label: string; tone: PillTone }> = {
  SIGNED: { label: 'Đã ký', tone: 'success' },
  UNSIGNED: { label: 'Chưa ký', tone: 'warning' },
  LEFT: { label: 'Không ký', tone: 'danger' },
};

/**
 * Trạng thái ký của một phần vốn, theo nhà đầu tư sở hữu nó (mỗi người ký một lần cho mọi phần vốn của mình).
 *
 * Chỉ trả lời khi có hợp đồng và đã đọc được lịch sử từ Loan; phần vốn đã hủy mà không có mốc từ chối/hết hạn ký là
 * tiền nhả vì lý do khác (tự rút trước khi đủ vốn, khoản đóng) nên không gắn trạng thái ký.
 */
export function lenderSign(investor: ListingInvestor, facts: FundingFacts | null, hasContract: boolean): LenderSign | null {
  if (!facts || !hasContract) return null;
  if (facts.signedLenders.has(investor.investorId)) return 'SIGNED';
  if (investor.status === 'CANCELLED') return facts.leftLenders.has(investor.investorId) ? 'LEFT' : null;
  return 'UNSIGNED';
}

export interface SigningSummary {
  /** Nhà đầu tư là bên của hợp đồng (phần vốn chưa hủy hoặc đã ký), đếm theo người. */
  lenderCount: number;
  signedCount: number;
  signedAmount: number;
  totalAmount: number;
  /** Phần vốn của nhà đầu tư chưa ký, lớn trước. */
  unsigned: ListingInvestor[];
  /** Phần vốn đã nhả vì nhà đầu tư không ký. */
  left: ListingInvestor[];
}

export function summarizeSigning(investors: ListingInvestor[], facts: FundingFacts): SigningSummary {
  // Các bên của hợp đồng: phần vốn còn hiệu lực, cộng phần đã ký mà sau đó được hoàn (khoản bị hủy vì người vay từ chối).
  const live = investors.filter((item) => item.status !== 'CANCELLED' || facts.signedLenders.has(item.investorId));
  const amount = (item: ListingInvestor) => parseDecimal(item.amount) ?? 0;
  const lenders = new Set(live.map((item) => item.investorId));
  const signed = live.filter((item) => facts.signedLenders.has(item.investorId));
  return {
    lenderCount: lenders.size,
    signedCount: new Set(signed.map((item) => item.investorId)).size,
    signedAmount: signed.reduce((sum, item) => sum + amount(item), 0),
    totalAmount: live.reduce((sum, item) => sum + amount(item), 0),
    unsigned: live.filter((item) => !facts.signedLenders.has(item.investorId)).sort((a, b) => amount(b) - amount(a)),
    left: investors.filter((item) => item.status === 'CANCELLED' && facts.leftLenders.has(item.investorId)),
  };
}
