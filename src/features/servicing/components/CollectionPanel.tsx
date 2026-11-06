import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import { useCollectionCasesQuery } from '../api/servicingApi';
import { SERVICING_PAGE_SIZE, stageInfo } from '../constant';
import { money } from '../formatters';
import type { StageCount } from '../hooks/useServicingCounts';
import type { CollectionCase, CollectionStage } from '../types';
import { BorrowerCell } from './BorrowerCell';
import { QueueBody } from './QueueBody';
import { StageFilter } from './StageFilter';

interface Props {
  page: number;
  onPage: (page: number) => void;
  /** Mức độ đang lọc (trên URL `?stage=`); `null` là mọi mức. */
  stage: CollectionStage | null;
  /** Số hồ sơ đang mở theo mức độ để ghi cạnh chip; không có khi tài khoản không xem được thống kê. */
  stageCounts: StageCount[] | undefined;
  onStage: (stage: CollectionStage | null) => void;
  openCaseId: string | null;
  onOpenCase: (item: CollectionCase) => void;
}

/**
 * Hàng đợi thu hồi: hồ sơ đang mở, backend sắp quá hạn lâu nhất trước. Bấm dòng để mở ngăn chi tiết
 * và ghi nhận liên hệ. Chip mức độ lọc ngay ở backend (tham số `stage`). Cột "Hẹn trả" và "Liên hệ gần nhất" của
 * mockup bị ẩn vì cần tải lịch sử của từng hồ sơ (API danh sách không trả về hai thông tin này).
 */
export function CollectionPanel({ page, onPage, stage, stageCounts, onStage, openCaseId, onOpenCase }: Props) {
  const query = useCollectionCasesQuery({ page, size: SERVICING_PAGE_SIZE, status: 'OPEN', ...(stage ? { stage } : {}) });
  const rows = query.data?.data ?? [];
  // Hàng đợi không còn hồ sơ nào thì chip lọc vô nghĩa; đang lọc thì vẫn giữ để bỏ lọc được.
  const showFilter = stage != null || (query.data?.totalElements ?? 0) > 0;

  return (
    <>
      {showFilter && <StageFilter value={stage} counts={stageCounts} onChange={onStage} />}
      <QueueBody
        error={query.error}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        onRetry={query.refetch}
        total={query.data?.totalElements ?? 0}
        emptyText={stage ? `Không có hồ sơ đang thu hồi ở mức "${stageInfo(stage).label}".` : 'Không có khoản vay quá hạn đang thu hồi.'}
        page={page}
        unit="hồ sơ"
        onPage={onPage}
      >
        <div className="ui-table-wrap">
          {/* Dòng đang mở ngăn có nền xanh nhạt; khi focus bằng bàn phím thì nền focus của ui-table thắng như trước. */}
          <table className="ui-table list svc-table [&_tbody_tr.is-open:not(:focus-visible)_td]:bg-brand-50">
            <thead>
              <tr>
                <th>Người vay</th>
                <th>Mức độ</th>
                <th className="num">Nhóm nợ</th>
                <th className="num">Số ngày quá hạn</th>
                <th className="num">Tiền quá hạn</th>
                <th className="num">Dư nợ</th>
                <th>Cập nhật số liệu</th>
                <th className="act"><span className="ui-sr-only">Mở chi tiết</span></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item) => {
                const stage = stageInfo(item.stage);
                return (
                  <tr
                    key={item.caseId}
                    className={item.caseId === openCaseId ? 'clickable is-open' : 'clickable'}
                    tabIndex={0}
                    aria-label={`Mở hồ sơ thu hồi khoản vay ${item.loanNumber}`}
                    onClick={() => onOpenCase(item)}
                    onKeyDown={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onOpenCase(item);
                      }
                    }}
                  >
                    <td><BorrowerCell borrowerId={item.borrowerId} loanNumber={item.loanNumber} /></td>
                    <td><StatusPill tone={stage.tone}>{stage.label}</StatusPill></td>
                    <td className="num">{item.debtGroup}</td>
                    <td className="num">{item.daysPastDue} ngày</td>
                    <td className="num">{money(item.overdueAmount)}</td>
                    <td className="num">{money(item.totalOutstanding)}</td>
                    <td>{formatDateTime(item.lastObservedAt)}</td>
                    <td
                      className={
                        'act svc-go w-[1%] text-muted in-[tr.clickable:hover]:text-brand '
                        + '[&_svg]:inline-block [&_svg]:size-4 [&_svg]:align-middle'
                      }
                    >
                      <Icon name="chevronRight" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </QueueBody>
    </>
  );
}
