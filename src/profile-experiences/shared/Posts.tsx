import type { ReactNode } from "react";

type PostsProps = {
  children: ReactNode;
  count: number;
  label?: string;
};

export default function Posts({
  children,
  count,
  label = "Work",
}: PostsProps) {
  return (
    <section className="xp-posts">
      <header>
        <span>{label}</span>
        <span>{count}</span>
      </header>

      {children ?? (
        <div className="xp-empty">
          <strong>Your Playground is waiting.</strong>
          <p>Work you publish will appear here.</p>
        </div>
      )}
    </section>
  );
}
