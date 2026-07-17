import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

export default function Graphite(props: ExperienceProps) {
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
