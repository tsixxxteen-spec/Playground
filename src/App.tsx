import { PointerEvent, WheelEvent, useEffect, useRef, useState } from "react";
import "./App.css";

type CanvasPost = {
  id: number;
  creator: string;
  handle: string;
  medium: string;
  title: string;
  image: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  type: "image" | "quote" | "audio";
  quote?: string;
  song?: string;
  artist?: string;
};

const posts: CanvasPost[] = [
  {
    id: 1,
    creator: "Mara Solis",
    handle: "@mara.solis",
    medium: "Photography",
    title: "A study in distance",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1600&q=90",
    x: 180,
    y: 130,
    width: 520,
    height: 690,
    rotation: -1.2,
    type: "image",
  },
  {
    id: 2,
    creator: "Kael Doran",
    handle: "@kaeldoran",
    medium: "Film",
    title: "After the rain",
    image:
      "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=1600&q=90",
    x: 770,
    y: 80,
    width: 620,
    height: 410,
    rotation: 0.8,
    type: "image",
  },
  {
    id: 3,
    creator: "Nia Vale",
    handle: "@niavale",
    medium: "Writing",
    title: "Untitled note",
    image: "",
    x: 860,
    y: 550,
    width: 410,
    height: 300,
    rotation: -0.7,
    type: "quote",
    quote:
      "Make something honest enough that the right person recognizes themselves inside it.",
  },
  {
    id: 4,
    creator: "Eli Grey",
    handle: "@eligrey",
    medium: "Fashion",
    title: "Soft machinery",
    image:
      "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1600&q=90",
    x: 1410,
    y: 240,
    width: 480,
    height: 640,
    rotation: 1.4,
    type: "image",
  },
  {
    id: 5,
    creator: "Iris Bloom",
    handle: "@irisbloom",
    medium: "Music",
    title: "Blue hour",
    image:
      "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=90",
    x: 310,
    y: 930,
    width: 470,
    height: 360,
    rotation: 1,
    type: "audio",
    song: "Blue Hour",
    artist: "Iris Bloom",
  },
  {
    id: 6,
    creator: "Noah Saint",
    handle: "@noahsaint",
    medium: "Architecture",
    title: "Concrete silence",
    image:
      "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=1600&q=90",
    x: 930,
    y: 970,
    width: 650,
    height: 470,
    rotation: -1.1,
    type: "image",
  },
];

