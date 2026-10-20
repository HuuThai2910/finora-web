import { RowMenu } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import {
  aggregateLabel, proofTypeLabel, receiptView, shortCode, statusHint, statusInfo,
} from '../mappers/proofDisplay';
import type { Proof } from '../types';
import { ReceiptBadge, ReceiptHint } from './ReceiptBadge';

interface Props {
  proofs: Proof[];
  openProofId: string | null;
  /** Proof đang được đưa lại hàng đợi; một thao tác một lúc trên cả trang. */
  runningId: string | null;
  onOpen: (proof: Proof) => void;
  onRetry: (proof: Proof) => void;
}

/** Ô "Giao dịch Fabric": chỉ biên nhận Fabric mới có transaction ID và block; MOCK không có gì trên sổ cái. */
function FabricTransactionCell({ proof }: { proof: Proof }) {
  const view = receiptView(proof);
  if (view.kind !== 'fabric' || !view.transactionId) {
    return <td className="bc-muted">{view.kind === 'mock' ? 'Không có, biên nhận MOCK' : 'Chưa có'}</td>;
  }
  return (
    <td>
      <span className="ui-mono" title={view.transactionId}>{shortCode(view.transactionId)}</span>
      {view.blockReference && <span className="ui-sub">Block {view.blockReference}</span>}
    </td>
  );
}

function ProofRow({ proof, open, runningId, onOpen, onRetry }: Omit<Props, 'proofs' | 'openProofId'> & {
  proof: Proof;
  open: boolean;
}) {
  const status = statusInfo(proof.status);
  const hint = statusHint(proof);
  const confirmedAt = proof.receipt?.confirmedAt ?? null;
  const deadLetter = proof.status === 'DEAD_LETTER';

  return (
    <tr
      className={open ? 'clickable is-open' : 'clickable'}
      tabIndex={0}
      aria-label={`Mở proof ${proofTypeLabel(proof.proofType)} của ${proof.aggregateId}`}
      onClick={() => onOpen(proof)}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen(proof);
        }
      }}
    >
      <td>
        <span className="strong">{proofTypeLabel(proof.proofType)}</span>
        <span className="ui-sub">{proof.source.eventType ?? proof.source.service}</span>
      </td>
      <td>
        <span className="ui-mono">{proof.aggregateId}</span>
        <span className="ui-sub">
          {aggregateLabel(proof.aggregateType)}
          {proof.loanApplicationId != null ? `, hồ sơ #${proof.loanApplicationId}` : ''}
        </span>
      </td>
      <td>
        <StatusPill tone={status.tone}>{status.label}</StatusPill>
        {hint && <span className={deadLetter ? 'ui-sub ui-mono' : 'ui-sub'}>{hint}</span>}
      </td>
      <td>
        <ReceiptBadge proof={proof} />
        <ReceiptHint proof={proof} />
      </td>
      <FabricTransactionCell proof={proof} />
      <td>
        {formatDateTime(proof.createdAt)}
        <span className="ui-sub">{confirmedAt ? `Xác nhận ${formatDateTime(confirmedAt)}` : 'Chưa xác nhận'}</span>
      </td>
      {/* Bấm menu không được mở ngăn của dòng (sự kiện từ portal của menu cũng nổi lên cây React). */}
      <td className="act" onClick={(event) => event.stopPropagation()}>
        <RowMenu
          label={`Thao tác với proof ${proof.aggregateId}`}
          items={[
            { key: 'open', label: 'Xem chi tiết và kiểm tra', icon: 'eye', onSelect: () => onOpen(proof) },
            {
              key: 'retry',
              label: runningId === proof.proofId ? 'Đang đưa lại...' : 'Đưa lại hàng đợi gửi',
              icon: 'repeat',
              separatorBefore: true,
              disabled: !deadLetter || runningId != null,
              disabledReason: deadLetter ? undefined : 'Chỉ proof dừng gửi (DEAD_LETTER) mới đưa lại hàng đợi được.',
              onSelect: () => onRetry(proof),
            },
          ]}
        />
      </td>
    </tr>
  );
}

/**
 * Bảng proof: mốc, đối tượng neo, trạng thái gửi, loại biên nhận (MOCK luôn có nhãn cảnh báo), giao dịch và block
 * trên Fabric, thời điểm tạo và xác nhận. Bấm dòng để mở ngăn chi tiết; "Đưa lại hàng đợi" chỉ bật cho DEAD_LETTER.
 */
export function ProofTable({ proofs, openProofId, runningId, onOpen, onRetry }: Props) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table list bc-table">
        <thead>
          <tr>
            <th>Mốc</th>
            <th>Đối tượng neo</th>
            <th>Trạng thái</th>
            <th>Biên nhận</th>
            <th>Giao dịch Fabric</th>
            <th>Tạo lúc</th>
            <th className="act"><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {proofs.map((proof) => (
            <ProofRow
              key={proof.proofId}
              proof={proof}
              open={proof.proofId === openProofId}
              runningId={runningId}
              onOpen={onOpen}
              onRetry={onRetry}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
