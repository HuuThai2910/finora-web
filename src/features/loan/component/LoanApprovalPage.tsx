import { useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toUiApiError } from '@/lib/api/errors';
import { createIdempotencyKey } from '@/lib/api/idempotency';
import {
  useApproveApplicationMutation,
  useGetReviewDetailQuery,
  useLazyGetAssessmentDetailQuery,
  useRejectApplicationMutation,
  useRetryScoringMutation,
} from '../api/loanReviewApi';
import { APPLICATION_STATUS_LABELS, formatDateTime } from '../formatters';
import LoanDecisionPanel from './LoanDecisionPanel';
import LoanReviewContent from './LoanReviewContent';
import './LoanReview.css';

export default function LoanApprovalPage() {
  const { applicationNumber } = useParams<{ applicationNumber: string }>();
  const number = applicationNumber ?? '';
  const { data, isLoading, error } = useGetReviewDetailQuery(number, { skip: !number });
  const [approve, approveState] = useApproveApplicationMutation();
  const [reject, rejectState] = useRejectApplicationMutation();
  const [retryScoring, retryState] = useRetryScoringMutation();
  const [getAssessmentDetail] = useLazyGetAssessmentDetailQuery();
  const [notice, setNotice] = useState('');
  const decisionKey = useRef(createIdempotencyKey('admin-decision'));
  const retryKey = useRef(createIdempotencyKey('scoring-retry'));

  async function handleApprove() {
    if (!data?.assessment?.assessmentId) return;
    try {
      const result = await approve({
        applicationNumber: data.applicationNumber,
        applicationVersion: data.version,
        assessmentId: data.assessment.assessmentId,
        idempotencyKey: decisionKey.current,
      }).unwrap();
      setNotice(result.contractNumber
        ? `Đã duyệt hồ sơ và tạo hợp đồng ${result.contractNumber}.`
        : 'Đã duyệt hồ sơ. Điều khoản bất lợi hơn nên hệ thống đang chờ người vay xác nhận trước khi tạo hợp đồng.');
      decisionKey.current = createIdempotencyKey('admin-decision');
    } catch (requestError) {
      setNotice(toUiApiError(requestError).message);
    }
  }

  async function handleReject(reasonCode: string, reasonDetail?: string) {
    if (!data) return;
    try {
      await reject({
        applicationNumber: data.applicationNumber,
        applicationVersion: data.version,
        assessmentId: data.assessment?.assessmentId,
        reasonCode,
        reasonDetail,
        idempotencyKey: decisionKey.current,
      }).unwrap();
      setNotice('Đã từ chối hồ sơ.');
      decisionKey.current = createIdempotencyKey('admin-decision');
    } catch (requestError) {
      setNotice(toUiApiError(requestError).message);
    }
  }

  /** Response 202 chỉ xác nhận worker đã nhận yêu cầu; UI không diễn giải đây là kết quả chấm mới. */
  async function handleRetry() {
    const assessmentId = data?.assessment?.assessmentId;
    if (!assessmentId) return;
    try {
      const assessmentDetail = await getAssessmentDetail({
        applicationNumber: number,
        assessmentId,
      }).unwrap();
      const accepted = await retryScoring({
        applicationNumber: number,
        version: assessmentDetail.version,
        idempotencyKey: retryKey.current,
      }).unwrap();
      setNotice(accepted.message);
    } catch (requestError) {
      setNotice(toUiApiError(requestError).message);
    }
  }

  if (!number) return <div className="review-state error">Thiếu mã hồ sơ.</div>;
  if (isLoading) return <div className="review-state">Đang tải hồ sơ...</div>;
  if (error || !data) return <div className="review-state error">{toUiApiError(error).message}</div>;

  const canDecide = data.status === 'PENDING_REVIEW' && data.assessment?.status === 'SUCCEEDED';
  const canRetry = data.assessment?.status === 'FAILED' || data.assessment?.status === 'RETRY_PENDING';

  return (
    <section className="review-page">
      <header className="review-heading">
        <div>
          <Link className="review-back" to="/loans">← Danh sách hồ sơ vay</Link>
          <h1>{data.applicationNumber}</h1>
          <p>{APPLICATION_STATUS_LABELS[data.status]} · nộp {formatDateTime(data.submittedAt)}</p>
        </div>
      </header>

      {notice && <div className="review-notice">{notice}</div>}
      <LoanReviewContent
        application={data}
        assessmentAction={canRetry ? (
          <button className="review-button secondary" disabled={retryState.isLoading} onClick={handleRetry}>
            {retryState.isLoading ? 'Đang tiếp nhận...' : 'Yêu cầu chấm lại'}
          </button>
        ) : undefined}
        decisionPanel={data.status === 'PENDING_REVIEW' ? (
          <LoanDecisionPanel
            enabled={canDecide}
            approveLoading={approveState.isLoading}
            rejectLoading={rejectState.isLoading}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ) : undefined}
      />
    </section>
  );
}
