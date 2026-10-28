import { StatusPill } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import { artifactResultInfo, chainResultInfo } from '../mappers/proofDisplay';
import type { ProofVerification } from '../types';

const CHAIN_SUMMARY: Record<string, { title: string; description: string }> = {
  MATCHED: {
    title: 'Dữ liệu đang lưu khớp với sổ cái',
    description: 'Không phát hiện thay đổi giữa bản ghi của FINORA và bằng chứng trên Hyperledger Fabric.',
  },
  MISMATCHED: {
    title: 'Dữ liệu không khớp với sổ cái',
    description: 'Cần chuyển cho bộ phận kỹ thuật hoặc kiểm toán kiểm tra trước khi tiếp tục sử dụng bản ghi này.',
  },
  MISSING_ON_CHAIN: {
    title: 'Không tìm thấy bằng chứng trên sổ cái',
    description: 'Bản ghi FINORA có thông tin giao dịch nhưng sổ cái không trả về bằng chứng tương ứng.',
  },
  NOT_ON_CHAIN_MOCK: {
    title: 'Bản demo không nằm trên Fabric',
    description: 'Luồng đã được mô phỏng thành công nhưng chưa tạo bằng chứng trên mạng Hyperledger Fabric.',
  },
  NOT_CONFIRMED: {
    title: 'Bằng chứng chưa được xác nhận',
    description: 'Hệ thống vẫn đang chờ hoàn tất bước ghi nhận lên sổ cái.',
  },
  LEDGER_UNAVAILABLE: {
    title: 'Chưa thể kết nối sổ cái',
    description: 'Không thể thực hiện đối chiếu lúc này. Dữ liệu nghiệp vụ không bị thay đổi bởi lỗi kết nối này.',
  },
};

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
  const summary = CHAIN_SUMMARY[chain.result] ?? { title: chainInfo.label, description: chain.detail ?? '' };

  return (
    <div className="bc-results" role="status">
      <div className="bc-result">
        <div className="bc-result-head">
          <h4>{summary.title}</h4>
          <StatusPill tone={chainInfo.tone}>{chainInfo.label}</StatusPill>
        </div>
        <p className="bc-result-description">{summary.description}</p>
        {chain.detail && <p className="bc-muted bc-break">Chi tiết: {chain.detail}</p>}
      </div>

      {artifact && (
        <div className="bc-result">
          <div className="bc-result-head">
            <h4>Dữ liệu nguồn {artifact.result === 'MATCHED' ? 'không bị thay đổi' : 'đã khác bằng chứng ban đầu'}</h4>
            {artifactInfo && <StatusPill tone={artifactInfo.tone}>{artifactInfo.label}</StatusPill>}
          </div>
          <p className="bc-result-description">
            {artifact.result === 'MATCHED'
              ? 'Dữ liệu nguồn tạo ra đúng dấu vân tay đã được lưu khi giao dịch xảy ra.'
              : 'Dữ liệu vừa cung cấp không tạo ra cùng dấu vân tay. Hãy kiểm tra lại đúng sự kiện nguồn.'}
          </p>
        </div>
      )}

      <details className="bc-result-technical">
        <summary>Thông số của lần kiểm tra</summary>
        <dl className="ui-rows bc-rows">
          {artifact && <div><dt>Cách tính dấu vân tay</dt><dd>{artifact.scheme}</dd></div>}
          {artifact && <Row label="Hash đã lưu" value={artifact.expectedHash} />}
          {artifact && <Row label="Hash tính lại" value={artifact.recomputedHash} />}
          <Row label="Mã giao dịch trên sổ cái" value={chain.transactionId} />
          <Row label="Hash trên sổ cái" value={chain.payloadHash} />
          {chain.recordedAt && <div><dt>Ghi lên sổ cái lúc</dt><dd>{formatDateTime(chain.recordedAt)}</dd></div>}
          {chain.submitterMspId && <div><dt>Tổ chức ghi</dt><dd>{chain.submitterMspId}</dd></div>}
          <div><dt>Kiểm tra lúc</dt><dd>{formatDateTime(result.verifiedAt)}</dd></div>
        </dl>
      </details>
    </div>
  );
}
