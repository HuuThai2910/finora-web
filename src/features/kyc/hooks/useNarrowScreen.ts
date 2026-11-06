import { useEffect, useState } from 'react';

/** Cùng ranh giới với utility `max-[760px]:` của Tailwind (bề ngang dưới 760px). */
const NARROW_QUERY = '(max-width: 759.98px)';

const matches = () => typeof window !== 'undefined' && window.matchMedia(NARROW_QUERY).matches;

/**
 * Màn hẹp (điện thoại) hay không, cho phần giao diện đổi cấu trúc chứ không chỉ đổi kiểu (thu biểu đồ vào mục gập).
 * Lắng nghe `matchMedia` để xoay máy hoặc kéo cửa sổ thì cập nhật theo; gỡ lắng nghe khi rời trang.
 */
export function useNarrowScreen(): boolean {
  const [narrow, setNarrow] = useState(matches);
  useEffect(() => {
    const media = window.matchMedia(NARROW_QUERY);
    const onChange = () => setNarrow(media.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return narrow;
}
