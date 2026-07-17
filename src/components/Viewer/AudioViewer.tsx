import {
  useEffect,
  useRef,
  useState,
} from "react";

import type { ViewerPost } from "./types";
import { getViewerMediaSource } from "./types";

type AudioViewerProps = {
  post: ViewerPost;
  pushed: boolean;
  onPush: () => void;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "0:00";
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds
    .toString()
    .padStart(2, "0")}`;
}

export function AudioViewer({
  post,
  pushed,
  onPush,
}: AudioViewerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const source = getViewerMediaSource(post);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleMetadata = () => {
      setDuration(
        Number.isFinite(audio.duration)
          ? audio.duration
          : 0,
      );
    };

    const handleEnded = () => {
      setPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener(
      "timeupdate",
      handleTimeUpdate,
    );

    audio.addEventListener(
      "loadedmetadata",
      handleMetadata,
    );

    audio.addEventListener(
      "durationchange",
      handleMetadata,
    );

    audio.addEventListener(
      "ended",
      handleEnded,
    );

    return () => {
      audio.pause();

      audio.removeEventListener(
        "timeupdate",
        handleTimeUpdate,
      );

      audio.removeEventListener(
        "loadedmetadata",
        handleMetadata,
      );

      audio.removeEventListener(
        "durationchange",
        handleMetadata,
      );

      audio.removeEventListener(
        "ended",
        handleEnded,
      );
    };
  }, [source]);

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const skip = (seconds: number) => {
    const audio = audioRef.current;

    if (!audio) return;

    const nextTime = Math.min(
      Math.max(audio.currentTime + seconds, 0),
      Number.isFinite(audio.duration)
        ? audio.duration
        : audio.currentTime + seconds,
    );

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
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
    <section className="pgv-audio">
      <div className="pgv-audio__art">
        {post.companionType === "video" &&
        post.companionSrc ? (
          <video
            src={post.companionSrc}
            muted
            loop
            autoPlay
            playsInline
            preload="metadata"
          />
        ) : post.companionSrc ? (
          <img
            src={post.companionSrc}
            alt=""
            draggable={false}
          />
        ) : (
          <div
            className="pgv-audio__fallback"
            aria-hidden="true"
          >
            PG.
          </div>
        )}

        <div className="pgv-audio__shade" />

        <div className="pgv-audio__title">
          <span>AUDIO</span>

          <strong>
            {post.title || "Untitled audio"}
          </strong>

          <small>
            {post.artist || post.username}
          </small>
        </div>

        <div
          className="pgv-audio__player"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="pgv-audio__buttons">
            <button
              type="button"
              onClick={() => skip(-10)}
              aria-label="Rewind 10 seconds"
            >
              <span aria-hidden="true">↶</span>
              <small>10</small>
            </button>

            <button
              className="pgv-audio__play"
              type="button"
              onClick={togglePlayback}
              aria-label={playing ? "Pause" : "Play"}
            >
              <span aria-hidden="true">
                {playing ? "Ⅱ" : "▶"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => skip(10)}
              aria-label="Fast-forward 10 seconds"
            >
              <span aria-hidden="true">↷</span>
              <small>10</small>
            </button>
          </div>

          <div className="pgv-audio__timeline">
            <span>{formatTime(currentTime)}</span>

            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.01"
              value={Math.min(currentTime, duration || 0)}
              onChange={seek}
              aria-label="Audio progress"
            />

            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <audio
          ref={audioRef}
          src={source}
          preload="metadata"
        />
      </div>

      <div className="pgv-audio__meta">
        <div className="pgv-copy">
          <strong>{post.username}</strong>
          <p>{post.caption}</p>

          {post.pushedBy && (
            <span>
              Pushed by {post.pushedBy}
            </span>
          )}
        </div>

        <button
          className={`pgv-push ${
            pushed ? "pgv-push--active" : ""
          }`}
          type="button"
          onClick={onPush}
          aria-pressed={pushed}
        >
          <span aria-hidden="true">↗</span>

          <span>
            {pushed ? "Pushed" : "Push"}
          </span>
        </button>
      </div>
    </section>
  );
}
