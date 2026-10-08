import { Icon } from '@/components/Icon';
import { StatusPill } from '@/components/StatusPill';
import { formatDateTime } from '@/utils';
import { useCollectionCasesQuery } from '../api/servicingApi';
import { SERVICING_PAGE_SIZE, stageInfo } from '../constant';
import { money } from '../formatters';
import type { CollectionCase } from '../types';
import { BorrowerCell } from './BorrowerCell';
import { QueueBody } from './QueueBody';

interface Props {
  page: number;
  onPage: (page: number) => void;
  openCaseId: string | null;
  onOpenCase: (item: CollectionCase) => void;
}

/**
 * Hàng đợi thu hồi: hồ sơ đang mở, backend sắp quá hạn lâu nhất trước. Bấm dòng để mở ngăn chi tiết
 * và ghi nhận liên hệ. Cột "Hẹn trả" và "Liên hệ gần nhất" của mockup bị ẩn vì cần tải lịch sử của
 * từng hồ sơ (API danh sách không trả về hai thông tin này).
 */
export function CollectionPanel({ page, onPage, openCaseId, onOpenCase }: Props) {
  const query = useCollectionCasesQuery({ page, size: SERVICING_PAGE_SIZE, status: 'OPEN' });
  const rows = query.data?.data ?? [];

  return (
    <QueueBody
      error={query.error}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      onRetry={query.refetch}
      total={query.data?.totalElements ?? 0}
      emptyText="Không có khoản vay quá hạn đang thu hồi."
      page={page}
      unit="hồ sơ"
      onPage={onPage}
    >
      <div className="ui-table-wrap">
        <table className="ui-table list svc-table">
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
                  <td className="act svc-go"><Icon name="chevronRight" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </QueueBody>
  );
}
