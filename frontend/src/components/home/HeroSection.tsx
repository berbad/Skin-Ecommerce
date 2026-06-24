import Link from "next/link";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  return (
    <section className="grid items-center gap-8 py-12 md:grid-cols-2 md:py-16">
      <div>
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-brand">
          Dermatologist-grade · Clean actives
        </p>
        <h1 className="text-4xl font-semibold leading-[1.05] tracking-tight md:text-5xl">
          Proven skincare,
          <br />
          nothing extra.
        </h1>
        <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
          Transparent formulas built around clinically-studied ingredients. Find
          what works for your skin — and skip what doesn&apos;t.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/products">Find your routine</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/products">Shop all products</Link>
          </Button>
        </div>
      </div>

      <div className="relative min-h-[320px] overflow-hidden rounded-2xl bg-gradient-to-br from-brand-soft to-[color-mix(in_oklab,var(--brand)_25%,white)] md:min-h-[380px]">
        <div className="absolute bottom-6 right-6 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <p className="text-sm font-semibold tabular-nums">Niacinamide 10%</p>
          <p className="text-xs text-muted-foreground">Pores · Texture</p>
        </div>
      </div>
    </section>
  );
}
