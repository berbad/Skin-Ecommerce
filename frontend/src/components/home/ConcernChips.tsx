import Link from "next/link";

const CONCERNS = [
  "Acne & Pores",
  "Dryness",
  "Fine Lines",
  "Dullness",
  "Sensitivity",
  "SPF",
];

export function ConcernChips() {
  return (
    <div className="flex flex-wrap justify-center gap-2 border-y border-border bg-card py-5">
      <Link
        href="/products"
        className="rounded-full border border-brand bg-brand-soft px-4 py-2 text-xs font-medium text-brand"
      >
        All
      </Link>
      {CONCERNS.map((concern) => (
        <Link
          key={concern}
          href={`/products?concern=${encodeURIComponent(concern)}`}
          className="rounded-full border border-border px-4 py-2 text-xs text-muted-foreground transition-colors hover:border-brand hover:text-brand"
        >
          {concern}
        </Link>
      ))}
    </div>
  );
}
