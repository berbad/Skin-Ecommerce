import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const BENEFITS = [
  "Visibly minimizes the look of enlarged pores",
  "Balances oil without stripping the skin barrier",
  "Evens tone and improves texture over time",
];

export function IngredientSpotlight() {
  return (
    <section className="grid items-center gap-8 rounded-2xl border border-border bg-card p-6 md:grid-cols-2 md:p-10">
      <div className="relative flex min-h-[280px] items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-soft to-[color-mix(in_oklab,var(--brand)_22%,var(--card))]">
        <div className="text-center">
          <p className="text-5xl font-semibold tracking-tight text-brand tabular-nums">
            10%
          </p>
          <p className="mt-1 text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Niacinamide
          </p>
        </div>
      </div>

      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          Ingredient spotlight
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">
          Niacinamide, done right.
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          A high-strength vitamin B3 serum at a clinically-meaningful 10% — the
          concentration the research actually supports, printed right on the
          bottle.
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
          <Link href="/products?concern=Acne%20%26%20Pores">
            Shop niacinamide
          </Link>
        </Button>
      </div>
    </section>
  );
}
