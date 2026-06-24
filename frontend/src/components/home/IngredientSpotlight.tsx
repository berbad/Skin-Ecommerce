import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// Copy drawn directly from the 4D+ Hyaluronic Serum product data.
const BENEFITS = [
  "Multi-weight hyaluronic acid hydrates and plumps at multiple layers",
  "Arctic Tree extract helps calm irritation and support the skin barrier",
  "Improves smoothness for a brighter, healthier-looking complexion",
];

export function IngredientSpotlight() {
  return (
    <section className="grid items-center gap-8 rounded-2xl border border-border bg-card p-6 md:grid-cols-2 md:p-10">
      <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-soft to-[color-mix(in_oklab,var(--brand)_22%,var(--card))]">
        <div className="text-center">
          <p className="text-5xl font-semibold tracking-tight text-brand">4D</p>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Hyaluronic acid
          </p>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          Ingredient spotlight
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Hydration, at every layer.
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          Our 4D+ Hyaluronic Serum uses multi-weight hyaluronic acid to hydrate
          and plump at multiple depths, with Arctic Tree extract to calm
          irritation — made for sensitive or dehydrated skin.
        </p>
        <ul className="mt-5 space-y-2.5">
          {BENEFITS.map((benefit) => (
            <li key={benefit} className="flex items-start gap-2.5 text-sm">
              <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-soft text-brand">
                <Check className="h-3 w-3" aria-hidden />
              </span>
              {benefit}
            </li>
          ))}
        </ul>
        <Button asChild className="mt-7">
          <Link href="/products?category=Serum">Shop the serum</Link>
        </Button>
      </div>
    </section>
  );
}
