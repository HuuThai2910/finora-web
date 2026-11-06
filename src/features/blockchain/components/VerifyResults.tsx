import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { formatDateTime, saveBlob } from '@/utils';
import { artifactResultInfo, chainResultInfo } from '../mappers/proofDisplay';
import {
  BC_DETAILS, BC_DETAILS_SUMMARY, BC_HASH, BC_MUTED, BC_RESULT, BC_RESULT_DESCRIPTION, BC_RESULT_HEAD, BC_STACK_ROW,
} from '../styles';
import { verificationExport } from '../mappers/verificationExport';
import type { Proof, ProofVerification } from '../types';
import { CopyableCode } from './CopyButton';

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
    <div className={BC_STACK_ROW}>
      <dt>{label}</dt>
      <dd><CopyableCode className={BC_HASH} value={value} label={`Chép ${label.toLowerCase()}`} /></dd>
    </div>
  );
}

/**
 * Hai kết quả kiểm của một proof, hiển thị tách bạch: dữ liệu gốc so với hash đã neo (chỉ khi có dán dữ liệu gốc),
 * và cơ sở dữ liệu so với bản ghi trên Fabric. Nhãn và màu theo đúng mã kết quả backend trả về.
 */
export function VerifyResults({ result, proof }: {
  result: ProofVerification;
  /** Có thì hiện nút tải tệp JSON gồm bằng chứng và kết quả lần kiểm này. */
  proof?: Proof;
}) {
  const { artifact, chain } = result;
  const artifactInfo = artifact ? artifactResultInfo(artifact.result) : null;
  const chainInfo = chainResultInfo(chain.result);
  const summary = CHAIN_SUMMARY[chain.result] ?? { title: chainInfo.label, description: chain.detail ?? '' };

  return (
    <div className="bc-results grid gap-3" role="status">
      <div className={BC_RESULT}>
        <div className={BC_RESULT_HEAD}>
          <h4>{summary.title}</h4>
          <StatusPill tone={chainInfo.tone}>{chainInfo.label}</StatusPill>
        </div>
        <p className={BC_RESULT_DESCRIPTION}>{summary.description}</p>
        {chain.detail && (
          <p className={`${BC_MUTED} bc-break whitespace-normal wrap-anywhere`}>Chi tiết: {chain.detail}</p>
        )}
      </div>

      {artifact && (
        <div className={BC_RESULT}>
          <div className={BC_RESULT_HEAD}>
            <h4>Dữ liệu nguồn {artifact.result === 'MATCHED' ? 'không bị thay đổi' : 'đã khác bằng chứng ban đầu'}</h4>
            {artifactInfo && <StatusPill tone={artifactInfo.tone}>{artifactInfo.label}</StatusPill>}
          </div>
          <p className={BC_RESULT_DESCRIPTION}>
            {artifact.result === 'MATCHED'
              ? 'Dữ liệu nguồn tạo ra đúng dấu vân tay đã được lưu khi giao dịch xảy ra.'
              : 'Dữ liệu vừa cung cấp không tạo ra cùng dấu vân tay. Hãy kiểm tra lại đúng sự kiện nguồn.'}
          </p>
        </div>
      )}

      <details className={`bc-result-technical ${BC_DETAILS}`}>
        <summary className={BC_DETAILS_SUMMARY}>Thông số của lần kiểm tra</summary>
        <dl className="ui-rows bc-rows mt-1 px-3 pb-3">
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
      {proof && (
        <button
          type="button"
          className="ui-btn ghost bc-download [justify-self:start]"
          onClick={() => {
            const file = verificationExport(proof, result);
            saveBlob(file.blob, file.fileName);
          }}
        >
          <Icon name="file" />
          Tải kết quả xác minh
        </button>
      )}
    </div>
  );
}
