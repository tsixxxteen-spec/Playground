import { Avatar, Music, Posts, Stats } from "../shared";
import type { ExperienceProps } from "../shared";

export default function ContactSheet(props: ExperienceProps) {
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
