import { CSSProperties, useEffect, useState, useRef } from "react";
import "./App.css";
import YourPlayground from "./components/YourPlayground";

type Theme = "light" | "dark" | "system";
type AppView =
  | "home"
  | "profile"
  | "world-library"
  | "world-workspace";
type Weight = "standard" | "wide" | "tall" | "hero" | "panorama";

type MediaType = "image" | "video" | "audio";
type CompanionType = "image" | "video";

type Post = {
  id: number;

  /*
    Existing demo posts use `image`.
    Newly uploaded posts use `mediaType` and `mediaSrc`.
  */
  image?: string;
  mediaType?: MediaType;
  mediaSrc?: string;

  /*
    Audio posts can optionally include artwork or a looping video.
  */
  companionType?: CompanionType;
  companionSrc?: string;

  title?: string;
  artist?: string;

  username: string;
  caption: string;
  pushedBy?: string;
  weight: Weight;
  position?: string;

  /*
    Width divided by height. Used to preserve the original
    photo or video proportions without cropping.
  */
  aspectRatio?: number;
};

const posts: Post[] = [
  {
    id: 1,
    image: "/trial/01_basketball.jpg",
    username: "@afterhours",
    caption: "The city was our court before anyone called it art.",
    weight: "tall",
    position: "center",
  },
  {
    id: 2,
    image: "/trial/02_masked_driver.jpg",
    username: "@ownthestreets",
    caption: "Night shift.",
    pushedBy: "@archivekid",
    weight: "tall",
  },
  {
    id: 3,
    image: "/trial/03_car_window_portrait.jpg",
    username: "@bluewindow",
    caption: "Passing through without leaving.",
    weight: "wide",
  },
  {
    id: 4,
    image: "/trial/04_helmet_portrait.jpg",
    username: "@fieldstudy",
    caption: "Protection can become costume.",
    pushedBy: "@quietriot",
    weight: "tall",
  },
  {
    id: 5,
    image: "/trial/05_resist_still.jpg",
    username: "@movingimage",
    caption: "Rise and resist.",
    weight: "wide",
  },
  {
    id: 6,
    image: "/trial/06_sheet_mask.jpg",
    username: "@streetarchive",
    caption: "An image found between fear and performance.",
    weight: "tall",
  },
  {
    id: 7,
    image: "/trial/07_dimension_collage.jpg",
    username: "@dimension",
    caption: "Light studies.",
    pushedBy: "@softfocus",
    weight: "wide",
  },
  {
    id: 8,
    image: "/trial/08_pinned_butterfly.jpg",
    username: "@specimen",
    caption: "Beauty held too still.",
    weight: "wide",
  },
  {
    id: 9,
    image: "/trial/09_radio_by_water.jpg",
    username: "@freeradio",
    caption: "A signal beside the water.",
    weight: "hero",
  },
  {
    id: 10,
    image: "/trial/10_bloodied_hand.jpg",
    username: "@redfield",
    caption: "Evidence of something unfinished.",
    pushedBy: "@lastframe",
    weight: "panorama",
  },
  {
    id: 11,
    image: "/trial/11_crash_scene.jpg",
    username: "@stillmoving",
    caption: "The moment after impact.",
    weight: "wide",
  },
  {
    id: 12,
    image: "/trial/12_fashion_eye_diptych.jpg",
    username: "@contactsheet",
    caption: "Distance and detail.",
    weight: "hero",
  },
  {
    id: 13,
    image: "/trial/13_desert.jpg",
    username: "@openland",
    caption: "Nothing asking to be explained.",
    weight: "panorama",
  },
  {
    id: 14,
    image: "/trial/14_editorial_spread.jpg",
    username: "@marginnotes",
    caption: "The page remembers what the photograph leaves out.",
    pushedBy: "@papertrail",
    weight: "hero",
  },
  {
    id: 15,
    image: "/trial/15_train_portrait.jpg",
    username: "@southbound",
    caption: "She watched the landscape disappear.",
    weight: "tall",
  },
  {
    id: 16,
    image: "/trial/16_blue_hour_profile.jpg",
    username: "@bluehour",
    caption: "A face at the edge of evening.",
    weight: "wide",
  },
  {
    id: 17,
    image: "/trial/17_twilight_alley.jpg",
    username: "@walkhome",
    caption: "The long way back.",
    weight: "panorama",
  },
  {
    id: 18,
    image: "/trial/18_window_back_portrait.jpg",
    username: "@weatherinside",
    caption: "Waiting for the rain to decide.",
    pushedBy: "@morningslow",
    weight: "wide",
  },
  {
    id: 19,
    image: "/trial/19_dark_bedroom.jpg",
    username: "@halfawake",
    caption: "The room before language.",
    weight: "wide",
  },
  {
    id: 20,
    image: "/trial/20_amber_profile.jpg",
    username: "@amberroom",
    caption: "A small room holding too much thought.",
    weight: "wide",
  },
  {
    id: 21,
    image: "/trial/21_bnw_seated.jpg",
    username: "@blackcoat",
    caption: "Stillness as refusal.",
    weight: "tall",
  },
  {
    id: 22,
    image: "/trial/22_bnw_closeup.jpg",
    username: "@wetfilm",
    caption: "Portrait after weather.",
    pushedBy: "@negativeone",
    weight: "tall",
  },
  {
    id: 23,
    image: "/trial/23_smiling_portrait.jpg",
    username: "@openwindow",
    caption: "A smile arriving unexpectedly.",
    weight: "wide",
  },
  {
    id: 24,
    image: "/trial/24_diner_portrait.jpg",
    username: "@tabletalk",
    caption: "She knew more than she said.",
    weight: "wide",
  },
  {
    id: 25,
    image: "/trial/25_garden_portrait.jpg",
    username: "@gardenparty",
    caption: "Summer conversation.",
    pushedBy: "@softcinema",
    weight: "tall",
  },
  {
    id: 26,
    image: "/trial/26_beaded_portrait.jpg",
    username: "@redbeads",
    caption: "Seen through the curtain.",
    weight: "wide",
  },
  {
    id: 27,
    image: "/trial/27_blue_room.jpg",
    username: "@emptychair",
    caption: "The room remained after everyone left.",
    weight: "wide",
  },
  {
    id: 28,
    image: "/trial/28_portrait_grid.jpg",
    username: "@fourways",
    caption: "Four versions of the same question.",
    weight: "hero",
  },
  {
    id: 29,
    image: "/trial/29_balcony_closeup.jpg",
    username: "@remembering",
    caption: "A thought leaving the body.",
    pushedBy: "@stillframe",
    weight: "wide",
  },
  {
    id: 30,
    image: "/trial/30_bathroom_still.jpg",
    username: "@bathroomlight",
    caption: "Practicing an apology in the mirror.",
    weight: "hero",
  },
  {
    id: 31,
    image: "/trial/31_low_angle_duo.jpg",
    username: "@groundlevel",
    caption: "Look down and we become enormous.",
    weight: "wide",
  },
  {
    id: 32,
    image: "/trial/32_waiting_room.jpg",
    username: "@waitingroom",
    caption: "Everyone heard the same news differently.",
    weight: "wide",
  },
  {
    id: 33,
    image: "/trial/33_projected_shadow.jpg",
    username: "@shadowplay",
    caption: "Her shadow arrived first.",
    pushedBy: "@bluecinema",
    weight: "hero",
  },
];