function LogoMark() {
  return (
    <span className="logo-mark" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

function Icon({
  name,
}: {
  name:
    | "slide"
    | "search"
    | "create"
    | "message"
    | "you"
    | "push"
    | "play"
    | "minus"
    | "plus"
    | "reset";
}) {
  const paths = {
    slide: <path d="M4 7h16M4 12h11M4 17h7" />,
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="5.8" />
        <path d="m15 15 4.4 4.4" />
      </>
    ),
    create: <path d="M12 4v16M4 12h16" />,
    message: <path d="M5 6h14v9H9l-4 4V6Z" />,
    you: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M6 19c.5-3.3 2.5-5 6-5s5.5 1.7 6 5" />
      </>
    ),
    push: (
      <>
        <path d="M5 17 18 4" />
        <path d="M10 4h8v8" />
      </>
    ),
    play: <path d="m9 7 8 5-8 5V7Z" />,
    minus: <path d="M6 12h12" />,
    plus: <path d="M12 6v12M6 12h12" />,
    reset: (
      <>
        <path d="M5 9a7 7 0 1 1 1 7" />
        <path d="M5 4v5h5" />
      </>
    ),
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

function LaunchScreen({ leaving }: { leaving: boolean }) {
  return (
    <div className={`launch ${leaving ? "launch--leaving" : ""}`}>
      <div className="launch-aura" />
      <LogoMark />
      <span>playground</span>
    </div>
  );
}

function ContentCard({ post }: { post: CanvasPost }) {
  const [pushed, setPushed] = useState(false);
  const [animating, setAnimating] = useState(false);

  const push = () => {
    setPushed((value) => !value);
    setAnimating(false);

    requestAnimationFrame(() => {
      setAnimating(true);
      window.setTimeout(() => setAnimating(false), 650);
    });
  };

  return (
    <article
      className={`canvas-card canvas-card--${post.type} ${
        animating ? "canvas-card--pushing" : ""
      }`}
      style={{
        left: post.x,
        top: post.y,
        width: post.width,
        height: post.height,
        transform: `rotate(${post.rotation}deg)`,
      }}
    >
      <header className="card-header">
        <button className="creator" type="button">
          <span className="creator-avatar">
            {post.creator
              .split(" ")
              .map((part) => part[0])
              .join("")}
          </span>

          <span className="creator-copy">
            <strong>{post.creator}</strong>
            <small>
              {post.handle} · {post.medium}
            </small>
          </span>
        </button>

        <button className="follow" type="button">
          Follow
        </button>
      </header>

      {post.type === "image" && (
        <button className="image-surface" type="button">
          <img src={post.image} alt="" draggable={false} />
          <span className="image-shade" />
        </button>
      )}

      {post.type === "quote" && (
        <button className="quote-surface" type="button">
          <blockquote>{post.quote}</blockquote>
          <span>— {post.creator}</span>
        </button>
      )}

      {post.type === "audio" && (
        <div className="audio-surface">
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

            <div className="equalizer" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </div>
          </div>
        </div>
      )}

      <footer className="card-footer">
        <div>
          <span className="post-medium">{post.medium}</span>
          <h2>{post.title}</h2>
        </div>

        <button
          className={`push ${pushed ? "push--active" : ""}`}
          type="button"
          aria-label={pushed ? "Remove Push" : "Give this work a Push"}
          aria-pressed={pushed}
          onClick={push}
        >
          <Icon name="push" />
          <span>{pushed ? "Pushed" : "Push"}</span>
        </button>
      </footer>
    </article>
  );
}

function Dock() {
  const [active, setActive] = useState("Slide");

  const items = [
    ["Slide", "slide"],
    ["Search", "search"],
    ["Create", "create"],
    ["Messages", "message"],
    ["You", "you"],
  ] as const;

  return (
    <nav className="dock" aria-label="Primary navigation">
      {items.map(([label, icon]) => (
        <button
          key={label}
          type="button"
          className={`${active === label ? "dock-item--active" : ""} ${
            label === "Create" ? "dock-item--create" : ""
          }`}
          onClick={() => setActive(label)}
        >
          <span>
            <Icon name={icon} />
          </span>
          <small>{label}</small>
        </button>
      ))}
    </nav>
  );
}

function App() {
  const [launchVisible, setLaunchVisible] = useState(true);
  const [launchLeaving, setLaunchLeaving] = useState(false);
  const [position, setPosition] = useState({ x: -40, y: -35 });
  const [scale, setScale] = useState(0.82);
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef({
    pointerX: 0,
    pointerY: 0,
    originX: 0,
    originY: 0,
  });

  useEffect(() => {
    const leavingTimer = window.setTimeout(() => setLaunchLeaving(true), 650);
    const removeTimer = window.setTimeout(() => setLaunchVisible(false), 1050);

    return () => {
      window.clearTimeout(leavingTimer);
      window.clearTimeout(removeTimer);
    };
  }, []);

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("button")) {
      return;
    }

    setDragging(true);
    dragRef.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      originX: position.x,
      originY: position.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const drag = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragging) {
      return;
    }

    setPosition({
      x: dragRef.current.originX + event.clientX - dragRef.current.pointerX,
      y: dragRef.current.originY + event.clientY - dragRef.current.pointerY,
    });
  };

  const stopDrag = () => {
    setDragging(false);
  };

  const zoom = (event: WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const nextScale = Math.min(
      1.35,
      Math.max(0.48, scale - event.deltaY * 0.0008),
    );

    setScale(nextScale);
  };

  const resetCanvas = () => {
    setPosition({ x: -40, y: -35 });
    setScale(0.82);
  };

  return (
    <>
      {launchVisible && <LaunchScreen leaving={launchLeaving} />}

      <main className="app">
        <header className="topbar">
          <button className="brand" type="button">
            <LogoMark />
            <span>playground</span>
          </button>

          <div className="view-switcher">
            <button className="view-switcher--active" type="button">
              Canvas
            </button>
            <button type="button">Story</button>
          </div>

          <button className="profile-button" type="button">
            TP
          </button>
        </header>

        <section className="canvas-label">
          <span>Your creative current</span>
          <h1>Slide</h1>
          <p>Drag to move. Scroll to zoom. Enter anything that pulls you closer.</p>
        </section>

        <div
          className={`viewport ${dragging ? "viewport--dragging" : ""}`}
          onPointerDown={startDrag}
          onPointerMove={drag}
          onPointerUp={stopDrag}
          onPointerCancel={stopDrag}
          onWheel={zoom}
        >
          <div className="grid-plane" />

          <div
            className="world"
            style={{
              transform: `translate3d(${position.x}px, ${position.y}px, 0) scale(${scale})`,
            }}
          >
            {posts.map((post) => (
              <ContentCard key={post.id} post={post} />
            ))}
          </div>
        </div>

        <aside className="canvas-controls">
          <button
            type="button"
            onClick={() => setScale((value) => Math.max(0.48, value - 0.1))}
            aria-label="Zoom out"
          >
            <Icon name="minus" />
          </button>

          <span>{Math.round(scale * 100)}%</span>

          <button
            type="button"
            onClick={() => setScale((value) => Math.min(1.35, value + 0.1))}
            aria-label="Zoom in"
          >
            <Icon name="plus" />
          </button>

          <button type="button" onClick={resetCanvas} aria-label="Reset canvas">
            <Icon name="reset" />
          </button>
        </aside>

        <div className="canvas-hint">
          <span />
          <p>Creativity moves through people, not numbers.</p>
        </div>

        <Dock />
      </main>
    </>
  );
}

export default App;
