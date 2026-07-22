type ObjectSearchProps = { value: string; onChange: (value: string) => void; };
export default function ObjectSearch({ value, onChange }: ObjectSearchProps) {
  return <label className="object-studio__search"><span aria-hidden="true">⌕</span><input type="search" value={value} onChange={(event) => onChange(event.target.value)} placeholder="Search objects" aria-label="Search objects" />{value ? <button type="button" onClick={() => onChange("")}>Clear</button> : null}</label>;
}
