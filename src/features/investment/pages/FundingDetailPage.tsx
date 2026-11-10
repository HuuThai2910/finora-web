import { useMemo } from 'react';
import { Link, useLocation, useParams, useSearchParams } from 'react-router-dom';
import { ErrorNotice } from '@/components/ErrorNotice';
import { StatusPill } from '@/components/StatusPill';
import { usePermission } from '@/features/auth';
import { HistoryTab } from '@/features/loan';
import { useBackToList } from '@/lib/navigation';
import { ContractTab } from '../components/detail/ContractTab';
import { FundingOverview } from '../components/detail/FundingOverview';
import { FundingSteps } from '../components/detail/FundingSteps';
import { InvestorTable } from '../components/detail/InvestorTable';
import { NoteTable } from '../components/detail/NoteTable';
import { useFundingDetail } from '../hooks/useFundingDetail';
import { usePartyNames } from '../hooks/usePartyNames';
import { fundingHistory } from '../mappers/loanTimeline';
import { summarizeSigning } from '../mappers/signing';
import { STAGE_META } from '../stage';

type DetailTab = 'overview' | 'investors' | 'contract' | 'notes' | 'history';

const LIST_PATH = '/investments/funding';

// Hai cột như trang hồ sơ vay: nội dung theo tab bên trái, tiến trình 320px bên phải; dưới 1180px còn một cột.
const DOSSIER = 'grid grid-cols-[minmax(0,1fr)_320px] gap-5 [align-items:start] max-[1180px]:grid-cols-[minmax(0,1fr)]';
const TAB =
  'inline-flex items-center gap-1.5 h-9.5 px-3 -mb-px border-b-2 border-b-transparent text-secondary text-[14px] font-medium ' +
  'whitespace-nowrap hover:text-primary aria-selected:text-brand aria-selected:border-b-brand aria-selected:font-semibold';

/**
 * Chi tiết một khoản gọi vốn (`/investments/funding/:listingId`), bố cục như trang hồ sơ vay: tab gạch chân bên trái,
 * thẻ Tiến trình dính bên phải. Trang chỉ để theo dõi; quản trị không có thao tác nào trên khoản gọi vốn.
 *
 * Dữ liệu ghép từ Investment (khoản, tiến độ, phần vốn) và Loan (lịch sử xử lý, hợp đồng và các bên ký, lịch trả, kỳ đã
 * trả) qua `useFundingDetail`; tab đang xem giữ trên URL để gửi đường dẫn đúng phần đang xem.
 */
