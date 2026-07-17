import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

export default function Stardust(props: ExperienceProps) {
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
