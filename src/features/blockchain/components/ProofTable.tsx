import { RowMenu } from '@/components/RowMenu';
import { StatusPill } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import {
  aggregateLabel, chainResultInfo, proofTypeLabel, statusHint, statusInfo,
} from '../mappers/proofDisplay';
import type { Proof } from '../types';

interface Props {
  proofs: Proof[];
  openProofId: string | null;
  /** Proof đang được đưa lại hàng đợi; một thao tác một lúc trên cả trang. */
  runningId: string | null;
  onOpen: (proof: Proof) => void;
  onRetry: (proof: Proof) => void;
}

/** Kết quả gần nhất bằng ngôn ngữ nghiệp vụ; mã giao dịch/hash chỉ nằm trong chi tiết kỹ thuật. */
function IntegrityCell({ proof }: { proof: Proof }) {
  if (proof.provider === 'MOCK') return <td><StatusPill tone="warning">Bản demo</StatusPill><span className="ui-sub">Chưa ghi lên Fabric</span></td>;
  if (!proof.chainCheck) return <td><StatusPill tone="neutral">Chưa kiểm tra</StatusPill><span className="ui-sub">Mở để kiểm tra lại</span></td>;
  const check = chainResultInfo(proof.chainCheck.status);
  return <td><StatusPill tone={check.tone}>{check.label}</StatusPill><span className="ui-sub">{formatDateTime(proof.chainCheck.checkedAt)}</span></td>;
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
      <IntegrityCell proof={proof} />
      <td>
        {formatDateTime(proof.createdAt)}
        <span className="ui-sub">{confirmedAt ? `Xác nhận ${formatDateTime(confirmedAt)}` : 'Chưa xác nhận'}</span>
      </td>
      {/* Bấm menu không được mở ngăn của dòng (sự kiện từ portal của menu cũng nổi lên cây React). */}
      <td className="act" onClick={(event) => event.stopPropagation()}>
        <RowMenu
          label={`Thao tác với proof ${proof.aggregateId}`}
          items={[
            { key: 'open', label: 'Xem kết quả xác minh', icon: 'eye', onSelect: () => onOpen(proof) },
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
 * Bảng proof dùng ngôn ngữ nghiệp vụ; transaction/hash/Fabric block chỉ hiện trong chi tiết kỹ thuật của ngăn bên phải.
 * Bấm dòng để mở kết quả xác minh; "Đưa lại hàng đợi" chỉ bật cho DEAD_LETTER.
 */
export function ProofTable({ proofs, openProofId, runningId, onOpen, onRetry }: Props) {
  return (
    <div className="ui-table-wrap">
      <table className="ui-table list bc-table">
        <thead>
          <tr>
            <th>Nghiệp vụ</th>
            <th>Mã liên quan</th>
            <th>Ghi nhận bằng chứng</th>
            <th>Kết quả gần nhất</th>
            <th>Thời gian</th>
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