function resolveTheme(theme: Theme) {
  if (theme !== "system") return theme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className={`menu-icon ${open ? "menu-icon--open" : ""}`}>
      <i />
      <i />
    </span>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

function ThemeControl({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  return (
    <div className="theme-control">
      <button
        className={theme === "light" ? "active" : ""}
        type="button"
        onClick={() => onChange("light")}
        aria-label="Light appearance"
      >
        ☼
      </button>

      <button
        className={theme === "dark" ? "active" : ""}
        type="button"
        onClick={() => onChange("dark")}
        aria-label="Dark appearance"
      >
        ◐
      </button>

      <button
        className={theme === "system" ? "active" : ""}
        type="button"
        onClick={() => onChange("system")}
        aria-label="System appearance"
      >
        ◫
      </button>
    </div>
  );
}


function getPostMediaType(post: Post): MediaType {
  return post.mediaType ?? "image";
}

function getPostMediaSource(post: Post): string {
  return post.mediaSrc ?? post.image ?? "";
}

function FeedMedia({ post }: { post: Post }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const companionVideoRef = useRef<HTMLVideoElement | null>(null);

  const mediaType = getPostMediaType(post);
  const source = getPostMediaSource(post);

  const playMutedVideo = (
    ref: React.RefObject<HTMLVideoElement | null>,
  ) => {
    const video = ref.current;

    if (!video) return;

    video.muted = true;
    void video.play().catch(() => {
      /* The platform may block autoplay. */
    });
  };

  const stopVideo = (
    ref: React.RefObject<HTMLVideoElement | null>,
  ) => {
    const video = ref.current;

    if (!video) return;

    video.pause();
    video.currentTime = 0;
  };

  if (mediaType === "video") {
    return (
      <div
        className="feed-media feed-media--video"
        onMouseEnter={() => playMutedVideo(videoRef)}
        onMouseLeave={() => stopVideo(videoRef)}
      >
        <video
          ref={videoRef}
          src={source}
          muted
          loop
          playsInline
          preload="metadata"
        />

        <span className="feed-media-badge">VIDEO</span>
      </div>
    );
  }

  if (mediaType === "audio") {
    return (
      <div className="feed-media feed-media--audio">
        {post.companionType === "video" && post.companionSrc ? (
          <video
            ref={companionVideoRef}
            src={post.companionSrc}
            muted
            loop
            playsInline
            preload="metadata"
            onMouseEnter={() =>
              playMutedVideo(companionVideoRef)
            }
            onMouseLeave={() =>
              stopVideo(companionVideoRef)
            }
          />
        ) : post.companionSrc ? (
          <img
            src={post.companionSrc}
            alt=""
            draggable={false}
            decoding="async"
          />
        ) : (
          <div className="audio-default-art">
            <span>PG.</span>
          </div>
        )}

        <div className="audio-feed-treatment">
          <div className="audio-wave" aria-hidden="true">
            {Array.from({ length: 24 }, (_, index) => (
              <i
                key={index}
                style={
                  {
                    "--wave-height": `${22 + ((index * 17) % 58)}%`,
                  } as CSSProperties
                }
              />
            ))}
          </div>

          <div>
            <span>NOW PLAYING</span>
            <strong>{post.title || "Untitled audio"}</strong>
            <small>{post.artist || post.username}</small>
          </div>
        </div>

        <span className="feed-media-badge">AUDIO</span>
      </div>
    );
  }

  return (
    <img
      src={source}
      alt=""
      draggable={false}
      decoding="async"
    />
  );
}

function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = Math.floor(seconds % 60);

  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function AudioViewerMedia({ post }: { post: Post }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const source = getPostMediaSource(post);

  const hasVideoVisual =
    post.companionType === "video" &&
    Boolean(post.companionSrc);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const updateTime = () => {
      setCurrentTime(audio.currentTime);
    };

    const updateDuration = () => {
      setDuration(
        Number.isFinite(audio.duration)
          ? audio.duration
          : 0,
      );
    };

    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);

    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      audio.pause();

      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [source]);

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch (error) {
        console.error("Audio playback failed:", error);
      }
    } else {
      audio.pause();
    }
  };

  const seek = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const audio = audioRef.current;
    const nextTime = Number(event.target.value);

    if (!audio || !Number.isFinite(nextTime)) {
      return;
    }

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <div
      className={`pg-audio-viewer ${
        hasVideoVisual
          ? "pg-audio-viewer--video"
          : "pg-audio-viewer--image"
      }`}
    >
      <div className="pg-audio-viewer__canvas">
        {hasVideoVisual ? (
          <video
            className="pg-audio-viewer__visual"
            src={post.companionSrc}
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
          />
        ) : post.companionSrc ? (
          <img
            className="pg-audio-viewer__visual"
            src={post.companionSrc}
            alt=""
            draggable={false}
          />
        ) : (
          <div className="pg-audio-viewer__fallback">
            PG.
          </div>
        )}

        <div className="pg-audio-viewer__shade" />

        <div className="pg-audio-viewer__track">
          <span>AUDIO</span>

          <strong>
            {post.title || "Untitled audio"}
          </strong>

          <small>
            {post.artist || post.username}
          </small>
        </div>

        <div
          className="pg-audio-player"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            className="pg-audio-player__button"
            type="button"
            onClick={togglePlayback}
            aria-label={playing ? "Pause audio" : "Play audio"}
          >
            <span aria-hidden="true">
              {playing ? "Ⅱ" : "▶"}
            </span>
          </button>

          <span className="pg-audio-player__time">
            {formatAudioTime(currentTime)}
          </span>

          <input
            className="pg-audio-player__timeline"
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={Math.min(currentTime, duration || 0)}
            onChange={seek}
            aria-label="Audio playback position"
          />

          <span className="pg-audio-player__time">
            {formatAudioTime(duration)}
          </span>
        </div>

        <audio
          ref={audioRef}
          className="pg-audio-player__engine"
          src={source}
          preload="metadata"
        />
      </div>
    </div>
  );
}

