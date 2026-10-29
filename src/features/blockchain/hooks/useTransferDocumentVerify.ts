import { useState } from 'react';
import { fetchTransferDocumentPdf, useLazyGetTransferDocumentQuery } from '@/features/secondary-market';
import type { UiApiError } from '@/lib/api/errors';
import { useVerifyProofMutation } from '../api/proofApi';
import { artifactDocumentHash, sha256Hex, type PdfHashCheck } from '../mappers/documentHash';
import type { ProofVerification } from '../types';

export type DocumentVerifyState =
  | { status: 'idle' }
  | { status: 'running' }
  | { status: 'done'; pdf: PdfHashCheck; verification: ProofVerification }
  /** `pdf` còn giữ khi đã so xong tệp nhưng bước đối chiếu sổ cái lỗi, để không mất kết quả đã có. */
  | { status: 'error'; error: unknown; pdf: PdfHashCheck | null };

const notIssued: UiApiError = {
  code: 'TRANSFER_DOCUMENT_NOT_ISSUED',
  message: 'Giấy xác nhận chưa được phát hành nên chưa có dữ liệu nguồn để xác minh.',
};

const missingHash: UiApiError = {
  code: 'TRANSFER_DOCUMENT_HASH_MISSING',
  message: 'Dữ liệu nguồn của giấy xác nhận không có documentHash.',
};

/**
 * Xác minh giấy xác nhận chuyển nhượng Note theo hai lớp, chạy tuần tự khi quản trị bấm:
 *
 * 1. Tải chi tiết văn bản ở Investment (lấy `proofArtifact`, đúng `data` của sự kiện đã neo) và tải tệp PDF đã ký,
 *    tính SHA-256 của tệp trong trình duyệt rồi so với `proofArtifact.documentHash`: tệp đang lưu có còn nguyên vẹn.
 * 2. Gửi `proofArtifact` vào `POST /blockchain/proofs/{proofId}/verify`: Blockchain tính lại hash dữ liệu nguồn,
 *    so với hash đã neo và đối chiếu với sổ cái.
 *
 * Kết quả giữ cục bộ trong ngăn chi tiết (không cần chia sẻ giữa màn hình). Đang chạy thì chặn bấm lặp.
 *
 * @param proofId proof NOTE_TRANSFER_DOCUMENT đang mở.
 * @param tradeReference mã lần khớp, chính là `aggregateId` của proof.
 */
export function useTransferDocumentVerify(proofId: string, tradeReference: string) {
  const [state, setState] = useState<DocumentVerifyState>({ status: 'idle' });
  const [loadDocument] = useLazyGetTransferDocumentQuery();
  const [verifyProof] = useVerifyProofMutation();

  const verify = async () => {
    if (state.status === 'running') return;
    setState({ status: 'running' });
    let pdf: PdfHashCheck | null = null;
    try {
      // Luôn đọc bản mới nhất: văn bản có thể vừa được lập lại sau lần xem trước.
      const doc = await loadDocument(tradeReference, false).unwrap();
      const artifact = doc.proofArtifact;
      if (doc.status !== 'ISSUED' || !artifact) throw notIssued;
      const expected = artifactDocumentHash(artifact);
      if (!expected) throw missingHash;

      const actual = await sha256Hex(await fetchTransferDocumentPdf(tradeReference));
      pdf = { expected, actual, matched: actual === expected };

      const verification = await verifyProof({ proofId, artifact }).unwrap();
      setState({ status: 'done', pdf, verification });
    } catch (error) {
      setState({ status: 'error', error, pdf });
    }
  };

  return { state, verify };
}
