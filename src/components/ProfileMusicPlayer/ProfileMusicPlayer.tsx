import {
  useEffect,
  useRef,
  useState,
} from "react";
import type { ChangeEvent } from "react";

import "./ProfileMusicPlayer.css";

export type ProfileTrack = {
  title: string;
  artist?: string;
  audioSrc: string;
};

type ProfileMusicPlayerProps = {
  track: ProfileTrack | null;
  visible?: boolean;
  defaultExpanded?: boolean;
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
  track,
  visible = true,
  defaultExpanded = false,
}: ProfileMusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [expanded, setExpanded] = useState(defaultExpanded);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.pause();
    audio.load();

    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [track?.audioSrc]);

  useEffect(() => {
    if (visible) {
      return;
    }

    const audio = audioRef.current;

    if (audio) {
      audio.pause();
    }

    setPlaying(false);
    setExpanded(false);
  }, [visible]);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  if (!visible || !track) {
    return null;
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
        console.error("Profile music playback failed:", error);
        setPlaying(false);
      }

      return;
    }

    audio.pause();
  };

  const toggleExpanded = () => {
    setExpanded((current) => !current);
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
    <div
      className={`profile-bio-music ${
        expanded
          ? "profile-bio-music--expanded"
          : "profile-bio-music--collapsed"
      }`}
    >
      <div className="profile-bio-music__topline">
        <button
          className="profile-bio-music__identity"
          type="button"
          onClick={toggleExpanded}
          aria-expanded={expanded}
          aria-label={
            expanded
              ? `Collapse ${track.title} player`
              : `Expand ${track.title} player`
          }
        >
          <span
            className="profile-bio-music__note"
            aria-hidden="true"
          >
            ♫
          </span>

          <span className="profile-bio-music__title">
            {track.title}
          </span>
        </button>

        {expanded && (
          <div className="profile-bio-music__actions">
            <span className="profile-bio-music__duration">
              {formatTime(duration)}
            </span>

            <button
              className="profile-bio-music__collapse"
              type="button"
              onClick={toggleExpanded}
              aria-label="Collapse music player"
            >
              −
            </button>
          </div>
        )}
      </div>

      <div
        className="profile-bio-music__expanded-content"
        aria-hidden={!expanded}
      >
        <div className="profile-bio-music__playback">
          <button
            className="profile-bio-music__play"
            type="button"
            onClick={togglePlayback}
            aria-label={playing ? "Pause song" : "Play song"}
          >
            <span aria-hidden="true">
              {playing ? "Ⅱ" : "▶"}
            </span>
          </button>

          <div className="profile-bio-music__timeline">
            <input
              type="range"
              min="0"
              max={duration || 0}
              step="0.01"
              value={Math.min(currentTime, duration || 0)}
              onChange={seek}
              aria-label="Song position"
            />

            <div className="profile-bio-music__times">
              <span>{formatTime(currentTime)}</span>

              {track.artist && (
                <span>{track.artist}</span>
              )}

              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </div>

      <audio
        ref={audioRef}
        src={track.audioSrc}
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
        onPlay={() => {
          setPlaying(true);
          setExpanded(true);
        }}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setCurrentTime(0);
        }}
      />
    </div>
  );
}
