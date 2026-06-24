import Link from "next/link";

// Categories and query values match the real product catalog.
const CATEGORIES = [
  { name: "Serum", blurb: "4D hyaluronic acid", query: "Serum" },
  { name: "Moisturizer", blurb: "Red marine algae", query: "Moisturizer" },
  { name: "Cleansers", blurb: "Ginseng & cleansing oils", query: "Cleanser and Toner" },
  { name: "Masque", blurb: "Vitamin C & Kakadu plum", query: "Masque" },
  { name: "SPF", blurb: "Broad-spectrum SPF 30", query: "SPF" },
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

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
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
