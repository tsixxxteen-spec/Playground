import { CSSProperties, useEffect, useState } from "react";
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

function PostTile({ post }: { post: Post }) {
  const [revealed, setRevealed] = useState(false);

  const style = {
    "--image-position": post.position ?? "center",
  } as CSSProperties;

  return (
    <article
      className={`post-tile post-tile--${post.weight} ${
        revealed ? "post-tile--revealed" : ""
      }`}
      style={style}
      tabIndex={0}
      onClick={() => setRevealed((value) => !value)}
    >
      <img src={post.image} alt="" draggable={false} />

      <div className="post-reveal">
        <strong>{post.username}</strong>
        <p>{post.caption}</p>
        {post.pushedBy && <span>Pushed by {post.pushedBy}</span>}
      </div>
    </article>
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
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = window.localStorage.getItem("playground-theme");

    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }

    return "system";
  });

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

  return (
    <main className="app">
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
        {posts.map((post) => (
          <PostTile post={post} key={post.id} />
        ))}
      </section>
    </main>
  );
}

export default App;
