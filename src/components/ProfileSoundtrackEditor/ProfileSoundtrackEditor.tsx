import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  createTrackId,
  detectExternalTrackType,
  MAX_PROFILE_TRACKS,
} from "../../lib/profileSoundtrack";
import type {
  ProfileSoundtrack,
  SoundtrackTrack,
} from "../../lib/profileSoundtrack";
import "./ProfileSoundtrackEditor.css";

type Props = {
  value: ProfileSoundtrack;
  displayName: string;
  onChange: (value: ProfileSoundtrack) => void;
  onError: (message: string) => void;
};

function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) return true;
  const ext = file.name.split(".").pop()?.toLowerCase();
  return Boolean(ext && ["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext));
}

export default function ProfileSoundtrackEditor({ value, displayName, onChange, onError }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");

  const addFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    const remaining = MAX_PROFILE_TRACKS - value.tracks.length;
    const accepted = files.filter(isAudioFile).slice(0, Math.max(0, remaining));
    if (!accepted.length) {
      onError(remaining <= 0 ? "Your soundtrack already has 25 tracks." : "Choose MP3, WAV, M4A, AAC, OGG, or FLAC files.");
      event.target.value = "";
      return;
    }

    const tracks: SoundtrackTrack[] = accepted.map((file) => ({
      id: createTrackId(),
      title: file.name.replace(/\.[^.]+$/, ""),
      artist: displayName,
      sourceType: "upload",
      source: URL.createObjectURL(file),
      filename: file.name,
    }));

    onChange({ ...value, tracks: [...value.tracks, ...tracks].slice(0, MAX_PROFILE_TRACKS) });
    event.target.value = "";
  };

  const addLink = () => {
    const sourceType = detectExternalTrackType(url);
    if (!sourceType) {
      onError("Enter a valid Spotify or YouTube URL.");
      return;
    }
    if (value.tracks.length >= MAX_PROFILE_TRACKS) {
      onError("Your soundtrack already has 25 tracks.");
      return;
    }
    onChange({
      ...value,
      tracks: [...value.tracks, {
        id: createTrackId(),
        title: title.trim() || (sourceType === "spotify" ? "Spotify track" : "YouTube track"),
        artist: artist.trim() || displayName,
        sourceType,
        source: url.trim(),
      }],
    });
    setUrl("");
    setTitle("");
    setArtist("");
  };

  const remove = (track: SoundtrackTrack) => {
    if (track.sourceType === "upload" && track.source.startsWith("blob:")) URL.revokeObjectURL(track.source);
    onChange({ ...value, tracks: value.tracks.filter((item) => item.id !== track.id) });
  };

  const move = (index: number, delta: -1 | 1) => {
    const next = index + delta;
    if (next < 0 || next >= value.tracks.length) return;
    const tracks = [...value.tracks];
    const [track] = tracks.splice(index, 1);
    tracks.splice(next, 0, track);
    onChange({ ...value, tracks });
  };

  return (
    <section className="soundtrack-editor">
      <header>
        <div>
          <span>PROFILE SOUNDTRACK</span>
          <h3>{value.tracks.length}/{MAX_PROFILE_TRACKS} tracks</h3>
        </div>
      </header>

      <div className="soundtrack-editor__toggles">
        {([
          ["autoplay", "Autoplay"],
          ["shuffle", "Shuffle"],
          ["repeat", "Repeat track"],
        ] as const).map(([key, label]) => (
          <label key={key}>
            <input
              type="checkbox"
              checked={value[key]}
              onChange={(event) => onChange({ ...value, [key]: event.target.checked })}
            />
            <span>{label}</span>
          </label>
        ))}
      </div>

      <div className="soundtrack-editor__upload">
        <div>
          <strong>Upload audio</strong>
          <p>Select several files at once. Uploaded audio plays directly in Playground.</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()}>Add audio files</button>
        <input ref={inputRef} type="file" multiple accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac" onChange={addFiles} hidden />
      </div>

      <div className="soundtrack-editor__link">
        <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="Spotify or YouTube URL" />
        <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Song title" />
        <input value={artist} onChange={(event) => setArtist(event.target.value)} placeholder="Artist" />
        <button type="button" onClick={addLink}>Add link</button>
        <small>Spotify and YouTube links open in their provider. Uploaded files play in the native playlist.</small>
      </div>

      <div className="soundtrack-editor__tracks">
        {value.tracks.map((track, index) => (
          <article key={track.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{track.title}</strong>
              <small>{track.artist} · {track.sourceType}</small>
            </div>
            <div>
              <button type="button" disabled={index === 0} onClick={() => move(index, -1)}>↑</button>
              <button type="button" disabled={index === value.tracks.length - 1} onClick={() => move(index, 1)}>↓</button>
              <button type="button" onClick={() => remove(track)}>Remove</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
