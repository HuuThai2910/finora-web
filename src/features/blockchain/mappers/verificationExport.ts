import type { Proof, ProofVerification } from '../types';

/**
 * Tệp JSON "kết quả xác minh" để lưu hồ sơ kiểm toán hoặc gửi cho bên khác đối chiếu: nguyên văn bằng chứng (hash, cách
 * tính, biên nhận sổ cái) và kết quả lần kiểm vừa chạy, đúng như backend trả về, kèm thời điểm xuất. Không thêm kết luận
 * nào do trình duyệt tự suy.
 */
export function verificationExport(proof: Proof, verification: ProofVerification, exportedAt = new Date()) {
  const body = { exportedAt: exportedAt.toISOString(), proof, verification };
  const safeId = proof.proofId.replace(/[^A-Za-z0-9-]/g, '_');
  return {
    fileName: `ket-qua-xac-minh-${safeId}.json`,
    blob: new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }),
  };
}
