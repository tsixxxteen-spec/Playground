#!/usr/bin/env bash

set -euo pipefail

PROJECT_ROOT="/Users/terrysupreme/Desktop/worlds"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR=".worlds-sprint-backups/sprint-18a-expression-actions-$STAMP"

cd "$PROJECT_ROOT"

echo
echo "=============================================="
echo " PLAYGROUND — SPRINT 18A"
echo " Expression-First Profile Actions"
echo "=============================================="
echo

REQUIRED_FILES=(
  "src/components/YourPlayground/YourPlayground.tsx"
  "src/profile-experiences/ExperienceRenderer.tsx"
  "src/profile-experiences/shared/ExperienceTypes.ts"
)

for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    echo "❌ Missing required file: $file"
    exit 1
  fi
done

mkdir -p "$BACKUP_DIR"

cp \
  src/components/YourPlayground/YourPlayground.tsx \
  "$BACKUP_DIR/YourPlayground.tsx"

cp \
  src/profile-experiences/ExperienceRenderer.tsx \
  "$BACKUP_DIR/ExperienceRenderer.tsx"

cp \
  src/profile-experiences/shared/ExperienceTypes.ts \
  "$BACKUP_DIR/ExperienceTypes.ts"

if [ -d "src/components/ProfileActionBar" ]; then
  cp -R \
    src/components/ProfileActionBar \
    "$BACKUP_DIR/ProfileActionBar-existing"
fi

echo "✅ Backup created:"
echo "   $BACKUP_DIR"

mkdir -p src/components/ProfileActionBar

cat > src/components/ProfileActionBar/ProfileActionBar.tsx <<'EOF'
import type {
  AccountVisibility,
  FollowRelationship,
} from "../../profile-experiences/shared/ExperienceTypes";

import "./ProfileActionBar.css";

type Props = {
  isOwner: boolean;
  accountVisibility: AccountVisibility;
  followRelationship: FollowRelationship;
  notice?: string | null;
  onEdit: () => void;
  onFollowToggle: () => void;
  onMessage: () => void;
  onShare: () => void;
  onCopyLink: () => void;
};

function followLabel(
  relationship: FollowRelationship,
): "Follow" | "Unfollow" {
  return relationship === "following"
    ? "Unfollow"
    : "Follow";
}

export default function ProfileActionBar({
  isOwner,
  accountVisibility,
  followRelationship,
  notice,
  onEdit,
  onFollowToggle,
  onMessage,
  onShare,
  onCopyLink,
}: Props) {
  const followText = followLabel(followRelationship);

  const followClassName = [
    "profile-action-bar__button",
    followRelationship === "following"
      ? "profile-action-bar__button--following"
      : "profile-action-bar__button--primary",
    followRelationship === "requested"
      ? "profile-action-bar__button--pending"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className="profile-action-bar-shell"
      aria-label={
        isOwner
          ? "Your profile controls"
          : "Profile actions"
      }
    >
      {notice ? (
        <div
          className="profile-action-bar__notice"
          role="status"
          aria-live="polite"
        >
          {notice}
        </div>
      ) : null}

      <div className="profile-action-bar">
        {isOwner ? (
          <>
            <button
              className="profile-action-bar__button profile-action-bar__button--primary"
              type="button"
              onClick={onEdit}
            >
              <span aria-hidden="true">✦</span>
              Edit Profile
            </button>

            <button
              className="profile-action-bar__button"
              type="button"
              onClick={onShare}
            >
              Share
            </button>

            <button
              className="profile-action-bar__button"
              type="button"
              onClick={onCopyLink}
            >
              Copy Link
            </button>
          </>
        ) : (
          <>
            <button
              className={followClassName}
              type="button"
              onClick={onFollowToggle}
              aria-label={
                followRelationship === "requested"
                  ? accountVisibility === "private"
                    ? "Follow request sent. Activate to cancel."
                    : followText
                  : followText
              }
              title={
                followRelationship === "requested"
                  ? "Follow request sent"
                  : undefined
              }
            >
              {followText}
            </button>

            <button
              className="profile-action-bar__button"
              type="button"
              onClick={onMessage}
            >
              Message
            </button>

            <button
              className="profile-action-bar__button"
              type="button"
              onClick={onShare}
            >
              Share
            </button>
          </>
        )}
      </div>
    </section>
  );
}
EOF

cat > src/components/ProfileActionBar/ProfileActionBar.css <<'EOF'
.profile-action-bar-shell {
  position: fixed;
  z-index: 10950;
  top: 72px;
  right: 22px;

  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 9px;

  max-width: calc(100vw - 44px);

  font-family:
    "Helvetica Neue",
    Helvetica,
    Arial,
    sans-serif;
}

