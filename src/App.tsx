import { useEffect, useState } from "react";
import "./App.css";

type SlideItem = {
  id: number;
  creator: string;
  handle: string;
  medium: string;
  title: string;
  caption: string;
  image: string;
  format: "wide" | "portrait" | "square";
};

const slideItems: SlideItem[] = [
  {
    id: 1,
    creator: "Maya Vale",
    handle: "@mayavale",
    medium: "Photography",
    title: "Quiet architecture",
    caption:
      "A study of morning light, open structures, and the spaces people leave behind.",
    image:
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1800&q=90",
    format: "wide",
  },
  {
    id: 2,
    creator: "Noah Saint",
    handle: "@noahsaint",
    medium: "Film",
    title: "The hours between",
    caption:
      "Frames from an unfinished short film about memory and disappearing places.",
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1400&q=90",
    format: "portrait",
  },
  {
    id: 3,
    creator: "Iris Bloom",
    handle: "@irisbloom",
    medium: "Visual art",
    title: "Electric flora",
    caption:
      "An evolving digital garden built from scans, light leaks, and hand-painted textures.",
    image:
      "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=1400&q=90",
    format: "square",
  },
  {
    id: 4,
    creator: "Eli Grey",
    handle: "@eligrey",
    medium: "Fashion",
    title: "Soft machinery",
    caption:
      "A tactile editorial exploring clothing as architecture for the body.",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1800&q=90",
    format: "wide",
  },
];

function Mark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

function LaunchScreen({ leaving }: { leaving: boolean }) {
  return (
    <div className={`launch-screen ${leaving ? "launch-screen--leaving" : ""}`}>
      <div className="launch-glow" />
      <Mark />
      <div className="launch-wordmark">playground</div>
    </div>
  );
}

function Icon({
  name,
}: {
  name: "slide" | "search" | "create" | "messages" | "profile" | "push";
}) {
  const icons = {
    slide: (
      <>
        <path d="M4 7.5h16M4 12h11M4 16.5h7" />
      </>
    ),
    search: (
      <>
        <circle cx="10.7" cy="10.7" r="5.8" />
        <path d="m15.1 15.1 4.2 4.2" />
      </>
    ),
    create: (
      <>
        <path d="M12 4v16M4 12h16" />
      </>
    ),
    messages: (
      <>
        <path d="M5 5.8h14v9.5H9.8L5 19v-13.2Z" />
      </>
    ),
    profile: (
      <>
        <circle cx="12" cy="8.2" r="3.2" />
        <path d="M5.8 19c.6-3.4 2.7-5.2 6.2-5.2s5.6 1.8 6.2 5.2" />
      </>
    ),
    push: (
      <>
        <path d="M5 16.5 18.5 3" />
        <path d="M10 3h8.5v8.5" />
      </>
    ),
  };

  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {icons[name]}
    </svg>
  );
}

function TopBar() {
  return (
    <header className="top-bar">
      <button className="wordmark-button" type="button" aria-label="Playground">
        <Mark />
        <span>playground</span>
      </button>

      <div className="top-actions">
        <button className="quiet-button" type="button">
          Following
        </button>

        <button className="avatar-button" type="button" aria-label="Your Playground">
          TP
        </button>
      </div>
    </header>
  );
}

function SlideCard({ item }: { item: SlideItem }) {
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
    <article
      className={`slide-card slide-card--${item.format} ${
        animating ? "slide-card--pushed" : ""
      }`}
    >
      <div className="creator-row">
        <button className="creator-identity" type="button">
          <span className="creator-avatar">
            {item.creator
              .split(" ")
              .map((word) => word[0])
              .join("")}
          </span>

          <span>
            <strong>{item.creator}</strong>
            <small>
              {item.handle} · {item.medium}
            </small>
          </span>
        </button>

        <button className="follow-button" type="button">
          Follow
        </button>
      </div>

      <button className="media-button" type="button" aria-label={`Open ${item.title}`}>
        <img src={item.image} alt="" />
        <span className="media-sheen" />
      </button>

      <div className="card-footer">
        <div className="card-copy">
          <h2>{item.title}</h2>
          <p>{item.caption}</p>
        </div>

        <div className="card-actions">
          <button
            className={`push-button ${pushed ? "push-button--active" : ""}`}
            type="button"
            onClick={handlePush}
            aria-pressed={pushed}
            aria-label={pushed ? "Remove Push" : "Give this work a Push"}
          >
            <Icon name="push" />
            <span>{pushed ? "Pushed" : "Push"}</span>
          </button>

          <button className="enter-button" type="button">
            Enter Playground
          </button>
        </div>
      </div>
    </article>
  );
}

function FloatingDock() {
  const [active, setActive] = useState("Slide");

  const items = [
    { label: "Slide", icon: "slide" as const },
    { label: "Search", icon: "search" as const },
    { label: "Create", icon: "create" as const, primary: true },
    { label: "Messages", icon: "messages" as const },
    { label: "You", icon: "profile" as const },
  ];

  return (
    <nav className="floating-dock" aria-label="Primary navigation">
      {items.map((item) => (
        <button
          className={`dock-item ${active === item.label ? "dock-item--active" : ""} ${
            item.primary ? "dock-item--primary" : ""
          }`}
          type="button"
          key={item.label}
          onClick={() => setActive(item.label)}
        >
          <span className="dock-icon-wrap">
            <Icon name={item.icon} />
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function App() {
  const [launchVisible, setLaunchVisible] = useState(true);
  const [launchLeaving, setLaunchLeaving] = useState(false);

  useEffect(() => {
    const leaveTimer = window.setTimeout(() => setLaunchLeaving(true), 760);
    const removeTimer = window.setTimeout(() => setLaunchVisible(false), 1180);

    return () => {
      window.clearTimeout(leaveTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  return (
    <>
      {launchVisible && <LaunchScreen leaving={launchLeaving} />}

      <main className="app-shell">
        <div className="ambient ambient--one" />
        <div className="ambient ambient--two" />

        <TopBar />

        <section className="slide-heading">
          <div>
            <span className="eyebrow">Your creative current</span>
            <h1>Slide</h1>
          </div>

          <p>
            Work from people you follow, plus creativity carried forward through
            genuine Pushes.
          </p>
        </section>

        <section className="slide-stream" aria-label="Slide content">
          {slideItems.map((item) => (
            <SlideCard item={item} key={item.id} />
          ))}
        </section>

        <div className="end-message">
          <Mark />
          <p>Keep creating. The right people will feel it.</p>
        </div>

        <FloatingDock />
      </main>
    </>
  );
}

export default App;
