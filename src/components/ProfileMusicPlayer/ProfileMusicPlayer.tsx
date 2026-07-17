import {
  ChangeEvent,
  useEffect,
  useRef,
  useState,
} from "react";

import "./ProfileMusicPlayer.css";

export type ProfileTrack = {
  id: string;
  title: string;
  artist: string;
  audioSrc: string;
  artworkSrc?: string;
};

type ProfileMusicPlayerProps = {
  tracks: ProfileTrack[];
  username: string;
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

export default function ProfileMusicPlayer({
  tracks,
  username,
}: ProfileMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const activeTrack = tracks[trackIndex];

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !activeTrack) {
      return;
    }

    audio.pause();
    audio.load();

    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [activeTrack]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  if (!activeTrack) {
    return (
      <section className="profile-music profile-music--empty">
        <span>MUSIC</span>
        <p>{username} has not added music yet.</p>
      </section>
    );
  }

  const togglePlayback = async () => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch (error) {
        console.error("Music playback failed:", error);
      }

      return;
    }

    audio.pause();
  };

  const changeTrack = (direction: -1 | 1) => {
    if (tracks.length <= 1) {
      return;
    }

    setTrackIndex((current) => {
      const next = current + direction;

      if (next < 0) {
        return tracks.length - 1;
      }

      if (next >= tracks.length) {
        return 0;
      }

      return next;
    });
  };

  const seek = (event: ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    const nextTime = Number(event.target.value);

    if (!audio || !Number.isFinite(nextTime)) {
      return;
    }

    audio.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <section
      className="profile-music"
      aria-label={`${username} music player`}
    >
      <div className="profile-music__artwork">
        {activeTrack.artworkSrc ? (
          <img
            src={activeTrack.artworkSrc}
            alt=""
            draggable={false}
          />
        ) : (
          <div className="profile-music__fallback">
            PG.
          </div>
        )}

        <button
          className="profile-music__play"
          type="button"
          onClick={togglePlayback}
          aria-label={playing ? "Pause track" : "Play track"}
        >
          <span aria-hidden="true">
            {playing ? "Ⅱ" : "▶"}
          </span>
        </button>
      </div>

      <div className="profile-music__body">
        <header className="profile-music__header">
          <div>
            <span>PROFILE MUSIC</span>
            <strong>{activeTrack.title}</strong>
            <small>{activeTrack.artist}</small>
          </div>

          <span className="profile-music__count">
            {trackIndex + 1}/{tracks.length}
          </span>
        </header>

        <div className="profile-music__timeline">
          <span>{formatTime(currentTime)}</span>

          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.01"
            value={Math.min(currentTime, duration || 0)}
            onChange={seek}
            aria-label="Track position"
          />

          <span>{formatTime(duration)}</span>
        </div>

        <div className="profile-music__controls">
          <button
            type="button"
            onClick={() => changeTrack(-1)}
            disabled={tracks.length <= 1}
            aria-label="Previous track"
          >
            ←
          </button>

          <button
            type="button"
            onClick={togglePlayback}
          >
            {playing ? "Pause" : "Play"}
          </button>

          <button
            type="button"
            onClick={() => changeTrack(1)}
            disabled={tracks.length <= 1}
            aria-label="Next track"
          >
            →
          </button>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={activeTrack.audioSrc}
        preload="metadata"
        onLoadedMetadata={(event) => {
          const nextDuration = event.currentTarget.duration;

          setDuration(
            Number.isFinite(nextDuration)
              ? nextDuration
              : 0,
          );
        }}
        onDurationChange={(event) => {
          const nextDuration = event.currentTarget.duration;

          setDuration(
            Number.isFinite(nextDuration)
              ? nextDuration
              : 0,
          );
        }}
        onTimeUpdate={(event) => {
          setCurrentTime(event.currentTarget.currentTime);
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          if (tracks.length > 1) {
            changeTrack(1);
          } else {
            setPlaying(false);
            setCurrentTime(0);
          }
        }}
      />
    </section>
  );
}
