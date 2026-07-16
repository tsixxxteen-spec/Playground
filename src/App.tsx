import { CSSProperties, useEffect, useState, useRef } from "react";
import "./App.css";

type Theme = "light" | "dark" | "system";
type Weight = "standard" | "wide" | "tall" | "hero" | "panorama";

type Post = {
  id: number;
  image: string;
  username: string;
  caption: string;
  pushedBy?: string;
  weight: Weight;
  position?: string;
};

const posts: Post[] = [
  {
    id: 1,
    image: "/trial/01_basketball.jpg",
    username: "@afterhours",
    caption: "The city was our court before anyone called it art.",
    weight: "tall",
    position: "center",
  },
  {
    id: 2,
    image: "/trial/02_masked_driver.jpg",
    username: "@ownthestreets",
    caption: "Night shift.",
    pushedBy: "@archivekid",
    weight: "tall",
  },
  {
    id: 3,
    image: "/trial/03_car_window_portrait.jpg",
    username: "@bluewindow",
    caption: "Passing through without leaving.",
    weight: "wide",
  },
  {
    id: 4,
    image: "/trial/04_helmet_portrait.jpg",
    username: "@fieldstudy",
    caption: "Protection can become costume.",
    pushedBy: "@quietriot",
    weight: "tall",
  },
  {
    id: 5,
    image: "/trial/05_resist_still.jpg",
    username: "@movingimage",
    caption: "Rise and resist.",
    weight: "wide",
  },
  {
    id: 6,
    image: "/trial/06_sheet_mask.jpg",
    username: "@streetarchive",
    caption: "An image found between fear and performance.",
    weight: "tall",
  },
  {
    id: 7,
    image: "/trial/07_dimension_collage.jpg",
    username: "@dimension",
    caption: "Light studies.",
    pushedBy: "@softfocus",
    weight: "wide",
  },
  {
    id: 8,
    image: "/trial/08_pinned_butterfly.jpg",
    username: "@specimen",
    caption: "Beauty held too still.",
    weight: "wide",
  },
  {
    id: 9,
    image: "/trial/09_radio_by_water.jpg",
    username: "@freeradio",
    caption: "A signal beside the water.",
    weight: "hero",
  },
  {
    id: 10,
    image: "/trial/10_bloodied_hand.jpg",
    username: "@redfield",
    caption: "Evidence of something unfinished.",
    pushedBy: "@lastframe",
    weight: "panorama",
  },
  {
    id: 11,
    image: "/trial/11_crash_scene.jpg",
    username: "@stillmoving",
    caption: "The moment after impact.",
    weight: "wide",
  },
  {
    id: 12,
    image: "/trial/12_fashion_eye_diptych.jpg",
    username: "@contactsheet",
    caption: "Distance and detail.",
    weight: "hero",
  },
  {
    id: 13,
    image: "/trial/13_desert.jpg",
    username: "@openland",
    caption: "Nothing asking to be explained.",
    weight: "panorama",
  },
  {
    id: 14,
    image: "/trial/14_editorial_spread.jpg",
    username: "@marginnotes",
    caption: "The page remembers what the photograph leaves out.",
    pushedBy: "@papertrail",
    weight: "hero",
  },
  {
    id: 15,
    image: "/trial/15_train_portrait.jpg",
    username: "@southbound",
    caption: "She watched the landscape disappear.",
    weight: "tall",
  },
  {
    id: 16,
    image: "/trial/16_blue_hour_profile.jpg",
    username: "@bluehour",
    caption: "A face at the edge of evening.",
    weight: "wide",
  },
  {
    id: 17,
    image: "/trial/17_twilight_alley.jpg",
    username: "@walkhome",
    caption: "The long way back.",
    weight: "panorama",
  },
  {
    id: 18,
    image: "/trial/18_window_back_portrait.jpg",
    username: "@weatherinside",
    caption: "Waiting for the rain to decide.",
    pushedBy: "@morningslow",
    weight: "wide",
  },
  {
    id: 19,
    image: "/trial/19_dark_bedroom.jpg",
    username: "@halfawake",
    caption: "The room before language.",
    weight: "wide",
  },
  {
    id: 20,
    image: "/trial/20_amber_profile.jpg",
    username: "@amberroom",
    caption: "A small room holding too much thought.",
    weight: "wide",
  },
  {
    id: 21,
    image: "/trial/21_bnw_seated.jpg",
    username: "@blackcoat",
    caption: "Stillness as refusal.",
    weight: "tall",
  },
  {
    id: 22,
    image: "/trial/22_bnw_closeup.jpg",
    username: "@wetfilm",
    caption: "Portrait after weather.",
    pushedBy: "@negativeone",
    weight: "tall",
  },
  {
    id: 23,
    image: "/trial/23_smiling_portrait.jpg",
    username: "@openwindow",
    caption: "A smile arriving unexpectedly.",
    weight: "wide",
  },
  {
    id: 24,
    image: "/trial/24_diner_portrait.jpg",
    username: "@tabletalk",
    caption: "She knew more than she said.",
    weight: "wide",
  },
  {
    id: 25,
    image: "/trial/25_garden_portrait.jpg",
    username: "@gardenparty",
    caption: "Summer conversation.",
    pushedBy: "@softcinema",
    weight: "tall",
  },
  {
    id: 26,
    image: "/trial/26_beaded_portrait.jpg",
    username: "@redbeads",
    caption: "Seen through the curtain.",
    weight: "wide",
  },
  {
    id: 27,
    image: "/trial/27_blue_room.jpg",
    username: "@emptychair",
    caption: "The room remained after everyone left.",
    weight: "wide",
  },
  {
    id: 28,
    image: "/trial/28_portrait_grid.jpg",
    username: "@fourways",
    caption: "Four versions of the same question.",
    weight: "hero",
  },
  {
    id: 29,
    image: "/trial/29_balcony_closeup.jpg",
    username: "@remembering",
    caption: "A thought leaving the body.",
    pushedBy: "@stillframe",
    weight: "wide",
  },
  {
    id: 30,
    image: "/trial/30_bathroom_still.jpg",
    username: "@bathroomlight",
    caption: "Practicing an apology in the mirror.",
    weight: "hero",
  },
  {
    id: 31,
    image: "/trial/31_low_angle_duo.jpg",
    username: "@groundlevel",
    caption: "Look down and we become enormous.",
    weight: "wide",
  },
  {
    id: 32,
    image: "/trial/32_waiting_room.jpg",
    username: "@waitingroom",
    caption: "Everyone heard the same news differently.",
    weight: "wide",
  },
  {
    id: 33,
    image: "/trial/33_projected_shadow.jpg",
    username: "@shadowplay",
    caption: "Her shadow arrived first.",
    pushedBy: "@bluecinema",
    weight: "hero",
  },
];

