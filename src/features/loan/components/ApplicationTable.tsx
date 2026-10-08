import { Link, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { APPLICATION_STATUS_LABELS, formatMoney, formatPercent } from '../formatters';
import {
  applicationStatusTone,
  formatCompactDateTime,
  recommendationTone,
} from '../mappers/applicationListDisplay';
import type { AdminLoanReviewSummary } from '../types';
import { ApplicationPurposeCell } from './ApplicationPurposeCell';

interface ApplicationTableProps {
  applications: AdminLoanReviewSummary[];
  /** Đổi ID người vay thành tên (tra từ finora-user). */
  displayName: (actorId: string | null | undefined) => string;
  /** Người vay đã xác minh eKYC; chưa tra được thì coi là chưa biết, không gắn dấu. */
  isVerified: (actorId: string) => boolean;
}

/** Dấu xác minh eKYC cạnh tên người vay (mockup loans.html). */
function VerifiedIcon() {
  return (
    <svg className="loan-verified" viewBox="0 0 24 24" role="img" aria-label="Đã xác minh eKYC">
      <path fill="currentColor" d="M12 2 14.4 4l3.1-.3.9 3 2.6 1.8-1.2 2.9 1.2 2.9-2.6 1.8-.9 3-3.1-.3L12 22l-2.4-2-3.1.3-.9-3L3 15.5l1.2-2.9L3 9.6l2.6-1.8.9-3 3.1.3Z" />
      <path d="m8.5 12 2.4 2.4 4.6-4.8" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const SCORE_FORMAT = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 });

const reviewPath = (applicationNumber: string) => `/loans/${encodeURIComponent(applicationNumber)}/review`;

/** Bảng hồ sơ vay. Cả dòng bấm được để mở hồ sơ; nút cuối dòng giữ cho người dùng bàn phím và đọc màn hình. */
export function ApplicationTable({ applications, displayName, isVerified }: ApplicationTableProps) {
  const navigate = useNavigate();

  return (
    <div className="ui-table-wrap">
      <table className="ui-table list loan-table">
        <thead>
          <tr>
            <th>Hồ sơ</th>
            <th>Trạng thái</th>
            <th className="hide-sm">Người vay</th>
            <th className="num">Số tiền vay</th>
            <th className="num">Điểm</th>
            <th><span className="ui-sr-only">Thao tác</span></th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            const assessment = application.assessment;
            const borrower = displayName(application.borrowerId);
            const rate = application.finalAnnualInterestRate ?? application.annualInterestRate;
            const isPending = application.status === 'PENDING_REVIEW';
            return (
              <tr
                key={application.applicationNumber}
                className="clickable"
                tabIndex={0}
                onClick={(event) => {
                  if ((event.target as HTMLElement).closest('a')) return;
                  navigate(reviewPath(application.applicationNumber));
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && event.target === event.currentTarget) {
                    navigate(reviewPath(application.applicationNumber));
                  }
                }}
              >
                <td>
                  <ApplicationPurposeCell applicationNumber={application.applicationNumber} purposeCode={application.purposeCode ?? null} />
                </td>
                <td>
                  <StatusPill tone={applicationStatusTone(application.status)} dot>
                    {APPLICATION_STATUS_LABELS[application.status] ?? application.status}
                  </StatusPill>
                  <span className="ui-sub">nộp {formatCompactDateTime(application.submittedAt)}</span>
                </td>
                <td className="hide-sm">
                  <span className="ui-person">
                    <Avatar name={borrower.replace(/^#/, '')} />
                    <span className="loan-borrower" title={borrower}>{borrower}</span>
                    {isVerified(application.borrowerId) && <VerifiedIcon />}
                  </span>
                </td>
                <td className="num">
                  <span className="strong">{formatMoney(application.requestedAmount)}</span>
                  <span className="ui-sub">{application.requestedTermMonths} tháng, lãi {formatPercent(rate)}/năm</span>
                </td>
                <td className="num">
                  {assessment?.evaluationScore != null ? (
                    <>
                      <span className={`loan-score ${recommendationTone(assessment.aiRecommendation)}`}>
                        {SCORE_FORMAT.format(assessment.evaluationScore)}
                      </span>
                      <span className="ui-sub">hạng {assessment.creditGrade ?? '-'}</span>
                    </>
                  ) : (
                    <span className="ui-sub">Chưa có</span>
                  )}
                </td>
                <td className="num">
                  <Link className="ui-btn soft" to={reviewPath(application.applicationNumber)}>
                    {isPending ? 'Thẩm định' : 'Chi tiết'}
                    <Icon name="arrowRight" />
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
