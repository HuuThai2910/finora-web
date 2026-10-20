import { formatDateTime } from '@/utils';
import {
  AGGREGATE_LABEL, ARTIFACT_RESULT_INFO, CHAIN_RESULT_INFO, PROOF_TYPE_LABEL, PROVIDER_LABEL, REFERENCE_TYPES,
  STATUS_INFO, type Tagged,
} from '../constants';
import type { Proof } from '../types';

/**
 * Tra bảng nhãn theo giá trị backend trả về. Kiểu TypeScript chỉ biết các giá trị hiện có; backend bổ sung giá trị mới
 * thì trả `undefined` để nơi gọi hiện nguyên văn thay vì vỡ giao diện.
 */
function lookup<V>(table: Record<string, V>, key: string): V | undefined {
  return Object.prototype.hasOwnProperty.call(table, key) ? table[key] : undefined;
}

const raw = (value: string): Tagged => ({ label: value, tone: 'neutral' });

export const proofTypeLabel = (value: string): string => lookup(PROOF_TYPE_LABEL, value) ?? value;
export const aggregateLabel = (value: string): string => lookup(AGGREGATE_LABEL, value) ?? value;
export const providerLabel = (value: string): string => lookup(PROVIDER_LABEL, value) ?? value;
/** Loại tham chiếu viết thường để đặt trong câu ("Đang tra theo hồ sơ vay 123"). */
export const referenceNoun = (value: string): string =>
  REFERENCE_TYPES.find((item) => item.value === value)?.noun ?? value;
export const statusInfo = (value: string): Tagged => lookup(STATUS_INFO, value) ?? raw(value);
export const chainResultInfo = (value: string): Tagged => lookup(CHAIN_RESULT_INFO, value) ?? raw(value);
export const artifactResultInfo = (value: string): Tagged => lookup(ARTIFACT_RESULT_INFO, value) ?? raw(value);

/** Mã dài (hash, transaction ID) rút gọn cho vừa ô bảng; bản đầy đủ nằm ở `title` và ngăn chi tiết. */
export function shortCode(value: string, head = 10, tail = 6): string {
  return value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/**
 * Cách đọc biên nhận của một proof. Chỉ biên nhận `FABRIC_ON_CHAIN` mới có giao dịch và block trên Hyperledger Fabric;
 * biên nhận MOCK luôn là dữ liệu demo. Proof chưa xác nhận thì chưa có biên nhận, chỉ biết sẽ ghi lên sổ cái nào.
 */
export type ReceiptView =
  | { kind: 'fabric'; transactionId: string | null; blockReference: string | null; confirmedAt: string | null }
  | { kind: 'mock'; receiptId: string | null; confirmedAt: string | null; notice: string | null }
  | { kind: 'unknown'; label: string }
  | { kind: 'none' };

export function receiptView(proof: Proof): ReceiptView {
  const receipt = proof.receipt;
  if (!receipt) return { kind: 'none' };
  if (receipt.kind === 'FABRIC_ON_CHAIN' && receipt.onChain) {
    return {
      kind: 'fabric',
      transactionId: receipt.transactionId,
      blockReference: receipt.blockReference,
      confirmedAt: receipt.confirmedAt,
    };
  }
  if (receipt.kind === 'MOCK_NOT_ON_CHAIN') {
    return { kind: 'mock', receiptId: receipt.transactionId, confirmedAt: receipt.confirmedAt, notice: receipt.notice };
  }
  // Loại lạ hoặc dữ liệu tự mâu thuẫn (Fabric nhưng onChain=false): không bao giờ trình bày như giao dịch trên sổ cái.
  return { kind: 'unknown', label: receipt.kind };
}

/** Dòng phụ của cột trạng thái: lần gửi, lượt kế tiếp hoặc mã lỗi khiến proof dừng gửi. */
export function statusHint(proof: Proof): string | null {
  if (proof.status === 'DEAD_LETTER') return proof.lastErrorCode ?? `Đã gửi ${proof.attemptCount} lần`;
  if (proof.status === 'PENDING' && proof.nextAttemptAt) {
    return `Lần gửi ${proof.attemptCount}, lượt sau ${formatDateTime(proof.nextAttemptAt)}`;
  }
  if (proof.status === 'PROCESSING') return 'Đang chờ sổ cái xác nhận';
  return null;
}