function resolveTheme(theme: Theme) {
  if (theme !== "system") return theme;

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <span className={`menu-icon ${open ? "menu-icon--open" : ""}`}>
      <i />
      <i />
    </span>
  );
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}

function ThemeControl({
  theme,
  onChange,
}: {
  theme: Theme;
  onChange: (theme: Theme) => void;
}) {
  return (
    <div className="theme-control">
      <button
        className={theme === "light" ? "active" : ""}
        type="button"
        onClick={() => onChange("light")}
        aria-label="Light appearance"
      >
        ☼
      </button>

      <button
        className={theme === "dark" ? "active" : ""}
        type="button"
        onClick={() => onChange("dark")}
        aria-label="Dark appearance"
      >
        ◐
      </button>

      <button
        className={theme === "system" ? "active" : ""}
        type="button"
        onClick={() => onChange("system")}
        aria-label="System appearance"
      >
        ◫
      </button>
    </div>
  );
}

function PostTile({
  post,
  pushed,
  onPush,
  onOpen,
}: {
  post: Post;
  pushed: boolean;
  onPush: () => void;
  onOpen: () => void;
}) {
  const [pushAnimating, setPushAnimating] = useState(false);

  const desktopOpenTimer = useRef<number | null>(null);
  const touchOpenTimer = useRef<number | null>(null);
  const lastTouchTime = useRef(0);

  const style = {
    "--image-position": post.position ?? "center",
  } as CSSProperties;

  const clearDesktopTimer = () => {
    if (desktopOpenTimer.current !== null) {
      window.clearTimeout(desktopOpenTimer.current);
      desktopOpenTimer.current = null;
    }
  };

  const clearTouchTimer = () => {
    if (touchOpenTimer.current !== null) {
      window.clearTimeout(touchOpenTimer.current);
      touchOpenTimer.current = null;
    }
  };

  const performPush = () => {
    clearDesktopTimer();
    clearTouchTimer();

    setPushAnimating(false);

    requestAnimationFrame(() => {
      setPushAnimating(true);

      window.setTimeout(() => {
        setPushAnimating(false);
      }, 520);
    });

    onPush();
  };

  const handleDesktopClick = (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    if ((event.target as HTMLElement).closest(".tile-push")) {
      return;
    }

    if (window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    clearDesktopTimer();

    /*
      A short delay gives the browser time to determine whether
      this is a single click or the first half of a double-click.
    */
    desktopOpenTimer.current = window.setTimeout(() => {
      onOpen();
      desktopOpenTimer.current = null;
    }, 300);
  };

  const handleDesktopDoubleClick = (
    event: React.MouseEvent<HTMLElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    clearDesktopTimer();
    performPush();
  };

  const handleTouch = (
    event: React.PointerEvent<HTMLElement>,
  ) => {
    if (event.pointerType !== "touch") {
      return;
    }

    if ((event.target as HTMLElement).closest(".tile-push")) {
      return;
    }

    const now = window.performance.now();
    const elapsed = now - lastTouchTime.current;

    /*
      A second tap within 360ms cancels the pending viewer open
      and performs Push instead.
    */
    if (lastTouchTime.current > 0 && elapsed <= 360) {
      event.preventDefault();
      event.stopPropagation();

      lastTouchTime.current = 0;
      clearTouchTimer();
      performPush();
      return;
    }

    lastTouchTime.current = now;
    clearTouchTimer();

    touchOpenTimer.current = window.setTimeout(() => {
      onOpen();
      touchOpenTimer.current = null;
      lastTouchTime.current = 0;
    }, 380);
  };

  const handlePushButton = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    performPush();
  };

  const handleKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
  ) => {
    if (event.key === "Enter") {
      event.preventDefault();
      onOpen();
    }

    if (event.key === " ") {
      event.preventDefault();
      performPush();
    }
  };

  return (
    <article
      className={`post-tile post-tile--${post.weight} ${
        pushed ? "post-tile--pushed" : ""
      } ${
        pushAnimating ? "post-tile--push-animating" : ""
      }`}
      style={style}
      tabIndex={0}
      role="button"
      aria-label={`${post.username}. Double-click or double-tap to Push.`}
      onClick={handleDesktopClick}
      onDoubleClick={handleDesktopDoubleClick}
      onPointerUp={handleTouch}
      onKeyDown={handleKeyDown}
    >
      <img
        src={post.image}
        alt=""
        draggable={false}
        decoding="async"
      />

      <div className="post-reveal">
        <div className="post-reveal-copy">
          <strong>{post.username}</strong>
          <p>{post.caption}</p>

          {post.pushedBy && (
            <span>Pushed by {post.pushedBy}</span>
          )}
        </div>
      </div>

      <button
        className={`tile-push ${
          pushed ? "tile-push--active" : ""
        }`}
        type="button"
        aria-label={pushed ? "Remove Push" : "Push this post"}
        aria-pressed={pushed}
        onClick={handlePushButton}
        onDoubleClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onPointerUp={(event) => {
          event.stopPropagation();
        }}
      >
        <span aria-hidden="true">↗</span>
        <span>{pushed ? "Pushed" : "Push"}</span>
      </button>
    </article>
  );
}

