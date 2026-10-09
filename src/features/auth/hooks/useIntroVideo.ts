import { useEffect, useRef, useState, type RefObject } from 'react';
import { usePrefersReducedMotion } from './useMediaQuery';

export interface IntroVideoControls {
  videoRef: RefObject<HTMLVideoElement>;
  playing: boolean;
  /** Không tải được video: giao diện chỉ còn ảnh bìa, ẩn nút phát. */
  failed: boolean;
  /** Không tự phát (giảm chuyển động) thì chỉ tải thông tin video, chờ người dùng bấm phát mới tải hết. */
  preload: 'auto' | 'metadata';
  play: () => void;
  /** Gắn vào các sự kiện của thẻ <video>. */
  events: {
    onPlay: () => void;
    onPause: () => void;
    onError: () => void;
  };
}

/**
 * Điều khiển video giới thiệu ở màn đăng nhập.
 *
 * Tự phát (tắt tiếng, lặp lại) khi người dùng không bật giảm chuyển động. Trình duyệt có thể từ chối
 * tự phát theo chính sách autoplay; khi đó video đứng ở ảnh bìa và nút phát hiện ra để người dùng tự bấm.
 */
export function useIntroVideo(): IntroVideoControls {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  // play() trả Promise bị từ chối khi trình duyệt chặn tự phát hoặc lệnh phát bị pause() cắt ngang;
  // cả hai trường hợp đều chỉ cần giữ giao diện ở trạng thái dừng (nút phát vẫn còn).
  const playSafely = (video: HTMLVideoElement) => {
    video.play().catch(() => setPlaying(false));
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (reduced) {
      video.pause();
      return;
    }
    video.muted = true;
    playSafely(video);
  }, [reduced]);

  const play = () => {
    const video = videoRef.current;
    if (video) playSafely(video);
  };

  return {
    videoRef,
    playing,
    failed,
    preload: reduced ? 'metadata' : 'auto',
    play,
    events: {
      onPlay: () => setPlaying(true),
      onPause: () => setPlaying(false),
      onError: () => setFailed(true),
    },
  };
}
