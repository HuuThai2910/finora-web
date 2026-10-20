import { StatusPill } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import { MOCK_RECEIPT_TAG } from '../constants';
import { chainResultInfo, providerLabel, receiptView } from '../mappers/proofDisplay';
import type { Proof } from '../types';

/**
 * Nhãn loại biên nhận. Chỉ `FABRIC_ON_CHAIN` mới là giao dịch trên Hyperledger Fabric; biên nhận MOCK luôn mang nhãn
 * cảnh báo khác chữ và khác màu để không thể đọc nhầm là bằng chứng trên sổ cái (B50, LEGAL-DATA-01).
 */
export function ReceiptBadge({ proof }: { proof: Proof }) {
  const view = receiptView(proof);
  if (view.kind === 'fabric') return <StatusPill tone="success">Trên Fabric</StatusPill>;
  if (view.kind === 'mock') return <StatusPill tone={MOCK_RECEIPT_TAG.tone}>{MOCK_RECEIPT_TAG.label}</StatusPill>;
  if (view.kind === 'unknown') return <StatusPill tone="neutral">{view.label}</StatusPill>;
  return <StatusPill tone="neutral">Chưa có biên nhận</StatusPill>;
}

/** Dòng phụ dưới nhãn biên nhận trong bảng: kết quả đối chiếu sổ cái, cảnh báo demo hoặc sổ cái sẽ ghi. */
export function ReceiptHint({ proof }: { proof: Proof }) {
  const view = receiptView(proof);
  if (view.kind === 'mock') return <span className="ui-sub">Dữ liệu demo, không ghi lên Hyperledger Fabric</span>;
  if (view.kind === 'fabric') {
    if (!proof.chainCheck) return <span className="ui-sub">Chưa đối chiếu với sổ cái</span>;
    const check = chainResultInfo(proof.chainCheck.status);
    return (
      <span className={check.tone === 'danger' ? 'ui-sub bc-bad' : 'ui-sub'}>
        Đối chiếu: {check.label}
        {proof.chainCheck.checkedAt ? `, ${formatDateTime(proof.chainCheck.checkedAt)}` : ''}
      </span>
    );
  }
  if (view.kind === 'none') return <span className="ui-sub">Sẽ ghi lên {providerLabel(proof.provider)}</span>;
  return null;
}
