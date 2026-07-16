import { useEffect, useState } from "react";
import "./App.css";

type Post = {
  id: number;
  creator: string;
  handle: string;
  medium: string;
  title: string;
  caption: string;
  image: string;
  pushedBy?: string;
};

const posts: Post[] = [
  {
    id: 1,
    creator: "Mara Solis",
    handle: "@mara.solis",
    medium: "Photography",
    title: "Toward the quiet",
    caption:
      "A study of distance, heat, and the landscapes that make us feel small.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1500&q=90",
  },
  {
    id: 2,
    creator: "Kael Doran",
    handle: "@kaeldoran",
    medium: "Film",
    title: "After the rain",
    caption:
      "An unfinished sequence about memory, waiting, and the places people leave behind.",
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1500&q=90",
    pushedBy: "Nia Vale",
  },
  {
    id: 3,
    creator: "Eli Grey",
    handle: "@eligrey",
    medium: "Fashion",
    title: "Soft machinery",
    caption:
      "Clothing treated as movement, shelter, and architecture for the body.",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1500&q=90",
  },
];

function Icon({
  name,
}: {
  name:
    | "slide"
    | "explore"
    | "messages"
    | "activity"
    | "you"
    | "settings"
    | "search"
    | "text"
    | "photo"
    | "quote"
    | "link"
    | "audio"
    | "video"
    | "push"
    | "more"
    | "create";
}) {
  const paths = {
    slide: <path d="M5 7h14M5 12h10M5 17h6" />,
    explore: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="m14.8 9.2-1.6 4-4 1.6 1.6-4 4-1.6Z" />
      </>
    ),
    messages: <path d="M5 6h14v9H9l-4 4V6Z" />,
    activity: <path d="M12 3 9.5 10H15l-3 11 8-13h-5l2-5h-5Z" />,
    you: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M6 19c.6-3.3 2.6-5 6-5s5.4 1.7 6 5" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m14.7 14.7 4.6 4.6" />
      </>
    ),
    text: <path d="M6 6h12M12 6v12M8 18h8" />,
    photo: (
      <>
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <circle cx="9" cy="10" r="1.5" />
        <path d="m6 17 4-4 3 3 2-2 3 3" />
      </>
    ),
    quote: <path d="M6 9h5v5H7v3H5v-5c0-2 1-3 1-3ZM14 9h5v5h-4v3h-2v-5c0-2 1-3 1-3Z" />,
    link: (
      <>
        <path d="m9 15 6-6" />
        <path d="M7.5 17.5h-1a4 4 0 0 1 0-8h3M16.5 6.5h1a4 4 0 0 1 0 8h-3" />
      </>
    ),
    audio: (
      <>
        <path d="M9 18V7l9-2v11" />
        <circle cx="6.5" cy="18" r="2.5" />
        <circle cx="15.5" cy="16" r="2.5" />
      </>
    ),
    video: (
      <>
        <rect x="4" y="6" width="12" height="12" rx="2" />
        <path d="m16 10 4-2v8l-4-2" />
      </>
    ),
    push: (
      <>
        <path d="M5 17 18 4" />
        <path d="M10 4h8v8" />
      </>
    ),
    more: (
      <>
        <circle cx="6" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
        <circle cx="18" cy="12" r="1" fill="currentColor" stroke="none" />
      </>
    ),
    create: <path d="M12 5v14M5 12h14" />,
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

function LaunchScreen({ leaving }: { leaving: boolean }) {
  return (
    <div className={`launch ${leaving ? "launch--leaving" : ""}`}>
      <div className="launch-light" />
      <BrandMark />
      <span>playground</span>
    </div>
  );
}

