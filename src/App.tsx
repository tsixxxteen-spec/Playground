import { CSSProperties, useEffect, useMemo, useState } from "react";
import "./App.css";

type Appearance = "light" | "dark" | "system";
type ActiveView =
  | "Slide"
  | "Explore"
  | "Activity"
  | "Messages"
  | "Your Playground"
  | "Settings";

type BasePost = {
  id: number;
  creator: string;
  handle: string;
  medium: string;
  title: string;
  caption?: string;
  accent: string;
  pushedBy?: string;
};

type ImagePost = BasePost & {
  type: "image";
  image: string;
  ratio: "portrait" | "landscape" | "square" | "tall";
};

type DiptychPost = BasePost & {
  type: "diptych";
  images: [string, string];
};

type QuotePost = BasePost & {
  type: "quote";
  quote: string;
};

type AudioPost = BasePost & {
  type: "audio";
  image: string;
  song: string;
  artist: string;
};

type Post = ImagePost | DiptychPost | QuotePost | AudioPost;

const posts: Post[] = [
  {
    id: 1,
    type: "image",
    creator: "Mara Solis",
    handle: "@mara.solis",
    medium: "Photography",
    title: "Wild color study",
    caption: "Flowers found on a walk with nowhere to be.",
    image:
      "https://images.unsplash.com/photo-1497250681960-ef046c08a56e?auto=format&fit=crop&w=1400&q=90",
    ratio: "portrait",
    accent: "#ff673d",
  },
  {
    id: 2,
    type: "diptych",
    creator: "Kael Doran",
    handle: "@kaeldoran",
    medium: "Design",
    title: "Front / back",
    caption: "Early apparel tests for a short film that never got made.",
    images: [
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1000&q=90",
      "https://images.unsplash.com/photo-1503341504253-dff4815485f1?auto=format&fit=crop&w=1000&q=90",
    ],
    accent: "#ff4f43",
    pushedBy: "Nia Vale",
  },
  {
    id: 3,
    type: "image",
    creator: "Iris Bloom",
    handle: "@irisbloom",
    medium: "Still life",
    title: "First coffee",
    image:
      "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1300&q=90",
    ratio: "square",
    accent: "#d69550",
  },
  {
    id: 4,
    type: "quote",
    creator: "Nia Vale",
    handle: "@niavale",
    medium: "Writing",
    title: "A note to keep",
    quote:
      "Make the page you needed to discover while you were becoming yourself.",
    accent: "#194dff",
  },
  {
    id: 5,
    type: "image",
    creator: "Eli Grey",
    handle: "@eligrey",
    medium: "Art",
    title: "Yellow room",
    caption: "Oil, fabric, and a memory that changed every time I painted it.",
    image:
      "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&w=1300&q=90",
    ratio: "portrait",
    accent: "#d3a92e",
    pushedBy: "Mara Solis",
  },
  {
    id: 6,
    type: "image",
    creator: "Noah Saint",
    handle: "@noahsaint",
    medium: "Film",
    title: "Into the weather",
    image:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1500&q=90",
    ratio: "landscape",
    accent: "#8dc4ff",
  },
  {
    id: 7,
    type: "audio",
    creator: "Iris Bloom",
    handle: "@irisbloom",
    medium: "Music",
    title: "Blue Hour",
    caption: "A voice memo recorded at 2:17 AM.",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1300&q=90",
    song: "Blue Hour",
    artist: "Iris Bloom",
    accent: "#76e2c0",
  },
  {
    id: 8,
    type: "image",
    creator: "Mara Solis",
    handle: "@mara.solis",
    medium: "Photography",
    title: "Leaving Nevada",
    caption: "The road kept going after the conversation ended.",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1300&q=90",
    ratio: "tall",
    accent: "#ff765d",
  },
  {
    id: 9,
    type: "image",
    creator: "Eli Grey",
    handle: "@eligrey",
    medium: "Fashion",
    title: "Soft machinery",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1300&q=90",
    ratio: "portrait",
    accent: "#ff5f9f",
    pushedBy: "Kael Doran",
  },
  {
    id: 10,
    type: "image",
    creator: "Noah Saint",
    handle: "@noahsaint",
    medium: "Architecture",
    title: "Room with afternoon light",
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1400&q=90",
    ratio: "landscape",
    accent: "#c6b28d",
  },
];

