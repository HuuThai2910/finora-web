import { StatusPill } from '@/components/StatusPill';
import { cardTypeLabel } from '../mappers/attemptDisplay';
import { toDraftRows, type DraftFieldRow } from '../mappers/draftDisplay';
import { toReasonViews } from '../mappers/reasonDisplay';
import type { EkycAttemptDetail } from '../types';
import { ReasonList } from './ReasonList';
import { REVIEW_CARD, REVIEW_CARD_HEAD, REVIEW_CARD_TITLE, REVIEW_EMPTY_LINE, REVIEW_SUB_HEAD } from './reviewStyles';

function FieldValue({ row }: { row: DraftFieldRow }) {
  if (!row.collected) return <span className="ekr-value absent text-muted font-normal wrap-anywhere">Không thu thập</span>;
  if (!row.value) return <span className="ekr-value missing text-warning font-normal wrap-anywhere">Không đọc được</span>;
  return (
    <span
      className={row.key === 'idNumber'
        ? 'ekr-value ui-mono text-[14px] text-primary font-medium wrap-anywhere'
        : 'ekr-value text-primary font-medium wrap-anywhere'}
    >
      {row.value}
    </span>
  );
}

/** Một dòng trường; màn hẹp xếp nhãn trên giá trị. */
const FIELD_ROW =
  'grid grid-cols-[170px_minmax(0,1fr)] gap-3 items-baseline py-2.25 border-b border-b-divider last:[border-bottom:0] max-[760px]:grid-cols-[minmax(0,1fr)] max-[760px]:gap-1';
/** Trường chỉ có nguồn AI/người dùng sửa: vạch cam bên trái, kèm nhãn nguồn nên không chỉ dựa vào màu. */
const UNVERIFIED_ROW = `unverified ${FIELD_ROW} pl-2.5 shadow-[inset_3px_0_0_var(--color-warning)]`;

/**
 * Các trường đọc từ thẻ kèm nhãn nguồn, cùng lý do của bước đọc giấy tờ. Đây là dữ liệu sẽ được ghi
 * vào hồ sơ khách hàng nếu lượt được duyệt, nên trường chỉ có nguồn "AI đọc" hoặc "Người dùng sửa"
 * được tô nhấn để người duyệt đối chiếu với ảnh thẻ.
 */
/** Họ tên, số điện thoại khách tự khai khi đăng ký tài khoản (hồ sơ người dùng), để đặt cạnh dữ liệu đọc từ thẻ. */
export interface DeclaredInfo {
  fullName: string | null;
  phone: string | null;
}

function DeclaredLine({ declared }: { declared: DeclaredInfo }) {
  const missing = <span className="text-muted">Chưa khai</span>;
  return (
    <p className="ekr-declared mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2 px-2.5 rounded-md bg-surface-muted text-[13px]">
      <span className="text-secondary font-medium">Đã khai khi đăng ký</span>
      <span><span className="text-muted">Họ tên</span> <span className="text-primary">{declared.fullName || missing}</span></span>
      <span><span className="text-muted">SĐT</span> <span className="text-primary">{declared.phone || missing}</span></span>
    </p>
  );
}

interface DraftFieldsCardProps {
  attempt: EkycAttemptDetail;
  /** `null` khi chưa tải được hoặc không có quyền Xem "Khách hàng": không hiện dòng đã khai. */
  declared: DeclaredInfo | null;
}

export function DraftFieldsCard({ attempt, declared }: DraftFieldsCardProps) {
  const rows = attempt.draft ? toDraftRows(attempt.draft) : [];
  const hasUnverified = rows.some((row) => row.unverified);

  return (
    <section className={REVIEW_CARD} aria-labelledby="ekrDraftTitle">
      <div className={REVIEW_CARD_HEAD}>
        <h2 id="ekrDraftTitle" className={REVIEW_CARD_TITLE}>Thông tin đọc từ thẻ</h2>
        <span className="ui-tag">{cardTypeLabel(attempt.cardType)}</span>
      </div>

      {declared ? <DeclaredLine declared={declared} /> : null}
      {attempt.draft ? (
        <>
          {hasUnverified ? (
            <p className="ekr-hint mb-1.5 py-2 px-2.5 rounded-md bg-warning-bg text-primary text-[13px] leading-normal">
              Trường được tô nhấn chỉ có nguồn AI đọc hoặc do người dùng tự sửa, không kiểm chứng được bằng mã QR
              hay dòng mã máy đọc.
            </p>
          ) : null}
          <dl className="ekr-fields">
            {rows.map((row) => (
              <div key={row.key} className={row.unverified ? UNVERIFIED_ROW : FIELD_ROW}>
                <dt className="text-muted text-[13px]">{row.label}</dt>
                <dd className="flex items-center flex-wrap gap-y-1.5 gap-x-2.5 min-w-0 text-[14px]">
                  <FieldValue row={row} />
                  {row.sources.length > 0 ? (
                    <span className="ekr-sources inline-flex flex-wrap gap-1">
                      {row.sources.map((source) => (
                        <StatusPill key={source.code} tone={source.tone} small>{source.label}</StatusPill>
                      ))}
                    </span>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <p className={REVIEW_EMPTY_LINE}>
          Lượt này không có bản nháp thông tin. Hệ thống chỉ lưu bản nháp khi lượt được gửi sang duyệt tay, và xoá
          bản nháp khi người dùng rút lại đồng ý.
        </p>
      )}

      <h3 className={REVIEW_SUB_HEAD}>Lý do từ bước đọc giấy tờ</h3>
      <ReasonList reasons={toReasonViews(attempt.reasons)} empty="Không có lý do nào được ghi." />
    </section>
  );
}