function ViewerMedia({ post }: { post: Post }) {
  const mediaType = getPostMediaType(post);
  const source = getPostMediaSource(post);

  if (mediaType === "video") {
    return (
      <video
        className="viewer-primary-video"
        src={source}
        controls
        playsInline
        preload="auto"
      />
    );
  }

  if (mediaType === "audio") {
    return <AudioViewerMedia post={post} />;
  }

  return (
    <img
      src={source}
      alt=""
      draggable={false}
      decoding="sync"
      loading="eager"
      style={{
        objectPosition: post.position ?? "center",
      }}
    />
  );
}

function PostTile({
  post,
  pushed,
  onPush,
  onOpen,
}: {
  post: Post;
  pushed: boolean;
  onPush: () => void;
  onOpen: () => void;
}) {
  const [pushAnimating, setPushAnimating] = useState(false);

  const desktopOpenTimer = useRef<number | null>(null);
  const touchOpenTimer = useRef<number | null>(null);
  const lastTouchTime = useRef(0);
  const tileRef = useRef<HTMLElement | null>(null);

  const mediaAspectRatio =
    post.aspectRatio && Number.isFinite(post.aspectRatio)
      ? post.aspectRatio
      : null;

  /*
    Uploaded visual media chooses its own collage footprint.

    Landscape work receives more horizontal room.
    Portrait work receives enough width to remain expressive.
    Extremely tall work may become a narrow editorial accent.
  */
  const adaptiveColumnSpan = mediaAspectRatio
    ? mediaAspectRatio >= 2.15
      ? 3
      : mediaAspectRatio >= 1.05
        ? 2
        : mediaAspectRatio >= 0.62
          ? 2
          : 1
    : null;

  const [adaptiveRowSpan, setAdaptiveRowSpan] =
    useState<number | null>(null);

  useEffect(() => {
    if (!mediaAspectRatio || !tileRef.current) {
      setAdaptiveRowSpan(null);
      return;
    }

    const tile = tileRef.current;

    const updateTileHeight = () => {
      const width = tile.getBoundingClientRect().width;

      if (width <= 0) return;

      /*
        The collage grid uses 8px row units.
        The tile height is calculated from the media's real ratio.
      */
      const naturalHeight = width / mediaAspectRatio;
      const rowSpan = Math.max(
        8,
        Math.ceil(naturalHeight / 8),
      );

      setAdaptiveRowSpan(rowSpan);
    };

    updateTileHeight();

    const observer = new ResizeObserver(updateTileHeight);
    observer.observe(tile);

    return () => observer.disconnect();
  }, [mediaAspectRatio, adaptiveColumnSpan]);

  const style = {
    "--image-position": post.position ?? "center",
    "--media-aspect": mediaAspectRatio
      ? String(mediaAspectRatio)
      : "auto",
    "--tile-columns": adaptiveColumnSpan
      ? String(adaptiveColumnSpan)
      : undefined,
    "--tile-rows": adaptiveRowSpan
      ? String(adaptiveRowSpan)
      : undefined,
  } as CSSProperties;

  const clearDesktopTimer = () => {
    if (desktopOpenTimer.current !== null) {
      window.clearTimeout(desktopOpenTimer.current);
      desktopOpenTimer.current = null;
    }
  };

  const clearTouchTimer = () => {
    if (touchOpenTimer.current !== null) {
      window.clearTimeout(touchOpenTimer.current);
      touchOpenTimer.current = null;
    }
  };

  const performPush = () => {
    clearDesktopTimer();
    clearTouchTimer();

    setPushAnimating(false);

    requestAnimationFrame(() => {
      setPushAnimating(true);

      window.setTimeout(() => {
        setPushAnimating(false);
      }, 520);
    });

    onPush();
  };

  const handleDesktopClick = (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    if ((event.target as HTMLElement).closest(".tile-push")) {
      return;
    }

    if (window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    clearDesktopTimer();

    /*
      A short delay gives the browser time to determine whether
      this is a single click or the first half of a double-click.
    */
    desktopOpenTimer.current = window.setTimeout(() => {
      onOpen();
      desktopOpenTimer.current = null;
    }, 300);
  };

  const handleDesktopDoubleClick = (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    clearDesktopTimer();
    performPush();
  };

  const handleTouch = (
    event: React.PointerEvent<HTMLElement>,
  ) => {
    if (event.pointerType !== "touch") {
      return;
    }

    if ((event.target as HTMLElement).closest(".tile-push")) {
      return;
    }

    const now = window.performance.now();
    const elapsed = now - lastTouchTime.current;

    /*
      A second tap within 360ms cancels the pending viewer open
      and performs Push instead.
    */
    if (lastTouchTime.current > 0 && elapsed <= 360) {
      event.preventDefault();
      event.stopPropagation();

      lastTouchTime.current = 0;
      clearTouchTimer();
      performPush();
      return;
    }

    lastTouchTime.current = now;
    clearTouchTimer();

    touchOpenTimer.current = window.setTimeout(() => {
      onOpen();
      touchOpenTimer.current = null;
      lastTouchTime.current = 0;
    }, 380);
  };

  const handlePushButton = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    performPush();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onOpen();
    }

    if (event.key === " ") {
      event.preventDefault();
      performPush();
    }
  };

  return (
    <article
      ref={tileRef}
      className={`post-tile post-tile--${post.weight} ${
        post.aspectRatio ? "post-tile--native-media" : ""
      } ${
        pushed ? "post-tile--pushed" : ""
      } ${
        pushAnimating ? "post-tile--push-animating" : ""
      }`}
      style={style}
      tabIndex={0}
      role="button"
      aria-label={`${post.username}. Double-click or double-tap to Push.`}
      onClick={handleDesktopClick}
      onDoubleClick={handleDesktopDoubleClick}
      onPointerUp={handleTouch}
      onKeyDown={handleKeyDown}
    >
      <FeedMedia post={post} />

      <div className="post-reveal">
        <div className="post-reveal-copy">
          <strong>{post.username}</strong>
          <p>{post.caption}</p>

          {post.pushedBy && (
            <span>Pushed by {post.pushedBy}</span>
          )}
        </div>
      </div>

      <button
        className={`tile-push ${
          pushed ? "tile-push--active" : ""
        }`}
        type="button"
        aria-label={pushed ? "Remove Push" : "Push this post"}
        aria-pressed={pushed}
        onClick={handlePushButton}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
        }}
      >
        <span aria-hidden="true">↗</span>
        <span>{pushed ? "Pushed" : "Push"}</span>
      </button>
    </article>
  );
}

