import { FlaskConical, Eye, ShieldCheck } from "lucide-react";

const PILLARS = [
  {
    icon: FlaskConical,
    title: "Clinically-studied actives",
    body: "Every formula is built around ingredients with published, peer-reviewed evidence.",
  },
  {
    icon: Eye,
    title: "Full transparency",
    body: "See every ingredient, its concentration, and why it's there — no proprietary blends.",
  },
  {
    icon: ShieldCheck,
    title: "30-day results guarantee",
    body: "If your skin doesn't respond, return it for a full refund. No questions.",
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
