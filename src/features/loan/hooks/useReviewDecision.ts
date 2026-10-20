import { useRef, useState } from 'react';
import { createIdempotencyKey } from '@/lib/api/idempotency';
import {
  useApproveApplicationMutation,
  useRejectApplicationMutation,
  useRetryScoringMutation,
} from '../api/loanReviewApi';
import type { AdminLoanReviewDetail } from '../types';

/** Khóa idempotency gắn với version hồ sơ lúc tạo khóa. */
interface IntentKey {
  key: string;
  version: number;
}

/**
 * Lấy khóa của một ý định: bấm lại trên cùng version thì giữ khóa cũ (backend trả lại kết quả cũ),
 * còn khi hồ sơ đã tải lại sang version khác thì đó là một yêu cầu mới, phải dùng khóa mới.
 */
function keyFor(ref: { current: IntentKey | null }, prefix: string, version: number): string {
  if (!ref.current || ref.current.version !== version) {
    ref.current = { key: createIdempotencyKey(prefix), version };
  }
  return ref.current.key;
}

/**
 * Điều phối ba thao tác trên hồ sơ: duyệt, từ chối, yêu cầu chấm lại.
 *
 * - Idempotency: mỗi ý định (duyệt, từ chối, chấm lại) giữ một khóa riêng. Bấm lại sau khi lỗi mạng
 *   dùng lại đúng khóa để backend trả kết quả cũ thay vì tạo hợp đồng thứ hai; thành công, hoặc dữ
 *   liệu đã tải lại sang version khác, thì sinh khóa mới. Tách khóa theo ý định để đổi từ duyệt sang
 *   từ chối không gửi cùng khóa với nội dung khác.
 * - Version: gửi đúng `version` của hồ sơ mà backend vừa trả, kể cả khi chấm lại (Loan kiểm version hồ sơ
 *   ở `LoanApplication.reopenScoring`, không phải version của lần chấm); frontend không tự tăng. Mutation
 *   thành công invalidate cache chi tiết và danh sách (xem loanReviewApi).
 * - Chấm lại trả 202: chỉ là đã tiếp nhận, không phải kết quả chấm mới.
 *
 * @returns trạng thái chạy của từng thao tác, thông báo thành công và lỗi gần nhất (giữ mã lỗi, traceId).
 */
export function useReviewDecision(application: AdminLoanReviewDetail | undefined) {
  const [approve, approveState] = useApproveApplicationMutation();
  const [reject, rejectState] = useRejectApplicationMutation();
  const [retryScoring, retryState] = useRetryScoringMutation();
  const [notice, setNotice] = useState('');
  const [decisionError, setDecisionError] = useState<unknown>(null);
  const [retryError, setRetryError] = useState<unknown>(null);
  const approveKey = useRef<IntentKey | null>(null);
  const rejectKey = useRef<IntentKey | null>(null);
  const retryKey = useRef<IntentKey | null>(null);

  async function handleApprove() {
    const assessmentId = application?.assessment?.assessmentId;
    if (!application || assessmentId == null) return;
    setDecisionError(null);
    try {
      const result = await approve({
        applicationNumber: application.applicationNumber,
        applicationVersion: application.version,
        assessmentId,
        idempotencyKey: keyFor(approveKey, 'admin-approve', application.version),
      }).unwrap();
      setNotice(result.contractNumber
        ? `Đã duyệt hồ sơ và tạo hợp đồng ${result.contractNumber}.`
        : 'Đã duyệt hồ sơ. Điều khoản bất lợi hơn lúc nộp nên hệ thống đang chờ người vay xác nhận trước khi tạo hợp đồng.');
      approveKey.current = null;
    } catch (error) {
      setDecisionError(error);
    }
  }

  async function handleReject(reasonCode: string, reasonDetail?: string): Promise<boolean> {
    if (!application) return false;
    setDecisionError(null);
    try {
      await reject({
        applicationNumber: application.applicationNumber,
        applicationVersion: application.version,
        assessmentId: application.assessment?.assessmentId,
        reasonCode,
        reasonDetail,
        idempotencyKey: keyFor(rejectKey, 'admin-reject', application.version),
      }).unwrap();
      setNotice('Đã từ chối hồ sơ.');
      rejectKey.current = null;
      return true;
    } catch (error) {
      setDecisionError(error);
      return false;
    }
  }

  /** Gửi yêu cầu chấm lại kèm `version` của hồ sơ: Loan so với version hồ sơ, không phải version lần chấm. */
  async function handleRetry() {
    if (!application || application.assessment == null) return;
    setRetryError(null);
    try {
      const accepted = await retryScoring({
        applicationNumber: application.applicationNumber,
        version: application.version,
        idempotencyKey: keyFor(retryKey, 'scoring-retry', application.version),
      }).unwrap();
      setNotice(accepted.message || 'Đã gửi yêu cầu chấm lại. Kết quả sẽ cập nhật khi hệ thống chấm xong.');
      retryKey.current = null;
    } catch (error) {
      setRetryError(error);
    }
  }

  return {
    notice,
    dismissNotice: () => setNotice(''),
    clearDecisionError: () => setDecisionError(null),
    decisionError,
    retryError,
    approving: approveState.isLoading,
    rejecting: rejectState.isLoading,
    retrying: retryState.isLoading,
    approve: handleApprove,
    reject: handleReject,
    retry: handleRetry,
  };
}
