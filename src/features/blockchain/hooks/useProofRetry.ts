import { useState } from 'react';
import { useRetryProofMutation } from '../api/proofApi';
import { shortCode } from '../mappers/proofDisplay';
import type { Proof } from '../types';

export interface ProofRetryFailure {
  proofId: string;
  error: unknown;
}

/**
 * Đưa proof DEAD_LETTER về hàng đợi gửi (`POST /retry`), dùng chung cho menu dòng và ngăn chi tiết.
 *
 * Một thao tác một lúc để không gửi chồng. Proof không còn DEAD_LETTER thì không gọi (backend cũng chặn bằng
 * `PROOF_NOT_DEAD_LETTER`); lỗi được giữ kèm mã proof để hiện đúng chỗ. Thành công thì tag danh sách và proof được làm
 * mới (xem `proofApi`) và `onDone` nhận câu thông báo.
 */
export function useProofRetry(onDone: (message: string) => void) {
  const [retryProof] = useRetryProofMutation();
  const [runningId, setRunningId] = useState<string | null>(null);
  const [failure, setFailure] = useState<ProofRetryFailure | null>(null);

  const retry = async (proof: Proof) => {
    if (runningId || proof.status !== 'DEAD_LETTER') return;
    setRunningId(proof.proofId);
    setFailure(null);
    try {
      await retryProof(proof.proofId).unwrap();
      onDone(`Đã đưa proof ${shortCode(proof.proofId, 8, 4)} về hàng đợi; hệ thống sẽ gửi lại lên sổ cái ở lượt kế tiếp.`);
    } catch (error) {
      setFailure({ proofId: proof.proofId, error });
    } finally {
      setRunningId(null);
    }
  };

  return { retry, runningId, failure };
}
