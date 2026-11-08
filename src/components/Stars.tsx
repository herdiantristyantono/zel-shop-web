import { StarIcon } from "./icons";

export function Stars({ value, size = 14, count }: { value: number; size?: number; count?: number }) {
  return (
    <span className="inline-flex items-center gap-1" aria-label={`Rating ${value.toFixed(1)} dari 5${count != null ? `, ${count} ulasan` : ""}`}>
      <span className="flex text-[#B07A2E]" aria-hidden>
        {[1, 2, 3, 4, 5].map((i) => (
          <StarIcon key={i} size={size} filled={value >= i - 0.25} />
        ))}
      </span>
      {count != null && <span className="text-xs text-muted" aria-hidden>({count})</span>}
    </span>
  );
}