function ImmersiveViewer({
  post,
  pushed,
  onPush,
  onClose,
  onPrevious,
  onNext,
}: {
  post: Post;
  pushed: boolean;
  onPush: () => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const swipeStartX = useRef<number | null>(null);
  const swipeStartY = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrevious();
      if (event.key === "ArrowRight") onNext();
    };

    document.body.classList.add("viewer-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("viewer-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onPrevious, onNext]);

  const handleOverlayClick = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    const target = event.target as HTMLElement;

    if (
      target.closest(".viewer-frame") ||
      target.closest(".viewer-close") ||
      target.closest(".viewer-arrow")
    ) {
      return;
    }

    onClose();
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.pointerType !== "touch") return;

    swipeStartX.current = event.clientX;
    swipeStartY.current = event.clientY;
  };

  const handlePointerUp = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (
      event.pointerType !== "touch" ||
      swipeStartX.current === null ||
      swipeStartY.current === null
    ) {
      return;
    }

    const deltaX = event.clientX - swipeStartX.current;
    const deltaY = event.clientY - swipeStartY.current;

    swipeStartX.current = null;
    swipeStartY.current = null;

    const horizontalEnough =
      Math.abs(deltaX) > Math.abs(deltaY) * 1.25;

    const farEnough = deltaX >= 82;

    if (horizontalEnough && farEnough) {
      event.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className="immersive-viewer immersive-viewer--repaired"
      role="dialog"
      aria-modal="true"
      aria-label={`Post by ${post.username}`}
      onClick={handleOverlayClick}
      onPointerDownCapture={handlePointerDown}
      onPointerUpCapture={handlePointerUp}
    >
      <button
        className="viewer-close"
        type="button"
        onClick={onClose}
        aria-label="Close post"
      >
        <span />
        <span />
      </button>

      <button
        className="viewer-arrow viewer-arrow--previous"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onPrevious();
        }}
        aria-label="Previous post"
      >
        ←
      </button>

      <figure
        className="viewer-frame"
        onClick={(event) => event.stopPropagation()}
      >
        <ViewerMedia post={post} />

        <figcaption className="viewer-caption">
          <div className="viewer-caption-copy">
            <strong>{post.username}</strong>
            <p>{post.caption}</p>

            {post.pushedBy && (
              <span>Pushed by {post.pushedBy}</span>
            )}
          </div>

          <button
            className={`viewer-push ${
              pushed ? "viewer-push--active" : ""
            }`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onPush();
            }}
            aria-pressed={pushed}
            aria-label={pushed ? "Remove Push" : "Push this post"}
          >
            <span className="viewer-push-arrow">↗</span>
            <span>{pushed ? "Pushed" : "Push"}</span>
          </button>
        </figcaption>
      </figure>

      <button
        className="viewer-arrow viewer-arrow--next"
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onNext();
        }}
        aria-label="Next post"
      >
        →
      </button>
    </div>
  );
}


