import type { ReactNode } from 'react';
import { StatusPill } from '@/components/StatusPill';
import { EMPTY, formatDateTime } from '@/utils';
import {
  aggregateLabel, chainResultInfo, proofTypeLabel, providerLabel, receiptView, statusInfo,
} from '../mappers/proofDisplay';
import type { Proof } from '../types';
import { ReceiptBadge } from './ReceiptBadge';

/** Một dòng nhãn: giá trị; `stack` xếp giá trị dài (hash, mã giao dịch) xuống dưới nhãn để xuống dòng đúng chỗ. */
function Fact({ label, children, stack = false }: { label: string; children: ReactNode; stack?: boolean }) {
  return (
    <div className={stack ? 'bc-stack' : undefined}>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function Overview({ proof }: { proof: Proof }) {
  const status = statusInfo(proof.status);
  return (
    <dl className="ui-rows bc-rows">
      <Fact label="Mốc">{proofTypeLabel(proof.proofType)}</Fact>
      <Fact label={aggregateLabel(proof.aggregateType)}><span className="ui-mono">{proof.aggregateId}</span></Fact>
      <Fact label="Hồ sơ vay">{proof.loanApplicationId != null ? `#${proof.loanApplicationId}` : 'Không gắn hồ sơ vay'}</Fact>
      <Fact label="Sổ cái">{providerLabel(proof.provider)}</Fact>
      <Fact label="Trạng thái gửi"><StatusPill tone={status.tone}>{status.label}</StatusPill></Fact>
      <Fact label="Số lần gửi">{proof.attemptCount}</Fact>
      {proof.nextAttemptAt && <Fact label="Lượt gửi sau">{formatDateTime(proof.nextAttemptAt)}</Fact>}
      {proof.lastErrorCode && (
        <Fact label="Lỗi gần nhất" stack>
          <span className="ui-mono">{proof.lastErrorCode}</span>
          {proof.lastErrorDetail && <span className="ui-sub bc-break">{proof.lastErrorDetail}</span>}
        </Fact>
      )}
      <Fact label="Tạo lúc">{formatDateTime(proof.createdAt)}</Fact>
      <Fact label="Cập nhật">{formatDateTime(proof.updatedAt)}</Fact>
    </dl>
  );
}

function HashFacts({ proof }: { proof: Proof }) {
  return (
    <dl className="ui-rows bc-rows">
      <Fact label="SHA-256 đã neo" stack><span className="bc-hash">{proof.hash.value}</span></Fact>
      <Fact label="Cách tính">{proof.hash.scheme} (phiên bản {proof.hash.version})</Fact>
      <Fact label="Mô tả" stack><span className="bc-plain">{proof.hash.description}</span></Fact>
    </dl>
  );
}

function SourceFacts({ proof }: { proof: Proof }) {
  const { source } = proof;
  return (
    <>
      <p className="bc-muted">Lấy object data của event này ở service nguồn để tính lại hash ở phần kiểm tra bên dưới.</p>
      <dl className="ui-rows bc-rows">
        <Fact label="Service">{source.service}</Fact>
        <Fact label="Event">
          {source.eventType ? `${source.eventType}${source.eventVersion != null ? ` v${source.eventVersion}` : ''}` : 'Không ghi nhận'}
        </Fact>
        <Fact label="Mã event" stack><span className="bc-hash">{source.eventId}</span></Fact>
        <Fact label="Xảy ra lúc">{source.occurredAt ? formatDateTime(source.occurredAt) : EMPTY}</Fact>
      </dl>
    </>
  );
}

function ReceiptFacts({ proof }: { proof: Proof }) {
  const view = receiptView(proof);
  if (view.kind === 'none') {
    return <p className="bc-muted">Chưa có biên nhận: proof chưa được sổ cái xác nhận.</p>;
  }
  return (
    <dl className="ui-rows bc-rows">
      <Fact label="Loại biên nhận"><ReceiptBadge proof={proof} /></Fact>
      {view.kind === 'fabric' && (
        <>
          <Fact label="Mã giao dịch Fabric" stack><span className="bc-hash">{view.transactionId ?? EMPTY}</span></Fact>
          <Fact label="Block">{view.blockReference ?? EMPTY}</Fact>
          <Fact label="Xác nhận lúc">{formatDateTime(view.confirmedAt)}</Fact>
        </>
      )}
      {view.kind === 'mock' && (
        <>
          {/* Mã biên nhận MOCK không phải giao dịch Fabric: ghi rõ ngay ở nhãn. */}
          <Fact label="Mã biên nhận MOCK (không phải giao dịch Fabric)" stack>
            <span className="bc-hash">{view.receiptId ?? EMPTY}</span>
          </Fact>
          <Fact label="Ghi nhận lúc">{formatDateTime(view.confirmedAt)}</Fact>
        </>
      )}
    </dl>
  );
}

function ChainCheckFacts({ proof }: { proof: Proof }) {
  if (proof.provider !== 'HYPERLEDGER_FABRIC') {
    return <p className="bc-muted">Proof MOCK không có bản ghi trên Fabric nên không đối chiếu với sổ cái.</p>;
  }
  if (!proof.chainCheck) return <p className="bc-muted">Chưa đối chiếu với sổ cái. Bấm "Kiểm tra" bên dưới để đối chiếu.</p>;
  const check = chainResultInfo(proof.chainCheck.status);
  return (
    <dl className="ui-rows bc-rows">
      <Fact label="Kết quả"><StatusPill tone={check.tone}>{check.label}</StatusPill></Fact>
      <Fact label="Kiểm lúc">{formatDateTime(proof.chainCheck.checkedAt)}</Fact>
    </dl>
  );
}

/**
 * Thông tin của một proof trong ngăn chi tiết: tổng quan, hash đã neo, event nguồn (để kiểm toán tự lấy dữ liệu gốc),
 * biên nhận sổ cái và lần đối chiếu gần nhất. Chỉ hiển thị đúng dữ liệu backend trả về, không suy ra kết luận.
 */
export function ProofFacts({ proof }: { proof: Proof }) {
  return (
    <>
      <section aria-label="Tổng quan proof"><Overview proof={proof} /></section>
      <section aria-labelledby="bc-hash-title">
        <h3 id="bc-hash-title">Hash đã neo</h3>
        <HashFacts proof={proof} />
      </section>
      <section aria-labelledby="bc-source-title">
        <h3 id="bc-source-title">Event nguồn</h3>
        <SourceFacts proof={proof} />
      </section>
      <section aria-labelledby="bc-receipt-title">
        <h3 id="bc-receipt-title">Biên nhận sổ cái</h3>
        <ReceiptFacts proof={proof} />
      </section>
      <section aria-labelledby="bc-check-title">
        <h3 id="bc-check-title">Đối chiếu gần nhất</h3>
        <ChainCheckFacts proof={proof} />
      </section>
    </>
  );
}
