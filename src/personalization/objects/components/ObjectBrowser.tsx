import { useMemo, useState } from "react";
import { listObjects } from "../registry";
import { registerBuiltinObjects } from "../registerBuiltins";
import type { ObjectCategory, PersonalizationObjectDefinition } from "../types";
import ObjectCard from "./ObjectCard";
import ObjectCategoryList from "./ObjectCategoryList";
import ObjectSearch from "./ObjectSearch";
import "./ObjectStudio.css";

const FAVORITES_KEY = "worlds.personalization.object-favorites.v2";
function readFavorites(): string[] { try { const value = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]"); return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : []; } catch { return []; } }
registerBuiltinObjects();

type Props = { onAddObject?: (definition: PersonalizationObjectDefinition) => void; };
export default function ObjectBrowser({ onAddObject }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ObjectCategory>("All");
  const [favorites, setFavorites] = useState<string[]>(readFavorites);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return listObjects().filter((item) => (category === "All" || item.category === category) && (!needle || [item.name, item.description ?? "", item.category, ...(item.keywords ?? [])].join(" ").toLowerCase().includes(needle)));
  }, [category, query]);
  const toggleFavorite = (id: string) => setFavorites((current) => { const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]; localStorage.setItem(FAVORITES_KEY, JSON.stringify(next)); return next; });
  const featured = visible.filter((item) => item.featured);
  return <section className="object-studio">
    <header className="object-studio__hero"><div><span>OBJECT STUDIO</span><h3>Build your world, one object at a time.</h3></div><p>Search a growing collection of expressive objects, save favorites, and add them to your playground.</p></header>
    <ObjectSearch value={query} onChange={setQuery} />
    <ObjectCategoryList value={category} onChange={setCategory} />
    {!query && category === "All" && featured.length ? <section className="object-studio__featured"><header><span>FEATURED</span><small>{featured.length} objects</small></header><div className="object-studio__grid">{featured.map((definition) => <ObjectCard key={`featured-${definition.id}`} definition={definition} favorite={favorites.includes(definition.id)} onToggleFavorite={toggleFavorite} onAdd={onAddObject} />)}</div></section> : null}
    <section className="object-studio__collection"><header><span>{query ? "RESULTS" : category.toUpperCase()}</span><small>{visible.length} objects</small></header>{visible.length ? <div className="object-studio__grid">{visible.map((definition) => <ObjectCard key={definition.id} definition={definition} favorite={favorites.includes(definition.id)} onToggleFavorite={toggleFavorite} onAdd={onAddObject} />)}</div> : <p className="object-studio__empty">No objects match your search.</p>}</section>
  </section>;
}