export default function FundingDetailPage() {
  const params = useParams();
  const detail = useFundingDetail(Number(params.listingId));
  const { listing, stage, investors, facts, review } = detail;
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const backUrl = useBackToList(LIST_PATH);
  const { canView } = usePermission();
  // Quản trị viên xử lý sự cố giải ngân cũng có trong lịch sử: tra tên cùng lúc với người vay và nhà đầu tư.
  const adminIds = review?.timeline?.filter((item) => item.actorType === 'ADMIN').map((item) => item.actorId) ?? [];
  const { nameOf, displayName } = usePartyNames(investors, [review?.borrowerId, ...adminIds]);
  const signing = useMemo(() => (facts && listing?.contractNumber ? summarizeSigning(investors, facts) : null),
    [facts, investors, listing?.contractNumber]);
  const history = useMemo(() => (review?.timeline && listing
    ? fundingHistory(
        review.timeline,
        { number: listing.contractNumber, code: listing.contractCode },
        detail.notesIssuedAt ? { at: detail.notesIssuedAt, count: detail.noteCount } : null,
      )
    : null), [review?.timeline, listing, detail.notesIssuedAt, detail.noteCount]);

  if (!detail.valid) {
    return (
      <section className="ui-page">
        <div className="ui-card ui-empty">
          Mã khoản gọi vốn không hợp lệ. <Link className="ui-link" to={backUrl}>Về danh sách gọi vốn</Link>
        </div>
      </section>
    );
  }
  if (detail.listingQuery.error) {
    return (
      <section className="ui-page">
        <ErrorNotice error={detail.listingQuery.error} onRetry={detail.listingQuery.refetch} />
        <Link className="ui-link" to={backUrl}>Về danh sách gọi vốn</Link>
      </section>
    );
  }
  if (!listing || !stage) {
    return (
      <section className="ui-page" aria-busy="true">
        <span className="ui-skeleton block h-5.5 w-80 max-w-full" />
        <div className="ui-card ui-empty">Đang tải khoản gọi vốn...</div>
      </section>
    );
  }

  const meta = STAGE_META[stage];
  // Họ tên người vay từ Investment (API chi tiết); thiếu thì thử tra theo mã từ hồ sơ vay, cuối cùng là chữ "Người vay".
  const borrowerName = listing.borrowerFullName
    ?? (review?.borrowerId && !displayName(review.borrowerId).startsWith('#') ? displayName(review.borrowerId) : 'Người vay');
  const tabs: Array<{ id: DetailTab; label: string; count?: number }> = [
    { id: 'overview', label: 'Tổng quan' },
    { id: 'investors', label: 'Nhà đầu tư', count: detail.investorsLoaded ? investors.length : undefined },
    { id: 'contract', label: 'Hợp đồng' },
    ...(stage === 'ISSUED' ? [{ id: 'notes' as const, label: 'Phần vốn', count: detail.noteCount }] : []),
    // Lịch sử xử lý là timeline của hồ sơ vay bên Loan: thiếu quyền đọc hồ sơ vay thì không có tab.
    ...(history ? [{ id: 'history' as const, label: 'Lịch sử xử lý' }] : []),
  ];
  const requested = searchParams.get('tab');
  const tab: DetailTab = tabs.find((item) => item.id === requested)?.id ?? 'overview';

  return (
    <section className="ui-page">
      <header className="flex items-start justify-between gap-4 max-[600px]:flex-col max-[600px]:gap-2.5">
        <div className="ui-title">
          <div className="flex flex-wrap items-center gap-2">
            <h1>{listing.purpose}</h1>
            <StatusPill tone={meta.tone} dot>{meta.label}</StatusPill>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Phần vốn chỉ giao dịch trên Chợ chuyển nhượng sau khi phát hành. */}
          {stage === 'ISSUED' && canView('secondary-market') && (
            <Link className="ui-btn ghost" to={`/investments/secondary/${listing.listingId}`}>Sổ lệnh</Link>
          )}
          {/* `loanId` của listing là ID hồ sơ vay bên Loan; bằng chứng có từ khi khoản vay có hợp đồng (W3D). */}
          {listing.contractNumber && canView('blockchain') && (
            <Link className="ui-btn ghost" to={`/blockchain/proofs?referenceType=LOAN_APPLICATION&referenceId=${listing.loanId}`}>
              Xác minh dữ liệu
            </Link>
          )}
        </div>
      </header>

      <div className={detail.listingQuery.isFetching ? `${DOSSIER} ui-busy` : DOSSIER}>
        <div className="grid min-w-0 gap-4">
          <div
            className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-b-line [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Nội dung khoản gọi vốn"
          >
            {tabs.map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                className={TAB}
                aria-selected={tab === item.id}
                // Giữ `state` để breadcrumb và lối về vẫn nhớ danh sách gốc sau khi đổi tab.
                onClick={() => setSearchParams(item.id === 'overview' ? {} : { tab: item.id }, { replace: true, state: location.state })}
              >
                {item.label}
                {item.count != null && <span className="text-muted text-[13px] font-normal tabular-nums">{item.count}</span>}
              </button>
            ))}
          </div>

          <div role="tabpanel" className="grid min-w-0 gap-4">
            {tab === 'overview' && (
              <FundingOverview detail={detail} signing={signing} nameOf={nameOf} canViewCustomer={canView('customer')} />
            )}
            {tab === 'investors' && (
              <InvestorTable
                investors={investors}
                isLoading={detail.investorsLoading}
                error={detail.investorsError}
                onRetry={detail.refetchInvestors}
                nameOf={nameOf}
                facts={facts}
                hasContract={listing.contractNumber != null}
              />
            )}
            {tab === 'contract' && (
              <ContractTab
                listing={listing}
                stage={stage}
                investors={investors}
                facts={facts}
                signing={signing}
                nameOf={nameOf}
                borrowerName={borrowerName}
                canViewProofs={canView('blockchain')}
                contract={detail.contract}
                signingPolicy={detail.signingPolicy}
              />
            )}
            {tab === 'notes' && <NoteTable commitments={detail.finalized} nameOf={nameOf} />}
            {tab === 'history' && history && (
              <HistoryTab
                history={[]}
                timeline={history}
                compact
                // Nhà đầu tư gọi theo tên đã tra (hoặc "Nhà đầu tư n"), không hiện mã; quản trị viên chưa tra được tên
                // thì chỉ còn vai trò.
                displayName={(actorId) => {
                  if (!actorId) return 'Hệ thống';
                  if (investors.some((item) => item.investorId === actorId)) return nameOf(actorId);
                  const name = displayName(actorId);
                  return name.startsWith('#') ? 'chưa tra được tên' : name;
                }}
              />
            )}
          </div>
        </div>

        <FundingSteps
          listing={listing}
          stage={stage}
          progress={detail.progress}
          facts={facts}
          signing={signing}
          notesIssuedAt={detail.notesIssuedAt}
          contractExpiresAt={detail.contract?.expiresAt ?? null}
        />
      </div>
    </section>
  );
}