function ImmersiveViewer({
  post,
  pushed,
  onPush,
  onClose,
  onPrevious,
  onNext,
}: {
  post: Post;
  pushed: boolean;
  onPush: () => void;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") onPrevious();
      if (event.key === "ArrowRight") onNext();
    };

    document.body.classList.add("viewer-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("viewer-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, onPrevious, onNext]);

  const handleBackdropClick = (
    event: React.MouseEvent<HTMLDivElement>,
  ) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  const handleTouchStart = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    const touch = event.touches[0];

    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
  };

  const handleTouchEnd = (
    event: React.TouchEvent<HTMLDivElement>,
  ) => {
    if (
      touchStartX.current === null ||
      touchStartY.current === null
    ) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;

    touchStartX.current = null;
    touchStartY.current = null;

    const isHorizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const isRightSwipe = deltaX > 90;

    if (isHorizontal && isRightSwipe) {
      onClose();
    }
  };

  return (
    <div
      className="immersive-viewer"
      role="dialog"
      aria-modal="true"
      onClick={handleBackdropClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        className="viewer-close"
        type="button"
        onClick={onClose}
        aria-label="Close post"
      >
        <span />
        <span />
      </button>

      <button
        className="viewer-arrow viewer-arrow--previous"
        type="button"
        onClick={onPrevious}
        aria-label="Previous post"
      >
        ←
      </button>

      <figure
        className="viewer-stage"
        onClick={(event) => event.stopPropagation()}
      >
        <img
          src={post.image}
          alt=""
          draggable={false}
          decoding="sync"
          loading="eager"
          style={{ objectPosition: post.position ?? "center" }}
        />

        <figcaption className="viewer-caption">
          <div className="viewer-caption-copy">
            <strong>{post.username}</strong>
            <p>{post.caption}</p>
            {post.pushedBy && <span>Pushed by {post.pushedBy}</span>}
          </div>

          <button
            className={`viewer-push ${pushed ? "viewer-push--active" : ""}`}
            type="button"
            onClick={onPush}
            aria-pressed={pushed}
            aria-label={pushed ? "Remove Push" : "Push this post"}
          >
            <span className="viewer-push-arrow">↗</span>
            <span>{pushed ? "Pushed" : "Push"}</span>
          </button>
        </figcaption>
      </figure>

      <button
        className="viewer-arrow viewer-arrow--next"
        type="button"
        onClick={onNext}
        aria-label="Next post"
      >
        →
      </button>
    </div>
  );
}

