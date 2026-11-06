interface Props {
  ten: string;
  onUndo: () => void;
}

/**
 * Chỗ của một luật đã lưu vừa bị xóa trong phiên sửa: luật chỉ bị bỏ khi bấm lưu, trước đó còn hoàn tác được. Không mang
 * lớp `rl-item` (mốc của thẻ luật đang có) để kịch bản kiểm thử đếm thẻ luật không tính chỗ trống này.
 */
export function DeletedRuleCard({ ten, onUndo }: Props) {
  return (
    <section
      className="rl-deleted flex flex-col items-start justify-center gap-2 min-h-30 p-4 border-r border-b border-r-line border-b-line bg-surface-muted text-[13px] text-secondary"
      aria-label={`Luật ${ten} đã xóa, chưa lưu`}
    >
      <p>
        Đã xóa luật <strong className="font-semibold text-primary">{ten || 'chưa đặt tên'}</strong>. Luật bị bỏ khi lưu bộ luật.
      </p>
      <button type="button" className="ui-btn soft rl-undo" onClick={onUndo}>Hoàn tác</button>
    </section>
  );
}