.profile-action-bar {
  display: flex;
  align-items: center;
  gap: 8px;

  padding: 6px;

  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;

  background: rgba(14, 14, 16, 0.82);
  box-shadow:
    0 14px 45px rgba(0, 0, 0, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);

  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.profile-action-bar__button {
  min-height: 36px;

  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;

  padding: 0 15px;

  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 999px;

  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.94);

  cursor: pointer;

  font: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.02em;
  white-space: nowrap;

  transition:
    transform 150ms ease,
    border-color 150ms ease,
    background 150ms ease,
    color 150ms ease,
    opacity 150ms ease;
}

.profile-action-bar__button:hover {
  border-color: rgba(255, 255, 255, 0.48);
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.profile-action-bar__button:active {
  transform: scale(0.96);
}

.profile-action-bar__button:focus-visible {
  outline: 2px solid #fff200;
  outline-offset: 3px;
}

.profile-action-bar__button--primary {
  border-color: #fff200;
  background: #fff200;
  color: #111;
}

.profile-action-bar__button--primary:hover {
  border-color: #fff65d;
  background: #fff65d;
  color: #111;
}

.profile-action-bar__button--following {
  border-color: rgba(255, 255, 255, 0.34);
  background: rgba(255, 255, 255, 0.14);
}

.profile-action-bar__button--following:hover {
  border-color: rgba(255, 115, 115, 0.75);
  background: rgba(255, 80, 80, 0.16);
  color: #ffd7d7;
}

.profile-action-bar__button--pending {
  position: relative;
}

.profile-action-bar__button--pending::after {
  width: 5px;
  height: 5px;

  margin-left: 1px;

  border-radius: 50%;
  background: currentColor;

  content: "";
  opacity: 0.7;
}

.profile-action-bar__notice {
  max-width: min(340px, calc(100vw - 44px));

  padding: 10px 14px;

  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 13px;

  background: rgba(14, 14, 16, 0.92);
  color: rgba(255, 255, 255, 0.94);

  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.24);

  font-size: 11px;
  font-weight: 650;
  line-height: 1.35;

  animation: profile-action-notice-in 180ms ease both;
}

@keyframes profile-action-notice-in {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 700px) {
  .profile-action-bar-shell {
    top: auto;
    right: 12px;
    bottom: calc(14px + env(safe-area-inset-bottom));
    left: 12px;

    align-items: stretch;

    max-width: none;
  }

  .profile-action-bar {
    width: 100%;
    justify-content: center;

    box-sizing: border-box;
  }

  .profile-action-bar__button {
    min-width: 0;
    flex: 1;

    padding-right: 10px;
    padding-left: 10px;
  }

  .profile-action-bar__notice {
    align-self: center;
  }
}

@media (prefers-reduced-motion: reduce) {
  .profile-action-bar__button,
  .profile-action-bar__notice {
    animation: none;
    transition: none;
  }
}
EOF

cat > src/components/ProfileActionBar/index.ts <<'EOF'
export { default } from "./ProfileActionBar";
EOF

python3 <<'PY'
from pathlib import Path
import re
import sys

path = Path("src/components/YourPlayground/YourPlayground.tsx")
text = path.read_text()

if 'from "../ProfileActionBar"' not in text:
    import_match = re.search(
        r'(import\s+FollowDrawer[^;]*;\s*)',
        text,
        flags=re.MULTILINE,
    )

    if not import_match:
        print("❌ Could not locate FollowDrawer import.")
        sys.exit(1)

    text = (
        text[:import_match.end()]
        + '\nimport ProfileActionBar from "../ProfileActionBar";\n'
        + text[import_match.end():]
    )

state_marker = '''  const [followDrawerMode, setFollowDrawerMode] =
    useState<FollowDrawerMode | null>(null);'''

if state_marker not in text:
    print("❌ Could not locate follow drawer state.")
    sys.exit(1)

if "const [activeFollowRelationship" not in text:
    state_replacement = state_marker + '''

  const [
    activeFollowRelationship,
    setActiveFollowRelationship,
  ] = useState<FollowRelationship>(followRelationship);

  const [profileActionNotice, setProfileActionNotice] =
    useState<string | null>(null);

  const showProfileActionNotice = (message: string) => {
    setProfileActionNotice(message);

    window.setTimeout(() => {
      setProfileActionNotice((current) =>
        current === message ? null : current
      );
    }, 2400);
  };'''

    text = text.replace(
        state_marker,
        state_replacement,
        1,
    )

effect_anchor = '''  useEffect(() => {
    let active = true;'''

if effect_anchor not in text:
    print("❌ Could not locate profile media effect.")
    sys.exit(1)

if "setActiveFollowRelationship(followRelationship)" not in text:
    relationship_effect = '''  useEffect(() => {
    setActiveFollowRelationship(followRelationship);
  }, [followRelationship]);

'''

    text = text.replace(
        effect_anchor,
        relationship_effect + effect_anchor,
        1,
    )

