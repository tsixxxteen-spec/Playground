import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import type { ProfileSoundtrack, SoundtrackTrack } from "../../lib/profileSoundtrack";
import { normalizeSoundtrack } from "../../lib/profileSoundtrack";
import "./ProfileMusicPlayer.css";

export type ProfileTrack = { title: string; artist?: string; audioSrc: string };

type Props = {
  soundtrack: ProfileSoundtrack;
  visible?: boolean;
  defaultExpanded?: boolean;
  variant?: string;
  hiddenMode?: boolean;
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
  hiddenMode = false,
}: Props) {
  const normalized = useMemo(() => normalizeSoundtrack(soundtrack), [soundtrack]);
  const playable = useMemo(
    () => normalized.tracks.filter((track) => track.sourceType === "upload" && Boolean(track.source)),
    [normalized.tracks],
  );
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const resumeAfterFocusRef = useRef(false);
  const manuallyPausedRef = useRef(false);
  const [expanded, setExpanded] = useState(hiddenMode ? false : defaultExpanded);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const current = playable[index] ?? playable[0] ?? null;

  useEffect(() => { if (index >= playable.length) setIndex(0); }, [index, playable.length]);
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.load();
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    if (normalized.autoplay && current && !manuallyPausedRef.current) {
      const playWhenReady = () => {
        void audio.play().catch(() => setPlaying(false));
      };

      audio.addEventListener("canplay", playWhenReady, { once: true });

      return () => {
        audio.removeEventListener("canplay", playWhenReady);
      };
    }
  }, [current?.id, normalized.autoplay]);
  useEffect(() => {
    if (!visible) { audioRef.current?.pause(); setPlaying(false); setExpanded(false); }
  }, [visible]);
  useEffect(() => {
    if (!visible || !normalized.autoplay || !current || manuallyPausedRef.current) return;
    void audioRef.current?.play().catch(() => setPlaying(false));
  }, [current, normalized.autoplay, visible]);
  useEffect(() => {
    if (!visible || !normalized.autoplay || !current) return;

    let playbackStarted = false;

    const tryAutoplay = async () => {
      if (playbackStarted || manuallyPausedRef.current) return;

      const audio = audioRef.current;
      if (!audio) return;

      try {
        await audio.play();
        playbackStarted = true;

        window.removeEventListener("pointerdown", tryAutoplay);
        window.removeEventListener("keydown", tryAutoplay);
        audio.removeEventListener("canplay", tryAutoplay);
        audio.removeEventListener("loadeddata", tryAutoplay);
      } catch {
        /*
         * Keep retry listeners active. Tauri/WebKit may reject
         * playback before the media element is fully ready.
         */
      }
    };

    void tryAutoplay();

    window.addEventListener("pointerdown", tryAutoplay);
    window.addEventListener("keydown", tryAutoplay);

    const audio = audioRef.current;
    audio?.addEventListener("canplay", tryAutoplay);
    audio?.addEventListener("loadeddata", tryAutoplay);

    return () => {
      window.removeEventListener("pointerdown", tryAutoplay);
      window.removeEventListener("keydown", tryAutoplay);
      audio?.removeEventListener("canplay", tryAutoplay);
      audio?.removeEventListener("loadeddata", tryAutoplay);
    };
  }, [normalized.autoplay, visible, current?.id]);

  useEffect(() => {
    const onMediaPlay = (event: Event) => {
      const target = event.target;
      if (!(target instanceof HTMLMediaElement)) return;
      if (target.dataset.profileSoundtrack === "true" || target.muted || target.volume <= 0) return;
      const audio = audioRef.current;
      if (!audio || audio.paused) return;
      resumeAfterFocusRef.current = true;
      audio.pause();
    };
    const maybeResume = () => {
      const otherAudibleMedia = Array.from(document.querySelectorAll<HTMLMediaElement>("video, audio")).some(
        (media) => media.dataset.profileSoundtrack !== "true" && !media.paused && !media.ended && !media.muted && media.volume > 0,
      );
      if (otherAudibleMedia || !resumeAfterFocusRef.current || manuallyPausedRef.current) return;
      resumeAfterFocusRef.current = false;
      if (visible) void audioRef.current?.play().catch(() => setPlaying(false));
    };
    document.addEventListener("play", onMediaPlay, true);
    document.addEventListener("pause", maybeResume, true);
    document.addEventListener("ended", maybeResume, true);
    return () => {
      document.removeEventListener("play", onMediaPlay, true);
      document.removeEventListener("pause", maybeResume, true);
      document.removeEventListener("ended", maybeResume, true);
      audioRef.current?.pause();
    };
  }, [visible]);

  if (!visible || normalized.tracks.length === 0) return null;

  const next = () => {
    if (!playable.length) return;
    manuallyPausedRef.current = false;
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
    manuallyPausedRef.current = false;
    setIndex((value) => (value - 1 + playable.length) % playable.length);
  };
  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio || !current) return;
    resumeAfterFocusRef.current = false;
    if (audio.paused) {
      manuallyPausedRef.current = false;
      try { await audio.play(); } catch (error) { console.error("Profile music playback failed:", error); }
    } else {
      manuallyPausedRef.current = true;
      audio.pause();
    }
  };
  const seek = (event: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Number(event.target.value);
  };
  const choose = (track: SoundtrackTrack) => {
    if (track.sourceType !== "upload") {
      window.open(track.source, "_blank", "noopener,noreferrer");
      return;
    }
    const nextIndex = playable.findIndex((item) => item.id === track.id);
    if (nextIndex >= 0) { manuallyPausedRef.current = false; setIndex(nextIndex); }
    if (!hiddenMode) setExpanded(true);
  };

  return <div className={[
    "profile-soundtrack",
    `profile-soundtrack--${variant}`,
    expanded ? "profile-soundtrack--expanded" : "",
    hiddenMode ? "profile-soundtrack--hidden" : "",
  ].filter(Boolean).join(" ")}>
    <header className="profile-soundtrack__header">
  <button
    className="profile-soundtrack__identity"
    type="button"
    onClick={toggle}
    disabled={!current}
    aria-label={playing ? "Pause profile music" : "Play profile music"}
  >
    <span>♫</span>

    <span>
      <strong>{current?.title ?? "Profile soundtrack"}</strong>

      <small>
        {current?.artist ?? `${normalized.tracks.length} tracks`}
      </small>
    </span>
  </button>

  <div className="profile-soundtrack__header-actions">
    <span className="profile-soundtrack__count">
      {normalized.tracks.length}/25
    </span>

    <button
      className="profile-soundtrack__collapse"
      type="button"
      onClick={() => setExpanded((value) => !value)}
      aria-expanded={expanded}
      aria-label={expanded ? "Collapse music player" : "Expand music player"}
    >
      <span aria-hidden="true">⌄</span>
    </button>
  </div>
