import { StatusPill } from '@/components/StatusPill';
import { cardTypeLabel } from '../mappers/attemptDisplay';
import { toDraftRows, type DraftFieldRow } from '../mappers/draftDisplay';
import { toReasonViews } from '../mappers/reasonDisplay';
import type { EkycAttemptDetail } from '../types';
import { ReasonList } from './ReasonList';

function FieldValue({ row }: { row: DraftFieldRow }) {
  if (!row.collected) return <span className="ekr-value absent">Không thu thập</span>;
  if (!row.value) return <span className="ekr-value missing">Không đọc được</span>;
  return <span className={row.key === 'idNumber' ? 'ekr-value ui-mono' : 'ekr-value'}>{row.value}</span>;
}

/**
 * Các trường đọc từ thẻ kèm nhãn nguồn, cùng lý do của bước đọc giấy tờ. Đây là dữ liệu sẽ được ghi
 * vào hồ sơ khách hàng nếu lượt được duyệt, nên trường chỉ có nguồn "AI đọc" hoặc "Người dùng sửa"
 * được tô nhấn để người duyệt đối chiếu với ảnh thẻ.
 */
export function DraftFieldsCard({ attempt }: { attempt: EkycAttemptDetail }) {
  const rows = attempt.draft ? toDraftRows(attempt.draft) : [];
  const hasUnverified = rows.some((row) => row.unverified);

  return (
    <section className="ui-card ekr-card" aria-labelledby="ekrDraftTitle">
      <div className="ekr-card-head">
        <h2 id="ekrDraftTitle">Thông tin đọc từ thẻ</h2>
        <span className="ui-tag">{cardTypeLabel(attempt.cardType)}</span>
      </div>

      {attempt.draft ? (
        <>
          {hasUnverified ? (
            <p className="ekr-hint">
              Trường được tô nhấn chỉ có nguồn AI đọc hoặc do người dùng tự sửa, không kiểm chứng được bằng mã QR
              hay dòng mã máy đọc. Hãy đối chiếu với ảnh thẻ trước khi duyệt.
            </p>
          ) : null}
          <dl className="ekr-fields">
            {rows.map((row) => (
              <div key={row.key} className={row.unverified ? 'unverified' : undefined}>
                <dt>{row.label}</dt>
                <dd>
                  <FieldValue row={row} />
                  {row.sources.length > 0 ? (
                    <span className="ekr-sources">
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
        <p className="ekr-muted ekr-empty-line">
          Lượt này không có bản nháp thông tin. Hệ thống chỉ lưu bản nháp khi lượt được gửi sang duyệt tay, và xoá
          bản nháp khi người dùng rút lại đồng ý.
        </p>
      )}

      <h3 className="ekr-sub-head">Lý do từ bước đọc giấy tờ</h3>
      <ReasonList reasons={toReasonViews(attempt.reasons)} empty="Không có lý do nào được ghi." />
    </section>
  );
}
