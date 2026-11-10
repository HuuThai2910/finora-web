export { default as BlockchainProofsPage } from './pages/BlockchainProofsPage';
export { useSearchProofsQuery } from './api/proofApi';
// Chợ chuyển nhượng: ngăn Kiểm toán của một lần khớp đọc bằng chứng giấy xác nhận và đối chiếu lại với sổ cái.
export { useVerifyProofMutation } from './api/proofApi';
export { MOCK_LEDGER_NOTICE } from './constants';
export type { Proof, ProofVerification } from './types';
