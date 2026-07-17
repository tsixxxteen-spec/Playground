import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

export default function EightBit(props: ExperienceProps) {
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
