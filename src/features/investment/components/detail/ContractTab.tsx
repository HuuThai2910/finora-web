import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar } from '@/components/Avatar';
import { StatusPill, type PillTone } from '@/components/StatusPill';
import { ErrorNotice } from '@/components/ErrorNotice';
import { ReviewCard, ReviewRows, type ReviewRow } from '@/features/loan';
import { useContractDownload } from '../../hooks/useContractDownload';
import { shortHash, signatureProviderLabel, signatureWindowLabel } from '../../mappers/contract';
import type { FundingFacts } from '../../mappers/loanTimeline';
import { LENDER_SIGN_PILL, lenderSign, type SigningSummary } from '../../mappers/signing';
import { CANCELLATION_LABEL, describeTimeLeft, type FundingStage } from '../../stage';
import type { AdminLoanContract, ContractSigningPolicy, ListingInvestor, MarketListing } from '../../types';
import { formatDateTime, formatMoney, parseDecimal } from '../../formatters';

interface Props {
  listing: MarketListing;
  stage: FundingStage;
  investors: ListingInvestor[];
  facts: FundingFacts | null;
  signing: SigningSummary | null;
  nameOf: (investorId: string) => string;
  borrowerName: string;
  canViewProofs: boolean;
  /** Hợp đồng từ API quản trị của Loan; undefined khi thiếu quyền hoặc đang tải. */
  contract?: AdminLoanContract;
  /** Cách ký đang áp dụng (khoản chưa có hợp đồng). */
  signingPolicy?: ContractSigningPolicy;
}

const HIDE_MD = 'max-[1380px]:hidden';
const pill = (tone: PillTone, label: string) => <StatusPill tone={tone} small dot>{label}</StatusPill>;
const muted = (text: string) => <span className="text-muted font-normal">{text}</span>;
const amountOf = (item: ListingInvestor) => parseDecimal(item.amount) ?? 0;

interface Party {
  key: string | number;
  name: string;
  role: string;
  amount: string;
  state: ReactNode;
  signedAt: string | null;
}

