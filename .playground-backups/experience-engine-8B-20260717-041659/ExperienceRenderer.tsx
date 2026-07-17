import {
  Avatar,
  Music,
  Posts,
  Stats,
} from "./shared";
import type {
  ExperienceProfile,
  ExperienceProps,
} from "./shared";
import "./ExperienceRenderer.css";

export type { ExperienceProfile };

function Ivory(props: ExperienceProps) {
  return (
    <main className="xp xp--ivory">
      <nav className="xp-ivory__nav">
        <span>PLAYGROUND / INDEX</span>
        <button onClick={props.onEdit}>EDIT</button>
      </nav>

      <header className="xp-ivory__hero">
        <Avatar profile={props.profile} />

        <div>
          <p>{props.profile.username}</p>
          <h1>{props.profile.displayName}</h1>

          {props.profile.bio && (
            <blockquote>{props.profile.bio}</blockquote>
          )}

          <Music
            soundtrack={props.soundtrack}
            visible={props.showMusicPlayer}
            hiddenAutoplay={props.hiddenAutoplay}
            variant="editorial"
            label="Now playing"
          />
        </div>

        <Stats {...props} />
      </header>

      <Posts count={props.postCount} label="Selected work">
        {props.posts}
      </Posts>
    </main>
  );
}

function ContactSheet(props: ExperienceProps) {
  return (
    <main className="xp xp--contact">
      <aside className="xp-contact__rail">
        <button
          className="xp-contact__menu"
          onClick={props.onEdit}
        >
          ☰
        </button>

        <Avatar profile={props.profile} />

        <div>
          <h1>{props.profile.displayName}</h1>
          <p>{props.profile.username}</p>
        </div>

        {props.profile.bio && (
          <p className="xp-contact__bio">
            {props.profile.bio}
          </p>
        )}

        <Stats {...props} />

        <Music
          soundtrack={props.soundtrack}
          visible={props.showMusicPlayer}
          hiddenAutoplay={props.hiddenAutoplay}
          variant="utility"
        />

        <span className="xp-contact__vertical">
          CONTACT SHEET
        </span>
      </aside>

      <Posts count={props.postCount} label="Archive">
        {props.posts}
      </Posts>
    </main>
  );
}

function Graphite(props: ExperienceProps) {
  return (
    <main className="xp xp--graphite">
      <nav className="xp-graphite__nav">
        <strong>GRAPHITE</strong>
        <span>PORTFOLIO</span>

        <button onClick={props.onEdit}>
          EDIT PROFILE
        </button>
      </nav>

      <header className="xp-graphite__hero">
        <div className="xp-graphite__copy">
          <p>{props.profile.username}</p>
          <h1>{props.profile.displayName}</h1>

          {props.profile.bio && (
            <h2>{props.profile.bio}</h2>
          )}

          <Stats {...props} />
        </div>

        <Avatar profile={props.profile} />

        <Music
          soundtrack={props.soundtrack}
          visible={props.showMusicPlayer}
          hiddenAutoplay={props.hiddenAutoplay}
          variant="graphite"
          label="Featured audio"
        />
      </header>

      <Posts count={props.postCount} label="Projects">
        {props.posts}
      </Posts>
    </main>
  );
}

function EightBit(props: ExperienceProps) {
  return (
    <main className="xp xp--eight-bit">
      <header className="xp-eight__top">
        <span>PLAYGROUND_OS</span>

        <button onClick={props.onEdit}>
          [ SETTINGS ]
        </button>
      </header>

      <div className="xp-eight__desktop">
        <aside className="xp-eight__window xp-eight__profile">
          <div className="xp-eight__bar">
            PROFILE.EXE _ □ ×
          </div>

          <Avatar profile={props.profile} />
          <h1>{props.profile.displayName}</h1>
          <p>{props.profile.username}</p>

          {props.profile.bio && (
            <blockquote>{props.profile.bio}</blockquote>
          )}

          <Stats {...props} />
        </aside>

        <section className="xp-eight__window xp-eight__feed">
          <div className="xp-eight__bar">
            MY_FILES / POSTS
          </div>

          <Posts count={props.postCount} label="Gallery">
            {props.posts}
          </Posts>
        </section>
      </div>

      <Music
        soundtrack={props.soundtrack}
        visible={props.showMusicPlayer}
        hiddenAutoplay={props.hiddenAutoplay}
        variant="pixel"
        label="MUSIC_PLAYER.EXE"
      />
    </main>
  );
}

function Stardust(props: ExperienceProps) {
  return (
    <main className="xp xp--stardust">
      <header className="xp-star__banner">
        <p>✦ SEE THE STARS WITH ME, AGAIN ✦</p>

        <nav>
          <span>HOME</span>
          <span>ARCHIVE</span>

          <button onClick={props.onEdit}>
            CUSTOMIZE
          </button>
        </nav>
      </header>

      <div className="xp-star__layout">
        <aside className="xp-star__side">
          <Avatar profile={props.profile} />

          <h1>{props.profile.displayName}</h1>
          <p>{props.profile.username}</p>

          {props.profile.bio && (
            <blockquote>{props.profile.bio}</blockquote>
          )}

          <Stats {...props} />

          <Music
            soundtrack={props.soundtrack}
            visible={props.showMusicPlayer}
            hiddenAutoplay={props.hiddenAutoplay}
            variant="stardust"
            label="♫ cassette deck"
          />

          <div className="xp-star__widget">
            <span>STATUS</span>
            <strong>creating a new world...</strong>
          </div>
        </aside>

        <Posts
          count={props.postCount}
          label="Latest transmissions"
        >
          {props.posts}
        </Posts>
      </div>
    </main>
  );
}

function PressKit(props: ExperienceProps) {
  return (
    <main className="xp xp--press">
      <nav className="xp-press__nav">
        <strong>{props.profile.displayName}</strong>

        <div>
          <span>ABOUT</span>
          <span>WORK</span>
          <span>MUSIC</span>

          <button onClick={props.onEdit}>
            EDIT
          </button>
        </div>
      </nav>

      <header className="xp-press__hero">
        <Avatar profile={props.profile} />

        <div className="xp-press__copy">
          <p>{props.profile.username}</p>
          <h1>{props.profile.displayName}</h1>

          {props.profile.bio && (
            <h2>{props.profile.bio}</h2>
          )}

          <Music
            soundtrack={props.soundtrack}
            visible={props.showMusicPlayer}
            hiddenAutoplay={props.hiddenAutoplay}
            variant="release"
            label="Featured release"
          />

          <Stats {...props} />
        </div>
      </header>

      <Posts count={props.postCount} label="Selected work">
        {props.posts}
      </Posts>
    </main>
  );
}

const experienceMap = {
  "ivory-index": Ivory,
  "contact-sheet": ContactSheet,
  graphite: Graphite,
  "eight-bit": EightBit,
  stardust: Stardust,
  "press-kit": PressKit,
} as const;

export default function ExperienceRenderer(
  props: ExperienceProps,
) {
  const Experience =
    experienceMap[
      props.themeId as keyof typeof experienceMap
    ] ?? Ivory;

  return (
    <section
      className={
        `profile-experience-root ${props.className ?? ""}`.trim()
      }
      style={props.style}
      data-experience={props.themeId}
      aria-label={`${props.profile.displayName} profile`}
    >
      <button
        className="profile-experience-owner-edit"
        type="button"
        onClick={props.onEdit}
        aria-label="Edit profile"
      >
        <span aria-hidden="true">✦</span>
        Edit profile
      </button>

      <Experience {...props} />
    </section>
  );
}
