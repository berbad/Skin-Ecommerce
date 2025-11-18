import type { Metadata } from "next";
import { Leaf, FlaskConical, ShieldCheck, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "About | EternalBotanic",
  description:
    "EternalBotanic delivers professional-grade, plant-powered skincare trusted by estheticians. Clean formulations, transparent labels, barrier-first care.",
  openGraph: {
    title: "About | EternalBotanic",
    description:
      "EternalBotanic delivers professional-grade, plant-powered skincare trusted by estheticians. Clean formulations, transparent labels, barrier-first care.",
    type: "website",
  },
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <header className="text-center">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-4">
          About <span className="text-pink-600">EternalBotanic</span>
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
          Professional-grade skincare, crafted in partnership with expert labs
          and trusted by estheticians. Plant-powered, barrier-first, and free
          from harsh additives.
        </p>
      </header>

      <section aria-labelledby="story" className="mt-10 space-y-6 text-left">
        <h2 id="story" className="text-xl font-semibold">
          Our story
        </h2>
        <p className="text-muted-foreground leading-relaxed">
          EternalBotanic began with a simple goal: make professional-quality
          skincare accessible without compromise. We partner with established
          laboratories to source proven formulas, then curate and package them
          to our standards of purity and performance.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Each product blends plant-based actives with evidence-based
          concentrations. We focus on skin barrier support, long-term
          nourishment, and formulations that avoid unnecessary fillers or
          synthetic fragrances.
        </p>
      </section>

      <section aria-labelledby="pillars" className="mt-12">
        <h2 id="pillars" className="text-xl font-semibold mb-4">
          What guides us
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          <li className="rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <Leaf className="h-5 w-5 text-pink-600" aria-hidden />
              <span className="font-medium">Plant-powered actives</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Botanical ingredients chosen for proven skin benefits.
            </p>
          </li>
          <li className="rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <FlaskConical className="h-5 w-5 text-pink-600" aria-hidden />
              <span className="font-medium">Professional-grade science</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Evidence-based formulations, tested for stability and safety.
            </p>
          </li>
          <li className="rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-pink-600" aria-hidden />
              <span className="font-medium">Barrier-first care</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Formulas designed to strengthen and protect your skin barrier.
            </p>
          </li>
          <li className="rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-pink-600" aria-hidden />
              <span className="font-medium">Transparent labels</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Clear INCI lists and sourcing you can trust. No hidden fillers.
            </p>
          </li>
        </ul>
      </section>

      <section aria-labelledby="promise" className="mt-12">
        <h2 id="promise" className="text-xl font-semibold mb-3">
          Our promise
        </h2>
        <blockquote className="rounded-2xl border p-5 text-muted-foreground">
          If it doesn’t nourish, calm, or support your skin barrier, it doesn’t
          make it into our line. Every product is esthetician-trusted and made
          for real results.
        </blockquote>
      </section>

      <footer className="mt-12 text-center">
        <a
          href="/products"
          className="inline-flex items-center justify-center rounded-xl bg-pink-600 px-5 py-3 text-white text-sm font-medium transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-pink-600/50"
        >
          Explore products
        </a>
      </footer>
    </main>
  );
}
