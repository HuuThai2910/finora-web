import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { EChart } from '@/components/EChart';
import { buildFundingTimeOption, buildFundingTimeline, timelineShare } from '../../mappers/fundingTimeline';
import type { FundingProgress, ListingInvestor, MarketListing } from '../../types';
import { formatDate, formatDateTime, formatMoney, formatPercent } from '../../formatters';

interface Props {
  listing: MarketListing;
  investors: ListingInvestor[];
  progress: FundingProgress | undefined;
  nameOf: (investorId: string) => string;
}

/** Dưới bề rộng này thì thưa nhãn ngày để không dính nhau. */
const NARROW_WIDTH = 520;

/** Theo dõi bề rộng thẻ để chọn mật độ nhãn trục; dọn ResizeObserver khi rời trang. */
function useNarrow(ref: RefObject<HTMLElement>) {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < NARROW_WIDTH));
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return narrow;
}

/**
 * Vốn góp lũy kế theo thời gian, vẽ từ thời điểm đặt lệnh thật của từng phần vốn.
 * Có câu dẫn với số chính và bảng "Xem số liệu" thay cho biểu đồ.
 */
export function FundingTimelineCard({ listing, investors, progress, nameOf }: Props) {
  const cardRef = useRef<HTMLElement>(null);
  const narrow = useNarrow(cardRef);
  // Giữ tham chiếu option ổn định: EChart vẽ lại (kèm hoạt ảnh) mỗi khi option đổi tham chiếu,
  // nên không dựng lại khi trang cha render vì lý do khác (thông báo, nút đang chạy).
  const timeline = useMemo(() => buildFundingTimeline(listing, investors, progress), [listing, investors, progress]);
  const option = useMemo(() => buildFundingTimeOption(timeline, nameOf, narrow), [timeline, nameOf, narrow]);
  const { points, target } = timeline;

  let body;
  if (points.length === 0) {
    body = (
      <p className="fd-chart-empty">
        {investors.length > 0
          ? 'Mọi phần góp đã bị hủy và hoàn về ví nhà đầu tư, không còn vốn góp.'
          : listing.status === 'OPEN'
            ? 'Chưa có ai góp vốn. Biểu đồ hiện khi có phần góp đầu tiên.'
            : 'Không có ai góp vốn trong thời gian gọi vốn.'}
      </p>
    );
  } else {
    body = (
      <>
        <p className="fd-lead">
          Đã góp <b>{formatMoney(timeline.total)} đ</b>, đạt <b>{formatPercent(listing.fundedPercent)}</b> mục tiêu
          qua <b>{points.length} lần góp</b>
          {timeline.earlyDays ? `, đủ vốn sớm ${timeline.earlyDays} ngày so với hạn` : ''}
          {timeline.expired ? ', đã hết hạn gọi vốn' : ''}.
        </p>
        <EChart
          className="fd-chart"
          option={option}
          notMerge
          ariaLabel={`Biểu đồ bậc thang vốn góp lũy kế từ ${formatDate(new Date(timeline.startAt).toISOString())} đến ${formatDate(new Date(timeline.endAt).toISOString())}: ${points.length} lần góp, mục tiêu ${formatMoney(target)} đồng.`}
        />
        <details className="fd-data">
          <summary>Xem số liệu</summary>
          <div className="ui-table-wrap">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>Nhà đầu tư</th>
                  <th>Đặt lệnh lúc</th>
                  <th className="num">Số tiền</th>
                  <th className="num">Lũy kế</th>
                  <th className="num">Đạt mục tiêu</th>
                </tr>
              </thead>
              <tbody>
                {points.map((point, index) => (
                  <tr key={`${point.investorId}-${point.at}-${index}`}>
                    <td>{nameOf(point.investorId)}</td>
                    <td>{formatDateTime(new Date(point.at).toISOString())}</td>
                    <td className="num">{formatMoney(point.amount)} đ</td>
                    <td className="num">{formatMoney(point.total)} đ</td>
                    <td className="num">{timelineShare(point.total, target)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </>
    );
  }

  return (
    <section ref={cardRef} className="ui-card fd-card" aria-labelledby="fdTimelineTitle">
      <h2 id="fdTimelineTitle" className="fd-card-title">Vốn góp theo thời gian</h2>
      {body}
    </section>
  );
}
