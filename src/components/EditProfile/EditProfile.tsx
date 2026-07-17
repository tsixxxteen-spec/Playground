import {
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";

import "./EditProfile.css";

export type EditableProfile = {
  displayName: string;
  username: string;
  bio: string;
  avatarSrc?: string;
  musicTitle: string;
  musicArtist?: string;
  musicSrc?: string;
  showMusicPlayer: boolean;
};

type EditProfileProps = {
  profile: EditableProfile;
  onCancel: () => void;
  onSave: (profile: EditableProfile) => void;
};

function normalizeUsername(value: string): string {
  const cleaned = value
    .trim()
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9._@]/g, "");

  if (!cleaned) {
    return "";
  }

  return cleaned.startsWith("@")
    ? cleaned
    : `@${cleaned}`;
}

function getInitials(displayName: string): string {
  const words = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "PG";
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

function isAudioFile(file: File): boolean {
  if (file.type.startsWith("audio/")) {
    return true;
  }

  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  return Boolean(
    extension &&
      [
        "mp3",
        "wav",
        "m4a",
        "aac",
        "ogg",
        "flac",
      ].includes(extension),
  );
}

export default function EditProfile({
  profile,
  onCancel,
  onSave,
}: EditProfileProps) {
  const avatarInputRef =
    useRef<HTMLInputElement | null>(null);

  const musicInputRef =
    useRef<HTMLInputElement | null>(null);

  const temporaryAvatarUrlRef =
    useRef<string | null>(null);

  const temporaryMusicUrlRef =
    useRef<string | null>(null);

  const [displayName, setDisplayName] =
    useState(profile.displayName);

  const [username, setUsername] =
    useState(profile.username);

  const [bio, setBio] =
    useState(profile.bio);

  const [avatarSrc, setAvatarSrc] =
    useState(profile.avatarSrc);

  const [musicTitle, setMusicTitle] =
    useState(profile.musicTitle);

  const [musicArtist, setMusicArtist] =
    useState(
      profile.musicArtist ?? profile.displayName,
    );

  const [musicSrc, setMusicSrc] =
    useState(profile.musicSrc);

  const [musicFilename, setMusicFilename] =
    useState("");

  const [showMusicPlayer, setShowMusicPlayer] =
    useState(profile.showMusicPlayer);

  const [error, setError] = useState("");

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    document.body.classList.add("edit-profile-open");
    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.classList.remove(
        "edit-profile-open",
      );

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [onCancel]);

  useEffect(() => {
    return () => {
      if (temporaryAvatarUrlRef.current) {
        URL.revokeObjectURL(
          temporaryAvatarUrlRef.current,
        );
      }

      if (temporaryMusicUrlRef.current) {
        URL.revokeObjectURL(
          temporaryMusicUrlRef.current,
        );
      }
    };
  }, []);

  const loadAvatar = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please choose an image for your profile photo.",
      );
      event.target.value = "";
      return;
    }

    if (temporaryAvatarUrlRef.current) {
      URL.revokeObjectURL(
        temporaryAvatarUrlRef.current,
      );
    }

    const nextUrl = URL.createObjectURL(file);

    temporaryAvatarUrlRef.current = nextUrl;

    setAvatarSrc(nextUrl);
    setError("");
  };

  const loadMusic = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!isAudioFile(file)) {
      setError(
        "Please choose an MP3, WAV, M4A, AAC, OGG, or FLAC audio file.",
      );
      event.target.value = "";
      return;
    }

    if (temporaryMusicUrlRef.current) {
      URL.revokeObjectURL(
        temporaryMusicUrlRef.current,
      );
    }

    const nextUrl = URL.createObjectURL(file);

    temporaryMusicUrlRef.current = nextUrl;

    setMusicSrc(nextUrl);
    setMusicFilename(file.name);

    if (!musicTitle.trim()) {
      setMusicTitle(
        file.name.replace(/\.[^.]+$/, ""),
      );
    }

    setShowMusicPlayer(true);
    setError("");
  };

  const removeMusic = () => {
    if (temporaryMusicUrlRef.current) {
      URL.revokeObjectURL(
        temporaryMusicUrlRef.current,
      );
      temporaryMusicUrlRef.current = null;
    }

    setMusicSrc(undefined);
    setMusicFilename("");
    setShowMusicPlayer(false);

    if (musicInputRef.current) {
      musicInputRef.current.value = "";
    }
  };

  const submit = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const nextDisplayName = displayName.trim();
    const nextUsername =
      normalizeUsername(username);

    if (!nextDisplayName) {
      setError("Your display name cannot be empty.");
      return;
    }

    if (!nextUsername || nextUsername === "@") {
      setError("Please enter a valid username.");
      return;
    }

    if (
      showMusicPlayer &&
      (!musicSrc || !musicTitle.trim())
    ) {
      setError(
        "Choose a profile song and give it a title before showing the player.",
      );
      return;
    }

    setError("");

    onSave({
      displayName: nextDisplayName,
      username: nextUsername,
      bio: bio.trim(),
      avatarSrc,
      musicTitle: musicTitle.trim(),
      musicArtist:
        musicArtist.trim() || nextDisplayName,
      musicSrc,
      showMusicPlayer:
        Boolean(musicSrc) && showMusicPlayer,
    });
  };

  return (
    <div
      className="edit-profile"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-profile-title"
    >
      <button
        className="edit-profile__backdrop"
        type="button"
        onClick={onCancel}
        aria-label="Close edit profile"
      />

      <form
        className="edit-profile__panel"
        onSubmit={submit}
      >
        <header className="edit-profile__header">
          <div>
            <span>YOUR PLAYGROUND</span>

            <h2 id="edit-profile-title">
              Edit profile
            </h2>
          </div>

          <button
            className="edit-profile__close"
            type="button"
            onClick={onCancel}
            aria-label="Close edit profile"
          >
            <span />
            <span />
          </button>
        </header>

        <div className="edit-profile__content">
          <section className="edit-profile__identity">
            <div
              className="edit-profile__avatar"
              aria-label="Profile photo preview"
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt=""
                  draggable={false}
                />
              ) : (
                <span aria-hidden="true">
                  {getInitials(displayName)}
                </span>
              )}
            </div>

            <div className="edit-profile__avatar-actions">
              <strong>Profile photo</strong>

              <p>
                JPG, PNG, WEBP, or another image
                format.
              </p>

              <button
                type="button"
                onClick={() =>
                  avatarInputRef.current?.click()
                }
              >
                Change photo
              </button>

              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={loadAvatar}
                hidden
              />
            </div>
          </section>

          <section className="edit-profile__fields">
            <label>
              <span>Display name</span>

              <input
                type="text"
                value={displayName}
                maxLength={50}
                onChange={(event) =>
                  setDisplayName(event.target.value)
                }
                autoComplete="name"
              />

              <small>
                {displayName.length}/50
              </small>
            </label>

            <label>
              <span>Username</span>

              <input
                type="text"
                value={username}
                maxLength={31}
                onChange={(event) =>
                  setUsername(event.target.value)
                }
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
              />

              <small>
                Letters, numbers, periods, and
                underscores.
              </small>
            </label>

            <label>
              <span>Bio</span>

              <textarea
                value={bio}
                maxLength={180}
                rows={4}
                onChange={(event) =>
                  setBio(event.target.value)
                }
              />

              <small>{bio.length}/180</small>
            </label>
          </section>

          <section className="edit-profile__music">
            <div className="edit-profile__section-title">
              <div>
                <span>PROFILE MUSIC</span>
                <h3>♫ {musicTitle || "No song"}</h3>
              </div>

              <label className="edit-profile__switch">
                <input
                  type="checkbox"
                  checked={
                    Boolean(musicSrc) &&
                    showMusicPlayer
                  }
                  disabled={!musicSrc}
                  onChange={(event) =>
                    setShowMusicPlayer(
                      event.target.checked,
                    )
                  }
                />

                <span aria-hidden="true" />

                <strong>
                  Show on profile
                </strong>
              </label>
            </div>

            <div className="edit-profile__music-file">
              <div>
                <strong>
                  {musicFilename ||
                    (musicSrc
                      ? "Current profile song"
                      : "No song selected")}
                </strong>

                <p>
                  This song only appears inside your
                  profile bio.
                </p>
              </div>

              <div>
                <button
                  type="button"
                  onClick={() =>
                    musicInputRef.current?.click()
                  }
                >
                  {musicSrc
                    ? "Replace song"
                    : "Choose song"}
                </button>

                {musicSrc && (
                  <button
                    className="edit-profile__remove"
                    type="button"
                    onClick={removeMusic}
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                ref={musicInputRef}
                type="file"
                accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac"
                onChange={loadMusic}
                hidden
              />
            </div>

            <div className="edit-profile__music-fields">
              <label>
                <span>Song title</span>

                <input
                  type="text"
                  value={musicTitle}
                  maxLength={70}
                  disabled={!musicSrc}
                  onChange={(event) =>
                    setMusicTitle(event.target.value)
                  }
                  placeholder="FREE"
                />
              </label>

              <label>
                <span>Artist</span>

                <input
                  type="text"
                  value={musicArtist}
                  maxLength={70}
                  disabled={!musicSrc}
                  onChange={(event) =>
                    setMusicArtist(
                      event.target.value,
                    )
                  }
                  placeholder={displayName}
                />
              </label>
            </div>

            {musicSrc && (
              <audio
                className="edit-profile__preview"
                src={musicSrc}
                controls
                preload="metadata"
              />
            )}
          </section>

          {error && (
            <p
              className="edit-profile__error"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <footer className="edit-profile__footer">
          <button
            className="edit-profile__cancel"
            type="button"
            onClick={onCancel}
          >
            Cancel
          </button>

          <button
            className="edit-profile__save"
            type="submit"
          >
            Save changes
          </button>
        </footer>
      </form>
    </div>
  );
}