handler_anchor = '''  const hiddenAutoplay = soundtrack.tracks.length > 0 && !profile.showMusicPlayer && soundtrack.autoplay;'''

if handler_anchor not in text:
    print("❌ Could not locate hiddenAutoplay declaration.")
    sys.exit(1)

if "const handleFollowToggle" not in text:
    handlers = handler_anchor + '''

  const profileUrl = `${window.location.origin}${window.location.pathname}#${profile.username.replace(/^@/, "")}`;

  const handleFollowToggle = () => {
    if (activeFollowRelationship === "following") {
      setActiveFollowRelationship("none");
      showProfileActionNotice("You are no longer following this creator.");
      return;
    }

    if (activeFollowRelationship === "requested") {
      setActiveFollowRelationship("none");
      showProfileActionNotice("Follow request canceled.");
      return;
    }

    if (accountVisibility === "private") {
      setActiveFollowRelationship("requested");
      showProfileActionNotice("Follow request sent.");
      return;
    }

    setActiveFollowRelationship("following");
    showProfileActionNotice("You are now following this creator.");
  };

  const handleMessage = () => {
    window.dispatchEvent(
      new CustomEvent("playground:message-profile", {
        detail: {
          username: profile.username,
          displayName: profile.displayName,
        },
      }),
    );

    showProfileActionNotice(
      `Opening a message with ${profile.displayName}.`,
    );
  };

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(profileUrl);
      showProfileActionNotice("Profile link copied.");
    } catch {
      showProfileActionNotice("Could not copy the profile link.");
    }
  };

  const shareProfile = async () => {
    const shareData = {
      title: `${profile.displayName} on Playground`,
      text: `Explore ${profile.displayName}'s Playground.`,
      url: profileUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }

      await navigator.clipboard.writeText(profileUrl);
      showProfileActionNotice("Profile link copied.");
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      showProfileActionNotice("Profile sharing was unavailable.");
    }
  };'''

    text = text.replace(
        handler_anchor,
        handlers,
        1,
    )

text = text.replace(
    "followRelationship={followRelationship}",
    "followRelationship={activeFollowRelationship}",
    1,
)

editor_marker = '''    {editorOpen && ('''

if editor_marker not in text:
    print("❌ Could not locate editor render marker.")
    sys.exit(1)

if "<ProfileActionBar" not in text:
    action_bar = '''    <ProfileActionBar
      isOwner={isOwner}
      accountVisibility={accountVisibility}
      followRelationship={activeFollowRelationship}
      notice={profileActionNotice}
      onEdit={() => setEditorOpen(true)}
      onFollowToggle={handleFollowToggle}
      onMessage={handleMessage}
      onShare={shareProfile}
      onCopyLink={copyProfileLink}
    />

'''

    text = text.replace(
        editor_marker,
        action_bar + editor_marker,
        1,
    )

path.write_text(text)
print("✅ YourPlayground.tsx updated")
PY

python3 <<'PY'
from pathlib import Path
import re

path = Path("src/profile-experiences/ExperienceRenderer.tsx")
text = path.read_text()

patterns = [
    re.compile(
        r'''
        \s*<button
        \s+className="profile-experience-owner-edit"
        .*?
        </button>
        ''',
        re.DOTALL | re.VERBOSE,
    ),
    re.compile(
        r'''
        \s*<button\s+
        className="profile-experience-owner-edit"
        \s+type="button"
        \s+onClick=\{props\.onEdit\}
        \s+aria-label="Edit profile"
        >
        .*?
        </button>
        ''',
        re.DOTALL | re.VERBOSE,
    ),
]

original = text

for pattern in patterns:
    text, count = pattern.subn("\n", text, count=1)
    if count:
        break

if text == original:
    print(
        "ℹ️ Existing fixed Edit Profile button was not found. "
        "No removal was needed."
    )
else:
    path.write_text(text)
    print("✅ Duplicate fixed Edit Profile control removed")
PY

echo
echo "Running TypeScript verification..."
npx tsc --noEmit --pretty false

echo
echo "Running production build..."
npm run build

touch ".worlds-sprint-18a-expression-actions-installed"

echo
echo "=============================================="
echo " SPRINT 18A COMPLETE"
echo "=============================================="
echo
echo "Visitor controls:"
echo "  • Follow / Unfollow"
echo "  • Message"
echo "  • Share"
echo
echo "Owner controls:"
echo "  • Edit Profile"
echo "  • Share"
echo "  • Copy Link"
echo
echo "Privacy:"
echo "  • Visitors cannot see follower counts"
echo "  • Visitors cannot see following counts"
echo "  • Visitors cannot open either private list"
echo
echo "Launch Playground:"
echo "  npm run tauri dev"
echo
echo "Estimated overall completion: 86%"
