import {
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";

import AvatarStudio, {
  DEFAULT_AVATAR_TRANSFORM,
  getAvatarImageStyle,
} from "../AvatarStudio";
import type {
  AvatarTransform,
} from "../AvatarStudio";

import BannerStudio, {
  DEFAULT_BANNER_TRANSFORM,
  getBannerImageStyle,
} from "../BannerStudio";
import type {
  BannerTransform,
} from "../BannerStudio";

import { AppearanceEditor } from "../../personalization/appearance";
import type { AppearanceValue } from "../../personalization/appearance";
import ProfileSoundtrackEditor from "../ProfileSoundtrackEditor";
import { EMPTY_PROFILE_SOUNDTRACK, normalizeSoundtrack } from "../../lib/profileSoundtrack";
import type { ProfileSoundtrack } from "../../lib/profileSoundtrack";
import { DEFAULT_THEME_ID } from "../../themes";
import { normalizePlayground } from "../../world/types/playground";
import type { PlaygroundData } from "../../world/types/playground";
import { DEFAULT_ENVIRONMENT_SETTINGS, normalizeEnvironmentSettings } from "../../personalization/environments";
import type { EnvironmentSettings } from "../../personalization/environments";

import "./EditProfile.css";

export type EditableProfile = {
  displayName: string;
  username: string;
  bio: string;

  avatarSrc?: string;
  avatarTransform: AvatarTransform;

  bannerSrc?: string;
  bannerTransform?: BannerTransform;

  soundtrack?: ProfileSoundtrack;

  showMusicPlayer: boolean;

  themeId: string;

  playground: PlaygroundData;

  environment: EnvironmentSettings;
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


export default function EditProfile({
  profile,
  onCancel,
  onSave,
}: EditProfileProps) {
  const avatarInputRef =
    useRef<HTMLInputElement | null>(null);

  const temporaryAvatarUrlRef =
    useRef<string | null>(null);

  const bannerInputRef =
    useRef<HTMLInputElement | null>(null);

  const temporaryBannerUrlRef =
    useRef<string | null>(null);

  const [displayName, setDisplayName] =
    useState(profile.displayName);

  const [username, setUsername] =
    useState(profile.username);

  const [bio, setBio] =
    useState(profile.bio);

  const [avatarSrc, setAvatarSrc] =
    useState(profile.avatarSrc);

  const [
    avatarTransform,
    setAvatarTransform,
  ] = useState<AvatarTransform>(
    profile.avatarTransform ??
      DEFAULT_AVATAR_TRANSFORM,
  );

  const [
    pendingAvatarSrc,
    setPendingAvatarSrc,
  ] = useState<string | null>(null);

  const [avatarStudioOpen, setAvatarStudioOpen] =
    useState(false);

  const [bannerSrc, setBannerSrc] =
    useState(profile.bannerSrc);

  const [
    bannerTransform,
    setBannerTransform,
  ] = useState<BannerTransform>(
    profile.bannerTransform ??
      DEFAULT_BANNER_TRANSFORM,
  );

  const [
    pendingBannerSrc,
    setPendingBannerSrc,
  ] = useState<string | null>(null);

  const [bannerStudioOpen, setBannerStudioOpen] =
    useState(false);

  const [showMusicPlayer, setShowMusicPlayer] =
    useState(profile.showMusicPlayer);

  const [themeId, setThemeId] = useState(
    profile.themeId || DEFAULT_THEME_ID,
  );

  const [playground, setPlayground] = useState(() =>
    normalizePlayground(profile.playground),
  );

  const [environment, setEnvironment] = useState(() =>
    normalizeEnvironmentSettings(profile.environment ?? DEFAULT_ENVIRONMENT_SETTINGS),
  );

  const [soundtrack, setSoundtrack] = useState<ProfileSoundtrack>(() =>
    normalizeSoundtrack(profile.soundtrack ?? EMPTY_PROFILE_SOUNDTRACK),
  );

  const [error, setError] = useState("");

  const activeAvatarTransform =
    avatarTransform ??
    DEFAULT_AVATAR_TRANSFORM;

  const activeBannerTransform =
    bannerTransform ??
    DEFAULT_BANNER_TRANSFORM;

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

      if (temporaryBannerUrlRef.current) {
        URL.revokeObjectURL(
          temporaryBannerUrlRef.current,
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

    setPendingAvatarSrc(nextUrl);
    setAvatarStudioOpen(true);
    setError("");
  };

  const loadBanner = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(
        "Please choose an image for your profile banner.",
      );
      event.target.value = "";
      return;
    }

    if (temporaryBannerUrlRef.current) {
      URL.revokeObjectURL(
        temporaryBannerUrlRef.current,
      );
    }

    const nextUrl = URL.createObjectURL(file);

    temporaryBannerUrlRef.current = nextUrl;

    setPendingBannerSrc(nextUrl);
    setBannerStudioOpen(true);
    setError("");
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


    setError("");

    if (
      temporaryAvatarUrlRef.current ===
      avatarSrc
    ) {
      temporaryAvatarUrlRef.current = null;
    }

    if (
      temporaryBannerUrlRef.current ===
      bannerSrc
    ) {
      temporaryBannerUrlRef.current = null;
    }

    onSave({
      displayName: nextDisplayName,
      username: nextUsername,
      bio: bio.trim(),
      avatarSrc: avatarSrc ?? profile.avatarSrc,
      avatarTransform: activeAvatarTransform,
      bannerSrc: bannerSrc ?? profile.bannerSrc,
      bannerTransform: activeBannerTransform,
      soundtrack,
      showMusicPlayer:
        soundtrack.tracks.length > 0 &&
        showMusicPlayer,
      themeId,
      playground,
      environment,
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
          <section className="edit-profile__banner-section">
            <div
              className="edit-profile__banner-preview"
              aria-label="Profile banner preview"
            >
              {bannerSrc ? (
                <img
                  src={bannerSrc}
                  alt=""
                  draggable={false}
                  style={getBannerImageStyle(
                    activeBannerTransform,
                  )}
                />
              ) : (
                <div
                  className="edit-profile__banner-placeholder"
                  aria-hidden="true"
                >
                  <span>Profile Banner</span>
                </div>
              )}
            </div>

            <div className="edit-profile__banner-meta">
              <div>
                <strong>Profile banner</strong>

                <p>
                  Choose a wide JPG, PNG, WEBP, or
                  another image format.
                </p>
              </div>

              <div className="edit-profile__banner-buttons">
                <button
                  type="button"
                  onClick={() =>
                    bannerInputRef.current?.click()
                  }
                >
                  Change banner
                </button>

                {bannerSrc && (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingBannerSrc(
                        bannerSrc,
                      );
                      setBannerStudioOpen(true);
                    }}
                  >
                    Adjust position
                  </button>
                )}
              </div>

              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                onChange={loadBanner}
                hidden
              />
            </div>
          </section>

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
                  style={getAvatarImageStyle(
                    activeAvatarTransform,
                  )}
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

              <div className="edit-profile__avatar-buttons">
                <button
                  type="button"
                  onClick={() =>
                    avatarInputRef.current?.click()
                  }
                >
                  Change photo
                </button>

                {avatarSrc && (
                  <button
                    type="button"
                    onClick={() => {
                      setPendingAvatarSrc(
                        avatarSrc,
                      );
                      setAvatarStudioOpen(true);
                    }}
                  >
                    Adjust position
                  </button>
                )}
              </div>

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

          <AppearanceEditor
            value={{ themeId, playground, environment }}
            onChange={(appearance: AppearanceValue) => {
              setThemeId(appearance.themeId);
              setPlayground(appearance.playground);
              setEnvironment(appearance.environment);
            }}
          />

          <ProfileSoundtrackEditor
            value={soundtrack}
            displayName={displayName.trim() || profile.displayName}
            onChange={setSoundtrack}
            onError={setError}
          />

          <section className="edit-profile__audio-mode">
            <div className="edit-profile__section-title">
              <div>
                <span>PROFILE AUDIO</span>
                <h3>Playback mode</h3>
              </div>
            </div>

            <div className="edit-profile__audio-mode-grid">
              <label>
                <input
                  type="radio"
                  name="profile-audio-mode"
                  checked={!showMusicPlayer && !soundtrack.autoplay}
                  onChange={() => {
                    setShowMusicPlayer(false);
                    setSoundtrack((current) => ({ ...current, autoplay: false }));
                  }}
                />
                <span><strong>Off</strong><small>No profile soundtrack.</small></span>
              </label>

              <label>
                <input
                  type="radio"
                  name="profile-audio-mode"
                  checked={showMusicPlayer}
                  disabled={!soundtrack.tracks.length}
                  onChange={() => {
                    setShowMusicPlayer(true);
                    setSoundtrack((current) => ({ ...current, autoplay: false }));
                  }}
                />
                <span><strong>Show player</strong><small>Display the themed playlist.</small></span>
              </label>

              <label>
                <input
                  type="radio"
                  name="profile-audio-mode"
                  checked={!showMusicPlayer && soundtrack.autoplay}
                  disabled={!soundtrack.tracks.length}
                  onChange={() => {
                    setShowMusicPlayer(false);
                    setSoundtrack((current) => ({ ...current, autoplay: true }));
                  }}
                />
                <span><strong>Hidden autoplay</strong><small>Attempt playback with a small visitor control.</small></span>
              </label>
            </div>
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

      {avatarStudioOpen &&
        pendingAvatarSrc && (
          <AvatarStudio
            imageSrc={pendingAvatarSrc}
            initialTransform={
              pendingAvatarSrc === avatarSrc
                ? avatarTransform
                : DEFAULT_AVATAR_TRANSFORM
            }
            onCancel={() => {
              if (
                pendingAvatarSrc !==
                  avatarSrc &&
                pendingAvatarSrc.startsWith(
                  "blob:",
                )
              ) {
                URL.revokeObjectURL(
                  pendingAvatarSrc,
                );
              }

              setPendingAvatarSrc(null);
              setAvatarStudioOpen(false);

              if (avatarInputRef.current) {
                avatarInputRef.current.value =
                  "";
              }
            }}
            onSave={(
              nextTransform: AvatarTransform,
            ) => {
              setAvatarSrc(
                pendingAvatarSrc,
              );
              setAvatarTransform(
                nextTransform,
              );
              setPendingAvatarSrc(null);
              setAvatarStudioOpen(false);
            }}
          />
        )}

      {bannerStudioOpen &&
        pendingBannerSrc && (
          <BannerStudio
            imageSrc={pendingBannerSrc}
            initialTransform={
              pendingBannerSrc === bannerSrc
                ? activeBannerTransform
                : DEFAULT_BANNER_TRANSFORM
            }
            onCancel={() => {
              if (
                pendingBannerSrc !==
                  bannerSrc &&
                pendingBannerSrc.startsWith(
                  "blob:",
                )
              ) {
                URL.revokeObjectURL(
                  pendingBannerSrc,
                );

                if (
                  temporaryBannerUrlRef.current ===
                  pendingBannerSrc
                ) {
                  temporaryBannerUrlRef.current =
                    null;
                }
              }

              setPendingBannerSrc(null);
              setBannerStudioOpen(false);

              if (bannerInputRef.current) {
                bannerInputRef.current.value =
                  "";
              }
            }}
            onSave={(
              nextTransform: BannerTransform,
            ) => {
              setBannerSrc(
                pendingBannerSrc,
              );
              setBannerTransform(
                nextTransform,
              );
              setPendingBannerSrc(null);
              setBannerStudioOpen(false);

              if (bannerInputRef.current) {
                bannerInputRef.current.value =
                  "";
              }
            }}
          />
        )}
    </div>
  );
}
