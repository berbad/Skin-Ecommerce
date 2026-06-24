import { ListChecks, Leaf, ShieldCheck } from "lucide-react";

// Every claim here is verifiable from the actual product catalog.
const PILLARS = [
  {
    icon: ListChecks,
    title: "Full ingredient transparency",
    body: "Every formula publishes its complete INCI list in full — no hidden or undisclosed actives.",
  },
  {
    icon: Leaf,
    title: "Marine & botanical actives",
    body: "Built around ingredients like bio-fermented red marine algae, ginseng, green tea, and Kakadu plum.",
  },
  {
    icon: ShieldCheck,
    title: "Made for sensitive skin",
    body: "Formulas are designed to calm redness and support stressed, dehydrated, or reactive skin.",
  },
];

export function ScienceStrip() {
  return (
    <section className="grid gap-8 border-t border-border bg-card px-6 py-10 sm:grid-cols-3">
      {PILLARS.map(({ icon: Icon, title, body }) => (
        <div key={title}>
          <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
            <Icon className="h-4 w-4" aria-hidden />
          </div>
          <h3 className="mb-1 text-sm font-semibold">{title}</h3>
          <p className="text-xs leading-relaxed text-muted-foreground">{body}</p>
        </div>
      ))}
    </section>
  );
}
