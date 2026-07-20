import type { ObjectCategory } from "../types";
const categories: ObjectCategory[] = ["All", "Audio", "Atmosphere", "Desk", "Nature", "Retro", "Companions"];
type Props = { value: ObjectCategory; onChange: (value: ObjectCategory) => void; };
export default function ObjectCategoryList({ value, onChange }: Props) {
  return <nav className="object-studio__categories" aria-label="Object categories">{categories.map((category) => <button key={category} type="button" data-active={value === category} onClick={() => onChange(category)}>{category}</button>)}</nav>;
}
