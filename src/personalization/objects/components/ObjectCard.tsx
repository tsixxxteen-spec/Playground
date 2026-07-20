import type { PersonalizationObjectDefinition } from "../types";
type Props = { definition: PersonalizationObjectDefinition; favorite: boolean; onToggleFavorite: (id: string) => void; onAdd?: (definition: PersonalizationObjectDefinition) => void; };
export default function ObjectCard({ definition, favorite, onToggleFavorite, onAdd }: Props) {
  return <article className="object-card" data-featured={definition.featured || undefined}>
    <button className="object-card__main" type="button" onClick={() => onAdd?.(definition)} disabled={!onAdd}>
      <span className="object-card__preview" aria-hidden="true">{definition.icon}</span>
      <span className="object-card__copy"><small>{definition.category}</small><strong>{definition.name}</strong><p>{definition.description}</p></span>
      {onAdd ? <span className="object-card__add" aria-hidden="true">＋</span> : null}
    </button>
    <button className="object-card__favorite" type="button" data-active={favorite} aria-label={`${favorite ? "Remove" : "Add"} ${definition.name} ${favorite ? "from" : "to"} favorites`} onClick={() => onToggleFavorite(definition.id)}>{favorite ? "★" : "☆"}</button>
  </article>;
}
