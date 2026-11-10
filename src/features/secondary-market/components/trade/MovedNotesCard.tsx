import { ErrorNotice } from '@/components/ErrorNotice';
import { ReviewCard } from '@/features/loan';
import { useGetTradeNotesQuery } from '../../api/orderBookApi';
import { currentStatus } from '../../mappers/tradeNotes';

/** Bảng "Phần vốn đã chuyển" của trang chi tiết giao dịch. */
export function MovedNotesCard({ tradeReference }: { tradeReference: string }) {
  const notes = useGetTradeNotesQuery(tradeReference);

  return (
    <ReviewCard title="Phần vốn đã chuyển">
      {notes.error ? (
        <ErrorNotice error={notes.error} onRetry={notes.refetch} />
      ) : notes.isLoading || !notes.data ? (
        <div className="ui-empty" aria-busy="true">Đang tải phần vốn...</div>
      ) : notes.data.length === 0 ? (
        <div className="ui-empty">Chưa đọc được phần vốn của lần khớp này.</div>
      ) : (
        <div className="ui-table-wrap">
          <table className="ui-table">
            <thead>
              <tr>
                <th>Mã phần vốn</th>
                <th>Hiện nay</th>
              </tr>
            </thead>
            <tbody>
              {notes.data.map((note) => (
                <tr key={note.noteId}>
                  <td className="ui-mono">{note.noteNumber}</td>
                  <td>{currentStatus(note, tradeReference)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReviewCard>
  );
}