function CreateComposer({
  onClose,
  onPublish,
}: {
  onClose: () => void;
  onPublish: (post: Post) => void;
}) {
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [primaryUrl, setPrimaryUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<MediaType | null>(null);

  const [companionFile, setCompanionFile] = useState<File | null>(null);
  const [companionUrl, setCompanionUrl] = useState<string | null>(null);
  const [companionType, setCompanionType] =
    useState<CompanionType | null>(null);

  const [caption, setCaption] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [weight, setWeight] = useState<Weight>("wide");
  const [dragging, setDragging] = useState(false);
  const [mediaAspectRatio, setMediaAspectRatio] =
    useState<number | null>(null);

  const dragDepthRef = useRef(0);
  const primaryInputRef = useRef<HTMLInputElement | null>(null);
  const companionInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.body.classList.add("composer-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("composer-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const classifyFile = (file: File): MediaType | null => {
    if (file.type.startsWith("image/")) return "image";
    if (file.type.startsWith("video/")) return "video";

    const extension = file.name.split(".").pop()?.toLowerCase();

    if (
      extension &&
      ["jpg", "jpeg", "png", "webp", "avif", "gif"].includes(extension)
    ) {
      return "image";
    }

    if (
      extension &&
      ["mp4", "mov", "webm", "m4v"].includes(extension)
    ) {
      return "video";
    }

    return null;
  };

  const loadPrimaryFile = (file?: File) => {
    if (!file) return;

    const nextType = classifyFile(file);

    if (!nextType) {
      window.alert("Please choose an image or video file.");
      return;
    }

    if (primaryUrl) {
      URL.revokeObjectURL(primaryUrl);
    }

    const nextUrl = URL.createObjectURL(file);

    setPrimaryFile(file);
    setPrimaryUrl(nextUrl);
    setMediaType(nextType);
    setMediaAspectRatio(null);

    if (nextType === "audio" && !title) {
      setTitle(file.name.replace(/\.[^.]+$/, ""));
    }

    if (nextType !== "audio") {
      if (companionUrl) {
        URL.revokeObjectURL(companionUrl);
      }

      setCompanionFile(null);
      setCompanionUrl(null);
      setCompanionType(null);
    }
  };

  const loadCompanionFile = (file?: File) => {
    if (!file) return;

    const nextType = classifyFile(file);

    if (nextType !== "image" && nextType !== "video") {
      window.alert("An audio companion must be an image or video.");
      return;
    }

    if (companionUrl) {
      URL.revokeObjectURL(companionUrl);
    }

    setCompanionFile(file);
    setCompanionUrl(URL.createObjectURL(file));
    setCompanionType(nextType);
  };

  const removeCompanion = () => {
    if (companionUrl) {
      URL.revokeObjectURL(companionUrl);
    }

    setCompanionFile(null);
    setCompanionUrl(null);
    setCompanionType(null);
  };

  const handleDroppedFiles = (files: File[]) => {
    if (files.length === 0) return;

    const audioFile = files.find(
      (file) => classifyFile(file) === "audio",
    );

    const visualFile = files.find((file) => {
      const type = classifyFile(file);
      return type === "image" || type === "video";
    });

    /*
      Dropping audio and a visual together creates an audio post
      with that photo/video as its companion.
    */
    if (audioFile) {
      loadPrimaryFile(audioFile);

      if (visualFile) {
        loadCompanionFile(visualFile);
      }

      return;
    }

    /*
      When an audio post already exists, another dropped visual
      becomes its companion rather than replacing the audio.
    */
    if (
      mediaType === "audio" &&
      primaryFile &&
      visualFile
    ) {
      loadCompanionFile(visualFile);
      return;
    }

    loadPrimaryFile(files[0]);
  };

  const publish = () => {
    if (!primaryFile || !primaryUrl || !mediaType) {
      primaryInputRef.current?.click();
      return;
    }

    onPublish({
      id: Date.now(),
      mediaType,
      mediaSrc: primaryUrl,

      companionType:
        mediaType === "audio" && companionFile
          ? companionType ?? undefined
          : undefined,

      companionSrc:
        mediaType === "audio" && companionFile
          ? companionUrl ?? undefined
          : undefined,

      title:
        mediaType === "audio"
          ? title.trim() || "Untitled audio"
          : undefined,

      artist:
        mediaType === "audio"
          ? artist.trim() || "@terry"
          : undefined,

      username: "@terry",
      caption: caption.trim() || "Untitled.",
      weight,
      position: "center",
      aspectRatio: mediaAspectRatio ?? undefined,
    });
  };

  const renderPreview = () => {
    if (!primaryUrl || !mediaType) {
      return (
        <div className="composer-empty">
          <strong>Drop your work here</strong>
          <span>Image or video</span>
        </div>
      );
    }

    if (mediaType === "video") {
      return (
        <video
          src={primaryUrl}
          controls
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={(event) => {
            const video = event.currentTarget;

            if (video.videoWidth > 0 && video.videoHeight > 0) {
              setMediaAspectRatio(
                video.videoWidth / video.videoHeight,
              );
            }
          }}
          onClick={(event) => event.stopPropagation()}
        />
      );
    }

    if (mediaType === "audio") {
      return (
        <div
          className="composer-audio-preview"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="composer-audio-orb">
            <span>PG.</span>
          </div>

          <strong>{title || primaryFile?.name}</strong>
          <span>{artist || "Add an artist name"}</span>

          <audio
            src={primaryUrl}
            controls
            preload="metadata"
          />
        </div>
      );
    }

    return (
      <img
        src={primaryUrl}
        alt="New post preview"
        onLoad={(event) => {
          const image = event.currentTarget;

          if (image.naturalWidth > 0 && image.naturalHeight > 0) {
            setMediaAspectRatio(
              image.naturalWidth / image.naturalHeight,
            );
          }
        }}
      />
    );
  };

  return (
    <div
      className={`create-composer ${
        dragging ? "create-composer--dragging" : ""
      }`}
      role="dialog"
      aria-modal="true"
      aria-label="Create a post"
      onClick={onClose}
      onDragEnterCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();

        dragDepthRef.current += 1;
        setDragging(true);
      }}
      onDragOverCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();

        event.dataTransfer.dropEffect = "copy";
        setDragging(true);
      }}
      onDragLeaveCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();

        dragDepthRef.current = Math.max(
          0,
          dragDepthRef.current - 1,
        );

        if (dragDepthRef.current === 0) {
          setDragging(false);
        }
      }}
      onDropCapture={(event) => {
        event.preventDefault();
        event.stopPropagation();

        dragDepthRef.current = 0;
        setDragging(false);

        handleDroppedFiles(
          Array.from(event.dataTransfer.files),
        );
      }}
    >
      <section
        className={`composer-panel composer-panel--multimedia ${
          dragging ? "composer-panel--dragging" : ""
        }`}
        onClick={(event) => event.stopPropagation()}
        onDragEnter={(event) => {
          event.preventDefault();
          event.stopPropagation();

          dragDepthRef.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
          event.stopPropagation();

          if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "copy";
          }

          setDragging(true);
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          event.stopPropagation();

          dragDepthRef.current = Math.max(
            0,
            dragDepthRef.current - 1,
          );

          if (dragDepthRef.current === 0) {
            setDragging(false);
          }
        }}
        onDrop={(event) => {
          event.preventDefault();
          event.stopPropagation();

          dragDepthRef.current = 0;
          setDragging(false);

          const files = Array.from(event.dataTransfer.files);

          if (files.length === 0) return;

          /*
            When the primary file is audio and a second image/video
            is dropped, treat that second file as its companion.
          */
          if (
            mediaType === "audio" &&
            primaryFile &&
            files.length === 1
          ) {
            const droppedType = classifyFile(files[0]);

            if (
              droppedType === "image" ||
              droppedType === "video"
            ) {
              loadCompanionFile(files[0]);
              return;
            }
          }

          loadPrimaryFile(files[0]);

          /*
            Audio plus an image/video may be dropped together.
          */
          if (files.length > 1) {
            const primaryType = classifyFile(files[0]);

            if (primaryType === "audio") {
              const visual = files
                .slice(1)
                .find((file) => {
                  const type = classifyFile(file);
                  return type === "image" || type === "video";
                });

              if (visual) {
                loadCompanionFile(visual);
              }
            }
          }
        }}
      >
        <header className="composer-header">
          <div>
            <span>NEW WORK</span>
            <h2>Create</h2>
          </div>

          <button
            className="composer-close"
            type="button"
            onClick={onClose}
            aria-label="Close Create"
          >
            <i />
            <i />
          </button>
        </header>

        <div className="composer-body">
          <div className="composer-media-column">
            <div
              className={`composer-dropzone ${
                primaryUrl ? "composer-dropzone--filled" : ""
              } ${
                dragging ? "composer-dropzone--dragging" : ""
              }`}
              role="button"
              tabIndex={0}
              onClick={() => primaryInputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  primaryInputRef.current?.click();
                }
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                loadPrimaryFile(event.dataTransfer.files[0]);
              }}
            >
              {renderPreview()}
            </div>

            <input
              ref={primaryInputRef}
              className="composer-file-input"
              type="file"
              accept="image/*,video/*,.mov,.m4v"
              onChange={(event) =>
                loadPrimaryFile(event.target.files?.[0])
              }
            />

            {mediaType === "audio" && (
              <div className="companion-uploader">
                <div>
                  <span>VISUAL COMPANION</span>
                  <p>
                    Add optional artwork or a looping video to accompany
                    the audio.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => companionInputRef.current?.click()}
                >
                  {companionUrl ? "Replace visual" : "Add image or video"}
                </button>

                {companionUrl && (
                  <div className="companion-preview">
                    {companionType === "video" ? (
                      <video
                        src={companionUrl}
                        muted
                        loop
                        autoPlay
                        playsInline
                      />
                    ) : (
                      <img src={companionUrl} alt="" />
                    )}

                    <button
                      type="button"
                      onClick={removeCompanion}
                    >
                      Remove
                    </button>
                  </div>
                )}

                <input
                  ref={companionInputRef}
                  className="composer-file-input"
                  type="file"
                  accept="image/*,video/*,.mov,.m4v"
                  onChange={(event) =>
                    loadCompanionFile(event.target.files?.[0])
                  }
                />
              </div>
            )}
          </div>

          <div className="composer-fields">
            {mediaType === "audio" && (
              <>
                <label className="composer-field">
                  <span>Title</span>

                  <input
                    value={title}
                    maxLength={100}
                    placeholder="Track title"
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>

                <label className="composer-field">
                  <span>Artist</span>

                  <input
                    value={artist}
                    maxLength={100}
                    placeholder="Artist name"
                    onChange={(event) => setArtist(event.target.value)}
                  />
                </label>
              </>
            )}

            <label className="composer-field">
              <span>Caption</span>

              <textarea
                value={caption}
                maxLength={280}
                placeholder="Give the work a thought, title, or feeling."
                onChange={(event) => setCaption(event.target.value)}
              />

              <small>{caption.length}/280</small>
            </label>

            <fieldset className="composer-weight">
              <legend>Placement</legend>

              <div>
                {(
                  [
                    ["standard", "Small"],
                    ["wide", "Wide"],
                    ["tall", "Tall"],
                    ["hero", "Feature"],
                    ["panorama", "Panorama"],
                  ] as [Weight, string][]
                ).map(([value, label]) => (
                  <button
                    className={weight === value ? "active" : ""}
                    type="button"
                    key={value}
                    onClick={() => setWeight(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <footer className="composer-footer">
          <span>
            Photos and motion belong in Playground.
          </span>

          <button
            className="composer-publish"
            type="button"
            onClick={publish}
          >
            {primaryUrl ? "Publish" : "Choose media"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function Navigation({
  open,
  onClose,
  onCreate,
  onHome,
  onProfile,
  currentView,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: () => void;
  onHome: () => void;
  onProfile: () => void;
  currentView: AppView;
}) {
  return (
    <>
      <button
        className={`menu-scrim ${open ? "menu-scrim--visible" : ""}`}
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
      />

      <aside className={`navigation-panel ${open ? "navigation-panel--open" : ""}`}>
        <div className="navigation-brand">
          <BrandMark />
          <span>playground</span>
        </div>

        <nav>
          <button
            type="button"
            className={currentView === "home" ? "active" : ""}
            aria-current={currentView === "home" ? "page" : undefined}
            onClick={() => {
              onClose();
              onHome();
            }}
          >
            Slide
          </button>

          <button type="button">Explore</button>
          <button type="button">Activity</button>
          <button type="button">Messages</button>

          <button
            type="button"
            className={currentView === "profile" ? "active" : ""}
            aria-current={currentView === "profile" ? "page" : undefined}
            onClick={() => {
              onClose();
              onProfile();
            }}
          >
            Your Playground
          </button>

          <button type="button">Settings</button>
        </nav>

        <button
          className="create-action"
          type="button"
          onClick={() => {
            onClose();
            onCreate();
          }}
        >
          Create
        </button>

        <div className="navigation-note">
          <span>PLAYGROUND</span>
          <p>
            A visual world shaped by creators, references, and meaningful
            discovery.
          </p>
        </div>
      </aside>
    </>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [currentView, setCurrentView] =
    useState<AppView>("home");
  const [feedPosts, setFeedPosts] = useState<Post[]>(posts);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const [pushedPostIds, setPushedPostIds] = useState<number[]>(() => {
    try {
      const stored = window.localStorage.getItem("playground-pushed-posts");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [startupVisible, setStartupVisible] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = window.localStorage.getItem("playground-theme");

    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }

    return "system";
  });

  useEffect(() => {
    const startupTimer = window.setTimeout(() => {
      setStartupVisible(false);
    }, 3600);

    return () => window.clearTimeout(startupTimer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const update = () => {
      document.documentElement.dataset.theme = resolveTheme(theme);
    };

    window.localStorage.setItem("playground-theme", theme);
    update();

    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, [theme]);

  const togglePush = (postId: number) => {
    setPushedPostIds((current) => {
      const next = current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId];

      window.localStorage.setItem(
        "playground-pushed-posts",
        JSON.stringify(next),
      );

      return next;
    });
  };

  const closeViewer = () => setSelectedPostIndex(null);

  const showPreviousPost = () => {
    setSelectedPostIndex((current) => {
      if (current === null) return null;
      return current === 0 ? feedPosts.length - 1 : current - 1;
    });
  };

  const showNextPost = () => {
    setSelectedPostIndex((current) => {
      if (current === null) return null;
      return current === feedPosts.length - 1 ? 0 : current + 1;
    });
  };

  return (
    <main className="app">
      {composerOpen && (
        <CreateComposer
          onClose={() => setComposerOpen(false)}
          onPublish={(newPost) => {
            setFeedPosts((current) => [newPost, ...current]);
            setComposerOpen(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {selectedPostIndex !== null && (
        <ImmersiveViewer
          post={feedPosts[selectedPostIndex]}
          pushed={pushedPostIds.includes(feedPosts[selectedPostIndex].id)}
          onPush={() => togglePush(feedPosts[selectedPostIndex].id)}
          onClose={closeViewer}
          onPrevious={showPreviousPost}
          onNext={showNextPost}
        />
      )}

      {startupVisible && (
        <div className="startup-title" aria-hidden="true">
          <div className="startup-vignette" />

          <div className="startup-word" aria-hidden="true">
            <span className="startup-letter startup-letter--p">P</span>
            <span className="startup-letter startup-letter--fade startup-letter--1">l</span>
            <span className="startup-letter startup-letter--fade startup-letter--2">a</span>
            <span className="startup-letter startup-letter--fade startup-letter--3">y</span>
            <span className="startup-letter startup-letter--g">g</span>
            <span className="startup-letter startup-letter--fade startup-letter--4">r</span>
            <span className="startup-letter startup-letter--fade startup-letter--5">o</span>
            <span className="startup-letter startup-letter--fade startup-letter--6">u</span>
            <span className="startup-letter startup-letter--fade startup-letter--7">n</span>
            <span className="startup-letter startup-letter--fade startup-letter--8">d</span>
            <span className="startup-letter startup-letter--dot">.</span>
          </div>

          <div className="particle-field" aria-hidden="true">
            {Array.from({ length: 72 }, (_, index) => {
              const angle = (index * 137.5) % 360;
              const distance = 45 + ((index * 29) % 170);
              const lift = -26 - ((index * 17) % 145);
              const size = 2 + (index % 5);
              const delay = (index % 16) * 18;

              return (
                <i
                  key={index}
                  style={
                    {
                      "--particle-angle": `${angle}deg`,
                      "--particle-distance": `${distance}px`,
                      "--particle-lift": `${lift}px`,
                      "--particle-size": `${size}px`,
                      "--particle-delay": `${delay}ms`,
                    } as CSSProperties
                  }
                />
              );
            })}
          </div>

          <div className="startup-monogram" aria-hidden="true">
            <span>P</span>
            <span>G</span>
            <span>.</span>
          </div>
        </div>
      )}

      <header className="utility-bar">
        <button
          className="menu-button"
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        >
          <MenuIcon open={menuOpen} />
        </button>

        <div className="utility-brand">
          <BrandMark />
          <span>playground</span>
        </div>

        <div className="utility-actions">
          <ThemeControl theme={theme} onChange={setTheme} />

          <button
            className="user-button"
            type="button"
            aria-label="Open Your Playground"
            aria-current={
              currentView === "profile"
                ? "page"
                : undefined
            }
            onClick={() => {
              setMenuOpen(false);
              setSelectedPostIndex(null);
              setCurrentView("profile");
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
          >
            TP
          </button>
        </div>
      </header>

      <Navigation
        open={menuOpen}
        currentView={currentView}
        onClose={() => setMenuOpen(false)}
        onCreate={() => setComposerOpen(true)}
        onHome={() => {
          setSelectedPostIndex(null);
          setCurrentView("home");
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }}
        onProfile={() => {
          setSelectedPostIndex(null);
          setCurrentView("profile");
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        }}
      />

      {currentView === "home" ? (
        <section className="weighted-wall" aria-label="Slide">
          {feedPosts.map((post, index) => (
            <PostTile
              post={post}
              key={post.id}
              pushed={pushedPostIds.includes(post.id)}
              onPush={() => togglePush(post.id)}
              onOpen={() => setSelectedPostIndex(index)}
            />
          ))}
        </section>
      ) : (
        <YourPlayground
          displayName="Terry Presume"
          username="@terry"
          bio="Building worlds."
          postCount={
            feedPosts.filter(
              (post) => post.username === "@terry",
            ).length
          }
          followerCount={0}
          followingCount={0}
          musicTrack={{
            title: "FREE",
            artist: "Terry Presume",
            audioSrc: "",
          }}
          showMusicPlayer={true}
        >
          {feedPosts.some(
            (post) => post.username === "@terry",
          ) ? (
            <section
              className="weighted-wall weighted-wall--profile"
              aria-label="Your posts"
            >
              {feedPosts
                .filter(
                  (post) => post.username === "@terry",
                )
                .map((post) => {
                  const feedIndex = feedPosts.findIndex(
                    (candidate) =>
                      candidate.id === post.id,
                  );

                  return (
                    <PostTile
                      post={post}
                      key={post.id}
                      pushed={pushedPostIds.includes(
                        post.id,
                      )}
                      onPush={() =>
                        togglePush(post.id)
                      }
                      onOpen={() =>
                        setSelectedPostIndex(
                          feedIndex,
                        )
                      }
                    />
                  );
                })}
            </section>
          ) : undefined}
        </YourPlayground>
      )}
    </main>
  );
}

export default App;
