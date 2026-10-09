import { Icon } from '@/components/Icon';
import introVideo from '@/assets/login/finora-gioi-thieu.mp4';
import introPoster from '@/assets/login/finora-gioi-thieu-poster.jpg';
import { useIntroVideo } from '../hooks/useIntroVideo';

/**
 * Video giới thiệu FINORA (người vay, nhà đầu tư dùng app; đội vận hành dùng trang quản trị) ở nửa
 * trái màn đăng nhập. Tự phát lặp lại như ảnh động, không có nút điều khiển. Nút phát giữa khung chỉ
 * hiện khi video đang dừng: trình duyệt chặn tự phát hoặc người dùng bật giảm chuyển động.
 * Video không có tiếng nên không cần phụ đề; nội dung chính đã có chữ trong hình.
 */
export function IntroVideo() {
  const video = useIntroVideo();

  return (
    <div className="ls-video">
      <video
        ref={video.videoRef}
        className="ls-video-media"
        src={introVideo}
        poster={introPoster}
        muted
        loop
        playsInline
        preload={video.preload}
        aria-label="Video giới thiệu FINORA: hành trình người vay, nhà đầu tư và đội vận hành"
        {...video.events}
      />
      {!video.playing && !video.failed && (
        <button type="button" className="ls-video-bigplay" onClick={video.play} aria-label="Phát video giới thiệu">
          <Icon name="play" />
        </button>
      )}
    </div>
  );
}
