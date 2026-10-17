import type { SuggestionItem } from '../types';

interface SuggestionChipsProps {
  items: SuggestionItem[];
  onPick: (item: SuggestionItem) => void;
}

/**
 * Câu hỏi gợi ý do server cấp. Bấm gợi ý gửi kèm `suggestionId` nên server trả lời bằng câu mẫu từ dữ
 * liệu thật, không tốn lượt gọi LLM (đường A, spec mục 4).
 */
export function SuggestionChips({ items, onPick }: SuggestionChipsProps) {
  return (
    <div className="as-chips" role="group" aria-label="Câu hỏi gợi ý">
      {items.map((item) => (
        <button key={item.id} type="button" className="as-chip" onClick={() => onPick(item)}>
          {item.label}
        </button>
      ))}
    </div>
  );
}
