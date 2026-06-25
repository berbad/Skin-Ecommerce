import Link from "next/link";
import { ListChecks, Leaf, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { normalizeImageSrc } from "@/lib/images";
import type { Product } from "@/components/product/product";

const TRUST = [
  { icon: ListChecks, label: "Complete ingredient list on every product" },
  { icon: Leaf, label: "Marine & botanical actives" },
  { icon: Sun, label: "Broad-spectrum SPF 30 available" },
];

export function HeroSection({ product }: { product?: Product }) {
  const image =
    product && typeof product.image === "string" ? product.image : "";

  return (
    <section className="grid items-center gap-8 py-12 md:grid-cols-2 md:py-16">
      <div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          Marine &amp; botanical actives
        </p>
        <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
          Every ingredient,
          <br />
          in the open.
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          Six focused formulas — serum, moisturizer, cleansers, masque, and SPF —
          each one published with its complete ingredient list, in full.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/products">Shop the range</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/about">Our approach</Link>
          </Button>
        </div>

        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
          {TRUST.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <Icon className="h-4 w-4 text-brand" aria-hidden />
              {label}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative min-h-[360px] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-soft to-[color-mix(in_oklab,var(--brand)_25%,var(--card))] md:min-h-[440px]">
        {image ? (
          <img
            src={normalizeImageSrc(image)}
            alt={product?.name ?? "Featured product"}
            className="absolute inset-0 h-full w-full object-contain p-10 mix-blend-multiply"
          />
        ) : (
          // fallback placeholder while products load
          <div className="absolute left-1/2 top-1/2 h-56 w-28 -translate-x-1/2 -translate-y-1/2 rounded-[14px] rounded-b-lg bg-card shadow-xl">
            <div className="absolute -top-4 left-1/2 h-5 w-10 -translate-x-1/2 rounded bg-foreground" />
            <div className="absolute inset-x-5 bottom-12 h-1.5 rounded bg-brand" />
            <div className="absolute inset-x-5 bottom-8 h-1 w-3/5 rounded bg-border" />
          </div>
        )}

        {/* real product callouts */}
        <div className="absolute left-5 top-5 flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium shadow-sm">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Bio-fermented red marine algae
        </div>
        {product && (
          <div className="absolute bottom-6 right-6 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
            <p className="text-sm font-semibold">{product.name}</p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {product.category} · ${product.price.toFixed(2)}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
