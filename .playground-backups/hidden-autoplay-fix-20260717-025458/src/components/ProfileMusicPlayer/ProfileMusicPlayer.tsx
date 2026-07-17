import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { ProfileSoundtrack, SoundtrackTrack } from "../../lib/profileSoundtrack";
import { normalizeSoundtrack } from "../../lib/profileSoundtrack";
import "./ProfileMusicPlayer.css";

export type ProfileTrack = {
  title: string;
  artist?: string;
  audioSrc: string;
};

type Props = {
  soundtrack: ProfileSoundtrack;
  visible?: boolean;
  defaultExpanded?: boolean;
  variant?: string;
};

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

export default function ProfileMusicPlayer({
  soundtrack,
  visible = true,
  defaultExpanded = false,
  variant = "editorial",
}: Props) {
  const normalized = useMemo(() => normalizeSoundtrack(soundtrack), [soundtrack]);
  const playable = useMemo(
    () => normalized.tracks.filter((track) => track.sourceType === "upload" && Boolean(track.source)),
    [normalized.tracks],
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeAfterFocusRef = useRef(false);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const current = playable[index] ?? playable[0] ?? null;

  useEffect(() => {
    if (index >= playable.length) setIndex(0);
  }, [index, playable.length]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.load();
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [current?.id]);

  useEffect(() => {
    if (!visible) {
      audioRef.current?.pause();
      setPlaying(false);
      setExpanded(false);
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || !normalized.autoplay || !current) return;
    void audioRef.current?.play().catch(() => setPlaying(false));
  }, [current, normalized.autoplay, visible]);

  useEffect(() => {
    const onMediaPlay = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLMediaElement)) return;
      if (target.dataset.profileSoundtrack === "true") return;
      if (target.muted || target.volume <= 0) return;
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      resumeAfterFocusRef.current = true;
      audio.pause();
    };

    const maybeResume = () => {
      const otherAudibleMedia = Array.from(
        document.querySelectorAll<HTMLMediaElement>("video, audio"),
      ).some((media) =>
        media.dataset.profileSoundtrack !== "true" &&
        !media.paused &&
        !media.ended &&
        !media.muted &&
        media.volume > 0,
      );

      if (otherAudibleMedia || !resumeAfterFocusRef.current) return;
      resumeAfterFocusRef.current = false;
      if (visible) void audioRef.current?.play().catch(() => setPlaying(false));
    };

    document.addEventListener("play", onMediaPlay, true);
    document.addEventListener("pause", maybeResume, true);
    document.addEventListener("ended", maybeResume, true);
    const observer = new MutationObserver(maybeResume);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener("play", onMediaPlay, true);
      document.removeEventListener("pause", maybeResume, true);
      document.removeEventListener("ended", maybeResume, true);
      observer.disconnect();
      audioRef.current?.pause();
    };
  }, [visible]);

  if (!visible || normalized.tracks.length === 0) return null;

  const next = () => {
    if (!playable.length) return;
    if (normalized.shuffle && playable.length > 1) {
      let nextIndex = index;
      while (nextIndex === index) nextIndex = Math.floor(Math.random() * playable.length);
      setIndex(nextIndex);
      return;
    }
    setIndex((value) => (value + 1) % playable.length);
  };

  const previous = () => {
    if (!playable.length) return;
    setIndex((value) => (value - 1 + playable.length) % playable.length);
  };

  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    resumeAfterFocusRef.current = false;
    if (audio.paused) {
      try { await audio.play(); } catch (error) { console.error("Profile music playback failed:", error); }
    } else {
      audio.pause();
    }
  };

  const seek = (event: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(event.target.value);
  };

  const choose = (track: SoundtrackTrack) => {
    if (track.sourceType !== "upload") {
      window.open(track.source, "_blank", "noopener,noreferrer");
      return;
    }
    const nextIndex = playable.findIndex((item) => item.id === track.id);
    if (nextIndex >= 0) setIndex(nextIndex);
    setExpanded(true);
  };

  return (
    <div className={`profile-soundtrack profile-soundtrack--${variant} ${expanded ? "profile-soundtrack--expanded" : ""}`}>
      <header className="profile-soundtrack__header">
        <button className="profile-soundtrack__identity" type="button" onClick={() => setExpanded((value) => !value)}>
          <span>♫</span>
          <span>
            <strong>{current?.title ?? "Profile soundtrack"}</strong>
            <small>{current?.artist ?? `${normalized.tracks.length} tracks`}</small>
          </span>
        </button>
        <span className="profile-soundtrack__count">{normalized.tracks.length}/25</span>
      </header>

      <div className="profile-soundtrack__controls">
        <button type="button" onClick={previous} disabled={!current}>◀</button>
        <button className="profile-soundtrack__play" type="button" onClick={toggle} disabled={!current}>{playing ? "Ⅱ" : "▶"}</button>
        <button type="button" onClick={next} disabled={!current}>▶</button>
        <div className="profile-soundtrack__timeline">
          <input type="range" min="0" max={duration || 0} step="0.01" value={Math.min(currentTime, duration || 0)} onChange={seek} disabled={!current} />
          <div><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
        </div>
      </div>

      <div className="profile-soundtrack__playlist">
        {normalized.tracks.map((track, trackIndex) => (
          <button type="button" key={track.id} data-active={current?.id === track.id} onClick={() => choose(track)}>
            <span>{String(trackIndex + 1).padStart(2, "0")}</span>
            <span><strong>{track.title}</strong><small>{track.artist}</small></span>
            <em>{track.sourceType === "upload" ? (current?.id === track.id && playing ? "PLAYING" : "PLAY") : track.sourceType.toUpperCase()}</em>
          </button>
        ))}
      </div>

      {current && (
        <audio
          ref={audioRef}
          data-profile-soundtrack="true"
          src={current.source}
          preload="metadata"
          onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
          onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
          onPlay={() => { setPlaying(true); setExpanded(true); }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setCurrentTime(0);
            if (normalized.repeat && audioRef.current) {
              audioRef.current.currentTime = 0;
              void audioRef.current.play();
            } else {
              next();
            }
          }}
        />
      )}
    </div>
  );
}