function Navigation({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <>
      <button
        className={`menu-scrim ${open ? "menu-scrim--visible" : ""}`}
        type="button"
        aria-label="Close navigation"
        onClick={onClose}
      />

      <aside className={`navigation-panel ${open ? "navigation-panel--open" : ""}`}>
        <div className="navigation-brand">
          <BrandMark />
          <span>playground</span>
        </div>

        <nav>
          <button type="button">Slide</button>
          <button type="button">Explore</button>
          <button type="button">Activity</button>
          <button type="button">Messages</button>
          <button type="button">Your Playground</button>
          <button type="button">Settings</button>
        </nav>

        <button className="create-action" type="button">
          Create
        </button>

        <div className="navigation-note">
          <span>PLAYGROUND</span>
          <p>
            A visual world shaped by creators, references, and meaningful
            discovery.
          </p>
        </div>
      </aside>
    </>
  );
}

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPostIndex, setSelectedPostIndex] = useState<number | null>(null);
  const [pushedPostIds, setPushedPostIds] = useState<number[]>(() => {
    try {
      const stored = window.localStorage.getItem("playground-pushed-posts");
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const [startupVisible, setStartupVisible] = useState(true);
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = window.localStorage.getItem("playground-theme");

    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }

    return "system";
  });

  useEffect(() => {
    const startupTimer = window.setTimeout(() => {
      setStartupVisible(false);
    }, 3600);

    return () => window.clearTimeout(startupTimer);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const update = () => {
      document.documentElement.dataset.theme = resolveTheme(theme);
    };

    window.localStorage.setItem("playground-theme", theme);
    update();

    media.addEventListener("change", update);

    return () => media.removeEventListener("change", update);
  }, [theme]);

  const togglePush = (postId: number) => {
    setPushedPostIds((current) => {
      const next = current.includes(postId)
        ? current.filter((id) => id !== postId)
        : [...current, postId];

      window.localStorage.setItem(
        "playground-pushed-posts",
        JSON.stringify(next),
      );

      return next;
    });
  };

  const closeViewer = () => setSelectedPostIndex(null);

  const showPreviousPost = () => {
    setSelectedPostIndex((current) => {
      if (current === null) return null;
      return current === 0 ? posts.length - 1 : current - 1;
    });
  };

  const showNextPost = () => {
    setSelectedPostIndex((current) => {
      if (current === null) return null;
      return current === posts.length - 1 ? 0 : current + 1;
    });
  };

  return (
    <main className="app">
      {selectedPostIndex !== null && (
        <ImmersiveViewer
          post={posts[selectedPostIndex]}
          pushed={pushedPostIds.includes(posts[selectedPostIndex].id)}
          onPush={() => togglePush(posts[selectedPostIndex].id)}
          onClose={closeViewer}
          onPrevious={showPreviousPost}
          onNext={showNextPost}
        />
      )}

      {startupVisible && (
        <div className="startup-title" aria-hidden="true">
          <div className="startup-vignette" />

          <div className="startup-word" aria-hidden="true">
            <span className="startup-letter startup-letter--p">P</span>
            <span className="startup-letter startup-letter--fade startup-letter--1">l</span>
            <span className="startup-letter startup-letter--fade startup-letter--2">a</span>
            <span className="startup-letter startup-letter--fade startup-letter--3">y</span>
            <span className="startup-letter startup-letter--g">g</span>
            <span className="startup-letter startup-letter--fade startup-letter--4">r</span>
            <span className="startup-letter startup-letter--fade startup-letter--5">o</span>
            <span className="startup-letter startup-letter--fade startup-letter--6">u</span>
            <span className="startup-letter startup-letter--fade startup-letter--7">n</span>
            <span className="startup-letter startup-letter--fade startup-letter--8">d</span>
            <span className="startup-letter startup-letter--dot">.</span>
          </div>

          <div className="particle-field" aria-hidden="true">
            {Array.from({ length: 72 }, (_, index) => {
              const angle = (index * 137.5) % 360;
              const distance = 45 + ((index * 29) % 170);
              const lift = -26 - ((index * 17) % 145);
              const size = 2 + (index % 5);
              const delay = (index % 16) * 18;

              return (
                <i
                  key={index}
                  style={
                    {
                      "--particle-angle": `${angle}deg`,
                      "--particle-distance": `${distance}px`,
                      "--particle-lift": `${lift}px`,
                      "--particle-size": `${size}px`,
                      "--particle-delay": `${delay}ms`,
                    } as CSSProperties
                  }
                />
              );
            })}
          </div>

          <div className="startup-monogram" aria-hidden="true">
            <span>P</span>
            <span>G</span>
            <span>.</span>
          </div>
        </div>
      )}

      <header className="utility-bar">
        <button
          className="menu-button"
          type="button"
          onClick={() => setMenuOpen((value) => !value)}
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
        >
          <MenuIcon open={menuOpen} />
        </button>

        <div className="utility-brand">
          <BrandMark />
          <span>playground</span>
        </div>

        <div className="utility-actions">
          <ThemeControl theme={theme} onChange={setTheme} />

          <button className="user-button" type="button">
            TP
          </button>
        </div>
      </header>

      <Navigation open={menuOpen} onClose={() => setMenuOpen(false)} />

      <section className="weighted-wall" aria-label="Slide">
        {posts.map((post, index) => (
          <PostTile
            post={post}
            key={post.id}
            pushed={pushedPostIds.includes(post.id)}
            onPush={() => togglePush(post.id)}
            onOpen={() => setSelectedPostIndex(index)}
          />
        ))}
      </section>
    </main>
  );
}

export default App;
