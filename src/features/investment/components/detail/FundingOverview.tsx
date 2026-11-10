import { ErrorNotice } from '@/components/ErrorNotice';
import type { FundingDetail } from '../../hooks/useFundingDetail';
import type { SigningSummary } from '../../mappers/signing';
import { FundingTimelineCard } from './FundingTimelineCard';
import { LoanInfoCard } from './LoanInfoCard';
import { ProgressMeter } from './ProgressMeter';
import { RepaymentCard } from './RepaymentCard';
import { SigningCard } from './SigningCard';
import { DisbursementCard, FundingResultCard } from './StageCards';

interface Props {
  detail: FundingDetail;
  signing: SigningSummary | null;
  nameOf: (investorId: string) => string;
  canViewCustomer: boolean;
}

/**
 * Tab Tổng quan theo chặng: đang gọi vốn (kể cả bổ sung, đã đóng, đã hủy) xem tiến độ và vốn góp theo thời gian; chờ
 * ký xem tình hình ký; chờ giải ngân xem giải ngân; đã phát hành xem kết quả gọi vốn và trả nợ. Cuối mọi chặng là thẻ
 * Thông tin khoản vay.
 */
export function FundingOverview({ detail, signing, nameOf, canViewCustomer }: Props) {
  const { listing, stage, investors, progress, facts, review } = detail;
  if (!listing || !stage) return null;

  const info = (
    <LoanInfoCard
      listing={listing}
      borrowerId={review?.borrowerId}
      canViewCustomer={canViewCustomer}
      openedAt={facts?.openedAt ?? listing.fundingOpenedAt}
    />
  );

  if (stage === 'SIGNING') {
    return <>
      <SigningCard
        listing={listing}
        investors={investors}
        facts={facts}
        signing={signing}
        nameOf={nameOf}
        expiresAt={detail.contract?.expiresAt ?? null}
      />
      {info}
    </>;
  }
  if (stage === 'DISBURSING') {
    return <><DisbursementCard listing={listing} progress={progress} facts={facts} />{info}</>;
  }
  if (stage === 'ISSUED') {
    const schedule = review?.finalSchedule ?? review?.schedule;
    return (
      <>
        <FundingResultCard
          listing={listing}
          investors={investors}
          progress={progress}
          facts={facts}
          noteCount={detail.noteCount}
          nameOf={nameOf}
        />
        <RepaymentCard
          periods={schedule?.periods ?? []}
          loanNumber={detail.loanNumber}
          installments={detail.installments}
        />
        {info}
      </>
    );
  }

  return (
    <>
      {listing.status !== 'DRAFT' && (
        <>
          <ProgressMeter
            listing={listing}
            investors={investors}
            investorsLoaded={detail.investorsLoaded}
            progress={progress}
            nameOf={nameOf}
          />
          {detail.investorsError ? (
            <ErrorNotice error={detail.investorsError} onRetry={detail.refetchInvestors} />
          ) : detail.investorsLoaded ? (
            <FundingTimelineCard
              listing={listing}
              investors={investors}
              progress={progress}
              nameOf={nameOf}
              openedAt={facts?.openedAt ?? listing.fundingOpenedAt}
            />
          ) : null}
        </>
      )}
      {info}
    </>
  );
}
