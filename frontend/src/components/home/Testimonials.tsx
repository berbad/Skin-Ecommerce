import { Star } from "lucide-react";

const REVIEWS = [
  {
    quote:
      "My skin texture changed within a month. The transparency about concentrations sold me — I finally know what I'm putting on my face.",
    name: "Maya R.",
  },
  {
    quote:
      "Fragrance-free and actually gentle on my sensitive skin. The barrier cream is now a permanent part of my routine.",
    name: "Jordan T.",
  },
  {
    quote:
      "Results without the marketing fluff. Clean ingredient lists, real percentages, and it works. Exactly what I wanted.",
    name: "Priya K.",
  },
];

function Stars() {
  return (
    <div className="mb-3 flex gap-0.5 text-brand" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="h-4 w-4 fill-current" aria-hidden />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-16">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-semibold tracking-tight">
          Loved by 12,000+ people
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Real reviews from verified buyers.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {REVIEWS.map((review) => (
          <figure
            key={review.name}
            className="flex flex-col rounded-2xl border border-border bg-card p-6"
          >
            <Stars />
            <blockquote className="flex-1 text-sm leading-relaxed text-foreground">
              “{review.quote}”
            </blockquote>
            <figcaption className="mt-4 text-sm font-medium">
              {review.name}
              <span className="ml-2 font-normal text-muted-foreground">
                Verified buyer
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
