import { StatusPill } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import { artifactResultInfo, chainResultInfo } from '../mappers/proofDisplay';
import type { ProofVerification } from '../types';

function Row({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="bc-stack">
      <dt>{label}</dt>
      <dd><span className="bc-hash">{value}</span></dd>
    </div>
  );
}

/**
 * Hai kết quả kiểm của một proof, hiển thị tách bạch: dữ liệu gốc so với hash đã neo (chỉ khi có dán dữ liệu gốc),
 * và cơ sở dữ liệu so với bản ghi trên Fabric. Nhãn và màu theo đúng mã kết quả backend trả về.
 */
export function VerifyResults({ result }: { result: ProofVerification }) {
  const { artifact, chain } = result;
  const artifactInfo = artifact ? artifactResultInfo(artifact.result) : null;
  const chainInfo = chainResultInfo(chain.result);

  return (
    <div className="bc-results" role="status">
      <div className="bc-result">
        <div className="bc-result-head">
          <h4>Dữ liệu gốc so với hash đã neo</h4>
          {artifactInfo
            ? <StatusPill tone={artifactInfo.tone}>{artifactInfo.label}</StatusPill>
            : <StatusPill tone="neutral">Không kiểm</StatusPill>}
        </div>
        {artifact ? (
          <dl className="ui-rows bc-rows">
            <div><dt>Cách tính</dt><dd>{artifact.scheme}</dd></div>
            <Row label="Hash đã neo" value={artifact.expectedHash} />
            <Row label="Hash tính lại từ dữ liệu gốc" value={artifact.recomputedHash} />
          </dl>
        ) : (
          <p className="bc-muted">Không dán dữ liệu gốc nên lần này chỉ đối chiếu cơ sở dữ liệu với sổ cái.</p>
        )}
      </div>

      <div className="bc-result">
        <div className="bc-result-head">
          <h4>Cơ sở dữ liệu so với sổ cái Fabric</h4>
          <StatusPill tone={chainInfo.tone}>{chainInfo.label}</StatusPill>
        </div>
        {chain.detail && <p className="bc-muted bc-break">{chain.detail}</p>}
        {(chain.transactionId || chain.payloadHash || chain.recordedAt || chain.submitterMspId) && (
          <dl className="ui-rows bc-rows">
            <Row label="Mã giao dịch trên sổ cái" value={chain.transactionId} />
            <Row label="Hash trên sổ cái" value={chain.payloadHash} />
            {chain.recordedAt && <div><dt>Ghi lên sổ cái lúc</dt><dd>{formatDateTime(chain.recordedAt)}</dd></div>}
            {chain.submitterMspId && <div><dt>Tổ chức ghi (MSP)</dt><dd>{chain.submitterMspId}</dd></div>}
          </dl>
        )}
      </div>

      <p className="bc-muted">Kiểm lúc {formatDateTime(result.verifiedAt)}.</p>
    </div>
  );
}
