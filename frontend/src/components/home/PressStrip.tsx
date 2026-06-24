const OUTLETS = ["VOGUE", "Allure", "Byrdie", "REFINERY29", "Cosmopolitan"];

export function PressStrip() {
  return (
    <section className="border-y border-border py-6">
      <p className="mb-4 text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        As featured in
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
        {OUTLETS.map((outlet) => (
          <span
            key={outlet}
            className="text-lg font-semibold tracking-wide text-muted-foreground/70"
          >
            {outlet}
          </span>
        ))}
      </div>
    </section>
  );
}
