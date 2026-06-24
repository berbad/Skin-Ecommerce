import Link from "next/link";

const CATEGORIES = [
  { name: "Serums", blurb: "Targeted actives", query: "Serum" },
  { name: "Cleansers", blurb: "Gentle, balanced", query: "Cleanser and Toner" },
  { name: "Moisturizers", blurb: "Barrier support", query: "Moisturizer" },
  { name: "SPF", blurb: "Daily protection", query: "SPF" },
];

export function ShopByCategory() {
  return (
    <section className="py-16">
      <div className="mb-8 flex items-baseline justify-between">
        <h2 className="text-2xl font-semibold tracking-tight">
          Shop by category
        </h2>
        <Link href="/products" className="text-sm text-brand hover:underline">
          All products →
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {CATEGORIES.map((cat) => (
          <Link
            key={cat.name}
            href={`/products?category=${encodeURIComponent(cat.query)}`}
            className="group relative flex aspect-[4/5] flex-col justify-end overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-brand-soft to-[color-mix(in_oklab,var(--brand)_18%,var(--card))] p-5 transition-shadow hover:shadow-lg"
          >
            <span className="text-lg font-semibold tracking-tight">
              {cat.name}
            </span>
            <span className="text-xs text-muted-foreground">{cat.blurb}</span>
            <span className="mt-3 text-sm font-medium text-brand transition-transform group-hover:translate-x-0.5">
              Shop →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