</header>
    <div className="profile-soundtrack__controls">
      <button type="button" onClick={previous} disabled={!current} aria-label="Previous track">◀</button>
      <button className="profile-soundtrack__play" type="button" onClick={toggle} disabled={!current} aria-label={playing ? "Pause profile music" : "Play profile music"}>{playing ? "Ⅱ" : "▶"}</button>
      <button type="button" onClick={next} disabled={!current} aria-label="Next track">▶</button>
      <div className="profile-soundtrack__timeline">
        <input type="range" min="0" max={duration || 0} step="0.01" value={Math.min(currentTime, duration || 0)} onChange={seek} disabled={!current} />
        <div><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div>
      </div>
    </div>
    <div className="profile-soundtrack__playlist">
      {normalized.tracks.map((track, trackIndex) => <button type="button" key={track.id} data-active={current?.id === track.id} onClick={() => choose(track)}>
        <span>{String(trackIndex + 1).padStart(2, "0")}</span>
        <span><strong>{track.title}</strong><small>{track.artist}</small></span>
        <em>{track.sourceType === "upload" ? (current?.id === track.id && playing ? "PLAYING" : "PLAY") : track.sourceType.toUpperCase()}</em>
      </button>)}
    </div>
    {current && <audio
      ref={audioRef}
      data-profile-soundtrack="true"
      src={current.source}
      preload="auto"
      autoPlay={normalized.autoplay}
      playsInline
      onCanPlay={() => {
        if (normalized.autoplay && !manuallyPausedRef.current) {
          void audioRef.current?.play().catch(() => setPlaying(false));
        }
      }}
      onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
      onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
     onPlay={() => { setPlaying(true); }}
      onPause={() => setPlaying(false)}
      onEnded={() => {
        setPlaying(false); setCurrentTime(0);
        if (normalized.repeat && audioRef.current) {
          audioRef.current.currentTime = 0;
          void audioRef.current.play();
        } else next();
      }}
    />}
  </div>;
}