function Sidebar() {
  const [active, setActive] = useState("Slide");

  const navigation = [
    ["Slide", "slide"],
    ["Explore", "explore"],
    ["Activity", "activity"],
    ["Messages", "messages"],
    ["Your Playground", "you"],
    ["Settings", "settings"],
  ] as const;

  return (
    <aside className="sidebar">
      <button className="brand" type="button">
        <BrandMark />
        <span>playground</span>
      </button>

      <nav className="side-navigation" aria-label="Primary navigation">
        {navigation.map(([label, icon]) => (
          <button
            type="button"
            key={label}
            className={active === label ? "side-item--active" : ""}
            onClick={() => setActive(label)}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <button className="create-main" type="button">
        <Icon name="create" />
        <span>Create</span>
      </button>

      <button className="account-chip" type="button">
        <span className="account-avatar">TP</span>
        <span>
          <strong>Terry</strong>
          <small>Your Playground</small>
        </span>
      </button>
    </aside>
  );
}

function CreateTray() {
  const actions = [
    ["Text", "text"],
    ["Photo", "photo"],
    ["Quote", "quote"],
    ["Link", "link"],
    ["Audio", "audio"],
    ["Video", "video"],
  ] as const;

  return (
    <section className="create-tray" aria-label="Create">
      {actions.map(([label, icon]) => (
        <button type="button" key={label}>
          <span>
            <Icon name={icon} />
          </span>
          <small>{label}</small>
        </button>
      ))}
    </section>
  );
}

function PostCard({ post }: { post: Post }) {
  const [pushed, setPushed] = useState(false);
  const [animating, setAnimating] = useState(false);

  const handlePush = () => {
    setPushed((current) => !current);
    setAnimating(false);

    requestAnimationFrame(() => {
      setAnimating(true);
      window.setTimeout(() => setAnimating(false), 620);
    });
  };

  return (
    <article className={`post-card ${animating ? "post-card--pushing" : ""}`}>
      {post.pushedBy && (
        <div className="pushed-context">
          <Icon name="push" />
          <span>{post.pushedBy} gave this a Push</span>
        </div>
      )}

      <header className="post-header">
        <button className="post-creator" type="button">
          <span className="creator-avatar">
            {post.creator
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </span>

          <span>
            <strong>{post.creator}</strong>
            <small>
              {post.handle} · {post.medium}
            </small>
          </span>
        </button>

        <div className="post-header-actions">
          <button className="follow-button" type="button">
            Follow
          </button>

          <button className="more-button" type="button" aria-label="More options">
            <Icon name="more" />
          </button>
        </div>
      </header>

      <button className="post-media" type="button">
        <img src={post.image} alt="" draggable={false} />
        <span className="media-glaze" />
      </button>

      <div className="post-copy">
        <span>{post.medium}</span>
        <h2>{post.title}</h2>
        <p>{post.caption}</p>
      </div>

      <footer className="post-footer">
        <button
          className={`push-button ${pushed ? "push-button--active" : ""}`}
          type="button"
          onClick={handlePush}
          aria-pressed={pushed}
        >
          <Icon name="push" />
          <span>{pushed ? "Pushed" : "Push"}</span>
        </button>

        <button className="enter-button" type="button">
          Enter Playground
        </button>
      </footer>
    </article>
  );
}

function DiscoveryRail() {
  const suggestions = [
    ["Nia Vale", "Writing and visual essays"],
    ["Iris Bloom", "Music and digital art"],
    ["Noah Saint", "Architecture and film"],
  ];

  return (
    <aside className="discovery-rail">
      <label className="search-field">
        <Icon name="search" />
        <input type="search" placeholder="Search Playground" />
      </label>

      <section className="rail-panel">
        <div className="rail-heading">
          <span>Playgrounds to enter</span>
          <button type="button">Explore</button>
        </div>

        <div className="suggestions">
          {suggestions.map(([name, description]) => (
            <button className="suggestion" type="button" key={name}>
              <span className="suggestion-avatar">
                {name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </span>

              <span>
                <strong>{name}</strong>
                <small>{description}</small>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rail-statement">
        <BrandMark />
        <p>Creativity moves through people, not numbers.</p>
      </section>
    </aside>
  );
}

function App() {
  const [launchVisible, setLaunchVisible] = useState(true);
  const [launchLeaving, setLaunchLeaving] = useState(false);
  const [feed, setFeed] = useState<"Slide" | "Following">("Slide");

  useEffect(() => {
    const leavingTimer = window.setTimeout(() => setLaunchLeaving(true), 620);
    const removeTimer = window.setTimeout(() => setLaunchVisible(false), 1020);

    return () => {
      window.clearTimeout(leavingTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  return (
    <>
      {launchVisible && <LaunchScreen leaving={launchLeaving} />}

      <main className="app-shell">
        <Sidebar />

        <section className="main-column">
          <header className="feed-header">
            <div className="feed-tabs">
              <button
                type="button"
                className={feed === "Slide" ? "feed-tab--active" : ""}
                onClick={() => setFeed("Slide")}
              >
                Slide
              </button>

              <button
                type="button"
                className={feed === "Following" ? "feed-tab--active" : ""}
                onClick={() => setFeed("Following")}
              >
                Following
              </button>
            </div>
          </header>

          <CreateTray />

          <section className="feed">
            {posts.map((post) => (
              <PostCard post={post} key={post.id} />
            ))}
          </section>

          <div className="feed-end">
            <BrandMark />
            <span>Keep creating. The right people will feel it.</span>
          </div>
        </section>

        <DiscoveryRail />
      </main>
    </>
  );
}

export default App;
