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
    // Vùng 16:9 co vừa phần còn lại của nửa trái (đơn vị cq theo .ls-video-fit): màn thấp không bị đẩy ra thanh
    // cuộn, màn rộng không bị video quá khổ.
    <div className="ls-video relative w-[min(100cqw,100cqh*16/9,900px)] aspect-video">
      {/*
        Video nằm phẳng trên nền trang, không khung, không bóng. Đây là bản nhúng (finora-video: render.py --embed)
        có nền phẳng gần trùng nền trang, nên chỉ cần làm mờ một dải hẹp ở mép là video hoà vào trang. Mép dưới bắt
        đầu mờ từ 92% để không mờ chân nhân vật trong video.
      */}
      <video
        ref={video.videoRef}
        className="ls-video-media block size-full object-cover [--fade-x:linear-gradient(to_right,transparent,#000_3%,#000_96%,transparent)] [--fade-y:linear-gradient(to_bottom,transparent,#000_5%,#000_92%,transparent)] [-webkit-mask-image:var(--fade-x),var(--fade-y)] [-webkit-mask-composite:source-in] mask-[var(--fade-x),var(--fade-y)] mask-intersect"
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
        <button
          type="button"
          className="ls-video-bigplay absolute top-1/2 left-1/2 grid place-items-center size-17 -mt-8.5 -ml-8.5 rounded-[50%] bg-brand text-white transition-[background] duration-200 hover:bg-brand-600 focus-visible:outline-offset-3 [&_svg]:size-6.5 [&_svg]:ml-1"
          onClick={video.play}
          aria-label="Phát video giới thiệu"
        >
          <Icon name="play" />
        </button>
      )}
    </div>
  );
}
