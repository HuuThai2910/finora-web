import { blockchainApi } from '@/lib/api/blockchainApi';
import type { Proof, ProofPage, ProofSearchArgs, ProofVerification, VerifyProofArgs } from '../types';

const TAG = 'BlockchainProofs' as const;
/** Mọi danh sách proof (kể cả số đếm dừng gửi) chung một tag: đưa proof về hàng đợi đổi cả bảng lẫn số đếm. */
const LIST = { type: TAG, id: 'LIST' } as const;

const path = (proofId: string) => `/blockchain/proofs/${encodeURIComponent(proofId)}`;

/**
 * Explorer proof (W3D D54, chỉ ADMIN, qua Gateway): tra theo tham chiếu hoặc trạng thái, xem chi tiết, kiểm toàn vẹn
 * và đưa proof DEAD_LETTER về hàng đợi. Không có thao tác sửa proof: sai lệch chỉ được ghi nhận để vận hành điều tra.
 */
export const proofApi = blockchainApi.injectEndpoints({
  endpoints: (builder) => ({
    searchProofs: builder.query<ProofPage, ProofSearchArgs>({
      query: (params) => ({ url: '/blockchain/proofs', params }),
      providesTags: (result) => [LIST, ...(result?.content ?? []).map((proof) => ({ type: TAG, id: proof.proofId }))],
    }),
    getProof: builder.query<Proof, string>({
      query: path,
      providesTags: (_result, _error, proofId) => [{ type: TAG, id: proofId }],
    }),
    // Kiểm với Fabric có thể lưu kết quả đối chiếu lên proof (MATCHED, MISMATCHED, MISSING_ON_CHAIN): làm mới dòng
    // và chi tiết của đúng proof đó. Không gửi `artifact` thì backend chỉ đối chiếu cơ sở dữ liệu với sổ cái.
    verifyProof: builder.mutation<ProofVerification, VerifyProofArgs>({
      query: ({ proofId, artifact }) => ({
        url: `${path(proofId)}/verify`,
        method: 'POST',
        body: artifact === undefined ? {} : { artifact },
      }),
      invalidatesTags: (_result, _error, { proofId }) => [{ type: TAG, id: proofId }],
    }),
    // Chỉ DEAD_LETTER → PENDING (khác thì 409 `PROOF_NOT_DEAD_LETTER`); worker gửi lại ở lượt kế tiếp.
    retryProof: builder.mutation<Proof, string>({
      query: (proofId) => ({ url: `${path(proofId)}/retry`, method: 'POST' }),
      invalidatesTags: (_result, _error, proofId) => [LIST, { type: TAG, id: proofId }],
    }),
  }),
});

export const {
  useSearchProofsQuery, useGetProofQuery, useVerifyProofMutation, useRetryProofMutation,
} = proofApi;