function Icon({
  name,
}: {
  name:
    | "slide"
    | "explore"
    | "activity"
    | "messages"
    | "profile"
    | "settings"
    | "create"
    | "search"
    | "sun"
    | "moon"
    | "system"
    | "push"
    | "more"
    | "play";
}) {
  const paths = {
    slide: <path d="M5 7h14M5 12h10M5 17h6" />,
    explore: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="m14.8 9.2-1.7 4.1-4.1 1.7 1.7-4.1 4.1-1.7Z" />
      </>
    ),
    activity: <path d="M12 3 9.5 10H15l-3 11 8-13h-5l2-5h-5Z" />,
    messages: <path d="M5 6h14v9H9l-4 4V6Z" />,
    profile: (
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
    create: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="5.5" />
        <path d="m14.7 14.7 4.6 4.6" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </>
    ),
    moon: <path d="M19 15.5A7.5 7.5 0 0 1 8.5 5 7.5 7.5 0 1 0 19 15.5Z" />,
    system: (
      <>
        <rect x="4" y="5" width="16" height="12" rx="2" />
        <path d="M9 21h6M12 17v4" />
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
    play: <path d="m9 7 8 5-8 5V7Z" />,
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

function resolveAppearance(appearance: Appearance) {
  if (appearance !== "system") {
    return appearance;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function Sidebar({
  active,
  onNavigate,
}: {
  active: ActiveView;
  onNavigate: (view: ActiveView) => void;
}) {
  const navigation: Array<{
    label: ActiveView;
    icon:
      | "slide"
      | "explore"
      | "activity"
      | "messages"
      | "profile"
      | "settings";
  }> = [
    { label: "Slide", icon: "slide" },
    { label: "Explore", icon: "explore" },
    { label: "Activity", icon: "activity" },
    { label: "Messages", icon: "messages" },
    { label: "Your Playground", icon: "profile" },
    { label: "Settings", icon: "settings" },
  ];

  return (
    <aside className="sidebar">
      <button className="brand" type="button" onClick={() => onNavigate("Slide")}>
        <BrandMark />
        <span>playground</span>
      </button>

      <nav className="side-navigation" aria-label="Primary navigation">
        {navigation.map((item) => (
          <button
            type="button"
            key={item.label}
            className={active === item.label ? "side-item--active" : ""}
            onClick={() => onNavigate(item.label)}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <button className="create-button" type="button">
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

function AppearanceControl({
  appearance,
  onChange,
}: {
  appearance: Appearance;
  onChange: (appearance: Appearance) => void;
}) {
  const options: Array<{
    value: Appearance;
    icon: "sun" | "moon" | "system";
    label: string;
  }> = [
    { value: "light", icon: "sun", label: "Light" },
    { value: "dark", icon: "moon", label: "Dark" },
    { value: "system", icon: "system", label: "System" },
  ];

  return (
    <div className="appearance-control" aria-label="Appearance">
      {options.map((option) => (
        <button
          type="button"
          key={option.value}
          className={appearance === option.value ? "appearance--active" : ""}
          onClick={() => onChange(option.value)}
          aria-label={option.label}
          title={option.label}
        >
          <Icon name={option.icon} />
        </button>
      ))}
    </div>
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

  const style = {
    "--creator-accent": post.accent,
  } as CSSProperties;

  return (
    <article
      className={`masonry-post masonry-post--${post.type} masonry-post--tile-${post.id} ${
        animating ? "masonry-post--pushing" : ""
      }`}
      style={style}
      tabIndex={0}
    >
      {post.pushedBy && (
        <div className="push-context">
          <Icon name="push" />
          <span>Pushed by {post.pushedBy}</span>
        </div>
      )}

      <header className="post-header">
        <button className="post-identity" type="button">
          <span className="creator-dot" />

          <span>
            <strong>{post.creator}</strong>
            <small>
              {post.handle} · {post.medium}
            </small>
          </span>
        </button>

        <button className="more-button" type="button" aria-label="More options">
          <Icon name="more" />
        </button>
      </header>

      {post.type === "image" && (
        <button
          className={`image-post image-post--${post.ratio}`}
          type="button"
        >
          <img src={post.image} alt="" draggable={false} />
        </button>
      )}

      {post.type === "diptych" && (
        <div className="diptych-post">
          {post.images.map((image, index) => (
            <button type="button" key={image}>
              <img src={image} alt="" draggable={false} />
              <span>{index + 1} / 2</span>
            </button>
          ))}
        </div>
      )}

      {post.type === "quote" && (
        <button className="quote-post" type="button">
          <span>PLAYGROUND NOTE</span>
          <blockquote>{post.quote}</blockquote>
          <small>{post.creator}</small>
        </button>
      )}

      {post.type === "audio" && (
        <div className="audio-post">
          <img src={post.image} alt="" draggable={false} />

          <div className="audio-overlay">
            <button className="play-button" type="button">
              <Icon name="play" />
            </button>

            <div>
              <span>Now playing</span>
              <strong>{post.song}</strong>
              <small>{post.artist}</small>
            </div>
          </div>
        </div>
      )}

      <div className="post-caption">
        <span>{post.medium}</span>
        <h2>{post.title}</h2>
        {post.caption && <p>{post.caption}</p>}
      </div>

      <footer className="post-actions">
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

function App() {
  const [activeView, setActiveView] = useState<ActiveView>("Slide");
  const [appearance, setAppearance] = useState<Appearance>(() => {
    const stored = window.localStorage.getItem("playground-appearance");

    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }

    return "system";
  });

  const [resolvedAppearance, setResolvedAppearance] = useState(() =>
    resolveAppearance(appearance),
  );

  useEffect(() => {
    window.localStorage.setItem("playground-appearance", appearance);

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const updateAppearance = () => {
      setResolvedAppearance(resolveAppearance(appearance));
    };

    updateAppearance();
    media.addEventListener("change", updateAppearance);

    return () => media.removeEventListener("change", updateAppearance);
  }, [appearance]);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedAppearance;
  }, [resolvedAppearance]);

  const visiblePosts = useMemo(() => posts, []);

  return (
    <main className="app-shell">
      <Sidebar active={activeView} onNavigate={setActiveView} />

      <section className="content-shell">
        <header className="topbar">
          <div className="view-title">
            <span>Your creative current</span>
            <h1>{activeView}</h1>
          </div>

          <div className="topbar-actions">
            <label className="search-field">
              <Icon name="search" />
              <input type="search" placeholder="Search Playground" />
            </label>

            <AppearanceControl
              appearance={appearance}
              onChange={setAppearance}
            />

            <button className="profile-button" type="button">
              TP
            </button>
          </div>
        </header>

        {activeView === "Slide" ? (
          <>
            <section className="slide-intro">
              <p>
                Work from people you follow, mixed with creativity they believed
                deserved a Push.
              </p>

              <span>No rankings. No visible popularity.</span>
            </section>

            <section className="masonry-wall" aria-label="Slide">
              {visiblePosts.map((post) => (
                <PostCard post={post} key={post.id} />
              ))}
            </section>
          </>
        ) : (
          <section className="placeholder-view">
            <BrandMark />
            <span>{activeView}</span>
            <p>This section will be built in a later sprint.</p>
          </section>
        )}
      </section>
    </main>
  );
}

export default App;