/** Bảng các bên ký: nhà đầu tư trước, người vay dòng cuối (ký cuối cùng theo backend). */
function PartiesTable({ title, parties }: { title: string; parties: Party[] }) {
  return (
    <ReviewCard title={title}>
      <div className="ui-table-wrap">
        {/* Màn vừa (cột phải 320px chiếm chỗ) thu đệm ô để nhãn "Chờ nhà đầu tư ký đủ" không đẩy cột Ký lúc ra ngoài. */}
        <table className="ui-table max-[1380px]:[&_td]:px-2 max-[1380px]:[&_th]:px-2">
          <thead>
            <tr>
              <th>Bên ký</th>
              {/* Cột phải 320px chiếm chỗ ở màn vừa: dưới 1380px vai trò xuống dòng dưới tên để bảng không phải cuộn ngang. */}
              <th className={HIDE_MD}>Vai trò</th>
              <th className="num">Số tiền</th>
              <th>Trạng thái</th>
              <th className="hide-sm max-[760px]:hidden">Ký lúc</th>
            </tr>
          </thead>
          <tbody>
            {parties.map((party) => (
              <tr key={party.key}>
                <td>
                  <span className="ui-person">
                    <Avatar name={party.name} />
                    <span>{party.name}<span className="ui-sub hidden max-[1380px]:block">{party.role}</span></span>
                  </span>
                </td>
                <td className={HIDE_MD}>{party.role}</td>
                <td className="num">{party.amount}</td>
                <td>{party.state}</td>
                <td className="hide-sm max-[760px]:hidden">{party.signedAt ? formatDateTime(party.signedAt) : '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReviewCard>
  );
}

/** Chưa đủ vốn thì chưa có hợp đồng (Loan chỉ lập khi đủ vốn): nói khi nào phát hành và ai sẽ ký theo vốn góp hiện tại. */
function PendingContract({ listing, stage, investors, nameOf, borrowerName, signingPolicy }: Props) {
  const ended = stage === 'CLOSED' || stage === 'CANCELLED';
  const live = investors.filter((item) => item.status !== 'CANCELLED');
  const lenders = new Set(live.map((item) => item.investorId)).size;
  const waiting = ended ? pill('neutral', 'Không phát hành') : pill('info', 'Chờ phát hành');
  const remaining = parseDecimal(listing.remainingAmount) ?? 0;

  return (
    <>
      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <ReviewCard title="Hợp đồng">
          <ReviewRows rows={[
            { key: 'state', label: 'Trạng thái', value: ended ? pill('neutral', 'Không phát hành') : pill('info', 'Chưa phát hành') },
            ended
              ? { key: 'when', label: 'Phát hành khi', value: muted(stage === 'CLOSED' ? 'Khoản vay đã đóng, hết hạn' : 'Khoản vay đã hủy') }
              : {
                  key: 'when',
                  label: 'Phát hành khi',
                  value: `Gọi đủ ${formatMoney(listing.targetAmount)} đ`,
                  hint: remaining > 0 ? `còn thiếu ${formatMoney(remaining)} đ` : null,
                },
            ...(signingPolicy && !ended
              ? [{
                  key: 'window',
                  label: 'Thời hạn ký',
                  value: `${signatureWindowLabel(signingPolicy.signatureWindowHours)} sau khi phát hành`,
                }]
              : []),
            ...(signingPolicy && !ended
              ? [{ key: 'provider', label: 'Chữ ký số', value: signatureProviderLabel(signingPolicy.signatureProvider) }]
              : []),
          ]} />
        </ReviewCard>
        <ReviewCard title="Các bên sẽ ký">
          <ReviewRows rows={[
            { key: 'lenders', label: 'Bên cho vay', value: `${lenders} nhà đầu tư`, hint: `${formatMoney(listing.committedAmount)} đ đã góp` },
            { key: 'borrower', label: 'Bên vay', value: borrowerName, hint: 'ký sau khi nhà đầu tư ký đủ' },
          ]} />
        </ReviewCard>
      </div>
      <PartiesTable
        title="Các bên ký"
        parties={[
          ...[...live].sort((a, b) => amountOf(b) - amountOf(a)).map((item) => ({
            key: item.commitmentId,
            name: nameOf(item.investorId),
            role: 'Bên cho vay',
            amount: `${formatMoney(item.amount)} đ`,
            state: waiting,
            signedAt: null,
          })),
          { key: 'borrower', name: borrowerName, role: 'Bên vay (ký cuối)', amount: `${formatMoney(listing.targetAmount)} đ`, state: waiting, signedAt: null },
        ]}
      />
    </>
  );
}

/** Trạng thái chữ ký của người vay: ký sau cùng, nên trước khi nhà đầu tư ký đủ là "chờ", chưa phải "chưa ký". */
function borrowerState(stage: FundingStage, facts: FundingFacts, signing: SigningSummary): ReactNode {
  if (facts.borrowerSignedAt || facts.effectiveAt) return pill('success', 'Đã ký');
  if (facts.borrowerDeclinedAt) return pill('danger', 'Từ chối ký');
  if (stage === 'CANCELLED') return pill('neutral', 'Không ký');
  // Gọi vốn bổ sung: người vay chỉ ký khi đủ vốn lại và các nhà đầu tư mới ký xong.
  if (stage === 'REOPEN') return pill('neutral', 'Chờ gọi đủ vốn');
  if (facts.contractStatus === 'PENDING_BORROWER_SIGNATURE' || facts.contractStatus === 'SIGNING'
    || (signing.lenderCount > 0 && signing.signedCount >= signing.lenderCount)) return pill('warning', 'Đang chờ ký');
  return pill('neutral', 'Chờ nhà đầu tư ký đủ');
}

/**
 * Tab Hợp đồng. Hợp đồng chỉ có từ khi đủ vốn. Hạn ký, mã băm, nhà cung cấp chữ ký số, tệp PDF và trạng thái từng bên
 * đọc từ API hợp đồng quản trị của Loan (`facts` đã ghép phần ký từ đó); lối xác minh dùng bằng chứng blockchain của hồ
 * sơ vay.
 */
export function ContractTab(props: Props) {
  const { listing, stage, investors, facts, signing, nameOf, borrowerName, canViewProofs, contract } = props;
  const pdf = useContractDownload();
  if (!listing.contractNumber) return <PendingContract {...props} />;

  const cancelled = stage === 'CANCELLED';
  const effective = facts?.effectiveAt ?? null;
  const status = cancelled
    ? pill('danger', 'Đã hủy')
    : effective || stage === 'DISBURSING' || stage === 'ISSUED'
      ? pill('success', 'Có hiệu lực')
      : stage === 'REOPEN' ? pill('warning', 'Chờ gọi vốn bổ sung') : pill('warning', 'Đang chờ ký');
  const reason = listing.cancellationReason
    ? CANCELLATION_LABEL[listing.cancellationReason] ?? listing.cancellationReason
    : null;
  const code = contract?.contractCode ?? listing.contractCode;
  const provider = signatureProviderLabel(contract?.signatureProvider);
  // Còn bao lâu chỉ có nghĩa khi hợp đồng đang chờ ký; đã hiệu lực, đã hủy hay đang gọi vốn bổ sung thì chỉ ghi ngày.
  const deadline = contract?.expiresAt && stage === 'SIGNING' && !effective ? describeTimeLeft(contract.expiresAt) : null;
  const issuedAt = contract?.issuedAt ?? facts?.contractIssuedAt ?? null;
  const hash = contract?.documentHash ?? null;
  const contractRows: ReviewRow[] = [
    // Không hiện số hợp đồng tra cứu (LC-…); hợp đồng cũ chưa có mã HĐ- thì bỏ dòng.
    ...(code ? [{ key: 'number', label: 'Số hợp đồng', value: <span className="ui-mono">{code}</span> }] : []),
    { key: 'status', label: 'Trạng thái', value: status },
    ...(provider ? [{ key: 'provider', label: 'Chữ ký số', value: provider }] : []),
    ...(issuedAt ? [{ key: 'issued', label: 'Phát hành', value: formatDateTime(issuedAt) }] : []),
    ...(contract?.expiresAt
      ? [{
          key: 'deadline',
          label: 'Hạn ký',
          value: (
            <>
              {formatDateTime(contract.expiresAt)}
              {/* Như dòng phụ của ReviewRows nhưng tô cam khi gần hạn (dưới ba ngày hoặc đã tới hạn). */}
              {deadline?.label && (
                <span className={`block mt-0.5 text-[12px] font-normal leading-[1.45] ${deadline.warn ? 'text-warning' : 'text-muted'}`}>
                  {deadline.label}
                </span>
              )}
            </>
          ),
        }]
      : []),
    effective
      ? { key: 'effective', label: 'Hiệu lực', value: formatDateTime(effective) }
      : cancelled
        ? { key: 'effective', label: 'Hiệu lực', value: <span className="text-danger">Không</span>, hint: reason }
        : { key: 'effective', label: 'Hiệu lực', value: muted('Chưa') },
    ...(hash
      ? [{ key: 'hash', label: 'Mã băm tài liệu', value: <span className="ui-mono" title={hash}>{shortHash(hash)}</span> }]
      : []),
  ];

  const signingRows: ReviewRow[] = facts && signing ? [
    {
      key: 'signed',
      label: 'Nhà đầu tư đã ký',
      value: `${signing.signedCount}/${signing.lenderCount}`,
      hint: `${formatMoney(signing.signedAmount)} đ / ${formatMoney(signing.totalAmount)} đ`,
    },
    ...(signing.unsigned.length > 0
      ? [{
          key: 'unsigned',
          label: 'Nhà đầu tư chưa ký',
          value: <span className="text-warning">{signing.lenderCount - signing.signedCount}</span>,
          hint: `${formatMoney(signing.totalAmount - signing.signedAmount)} đ`,
        }]
      : []),
    ...(signing.left.length > 0
      ? [{
          key: 'left',
          label: 'Không ký, phần vốn đã nhả',
          value: <span className="text-danger">{new Set(signing.left.map((item) => item.investorId)).size}</span>,
          hint: `${formatMoney(signing.left.reduce((sum, item) => sum + amountOf(item), 0))} đ đã hoàn về ví`,
        }]
      : []),
    { key: 'borrower', label: 'Người vay', value: borrowerState(stage, facts, signing) },
    cancelled
      ? { key: 'result', label: 'Kết quả', value: <span className="text-danger">Hủy hợp đồng</span>, hint: 'tiền góp đã hoàn về ví nhà đầu tư' }
      : { key: 'done', label: 'Ký xong lúc', value: effective ? formatDateTime(effective) : muted('Chưa') },
  ] : [];

  // Đã ký trước, chưa ký sau, không ký (đã nhả) cuối; trong mỗi nhóm phần lớn trước.
  const order = (item: ListingInvestor) => {
    const sign = lenderSign(item, facts, true);
    return sign === 'SIGNED' ? 0 : sign === 'UNSIGNED' ? 1 : 2;
  };
  const parties: Party[] = facts && signing ? [
    ...investors
      .filter((item) => item.status !== 'CANCELLED' || facts.leftLenders.has(item.investorId) || facts.signedLenders.has(item.investorId))
      .sort((a, b) => order(a) - order(b) || amountOf(b) - amountOf(a))
      .map((item) => {
        const sign = lenderSign(item, facts, true);
        return {
          key: item.commitmentId,
          name: nameOf(item.investorId),
          role: 'Bên cho vay',
          amount: `${formatMoney(item.amount)} đ`,
          state: sign ? pill(LENDER_SIGN_PILL[sign].tone, sign === 'LEFT' ? 'Không ký, đã rút' : LENDER_SIGN_PILL[sign].label) : null,
          signedAt: sign === 'SIGNED' ? facts.signedLenders.get(item.investorId) ?? null : null,
        };
      }),
    {
      key: 'borrower',
      name: borrowerName,
      role: 'Bên vay (ký cuối)',
      amount: `${formatMoney(listing.targetAmount)} đ`,
      state: borrowerState(stage, facts, signing),
      signedAt: facts.borrowerSignedAt ?? facts.borrowerDeclinedAt,
    },
  ] : [];

  return (
    <>
      <div className={signingRows.length > 0 ? 'grid grid-cols-2 gap-4 max-[900px]:grid-cols-1' : 'grid'}>
        <ReviewCard title="Hợp đồng">
          <ReviewRows rows={contractRows} />
          {(contract?.pdfDocumentHash || canViewProofs) && (
            <div className="mt-3 flex gap-2">
              {contract?.pdfDocumentHash && (
                <button
                  type="button"
                  className="ui-btn ghost h-9 flex-1"
                  disabled={pdf.downloading}
                  onClick={() => void pdf.download(contract.contractNumber, code)}
                >
                  {pdf.downloading ? 'Đang tải...' : 'Tải PDF'}
                </button>
              )}
              {canViewProofs && (
                <Link
                  className="ui-btn ghost h-9 flex-1"
                  to={`/blockchain/proofs?referenceType=LOAN_APPLICATION&referenceId=${listing.loanId}`}
                >
                  Xác minh
                </Link>
              )}
            </div>
          )}
          {pdf.error != null && <div className="mt-2"><ErrorNotice error={pdf.error} /></div>}
        </ReviewCard>
        {signingRows.length > 0 && (
          <ReviewCard title="Tình hình ký">
            <ReviewRows rows={signingRows} />
          </ReviewCard>
        )}
      </div>
      {parties.length > 0 && <PartiesTable title="Các bên ký" parties={parties} />}
    </>
  );
}
