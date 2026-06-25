export default function CancelPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <div className="rounded-2xl border border-border bg-card p-10 text-center">
        <h1 className="mb-4 text-3xl font-semibold tracking-tight">
          Order canceled
        </h1>
        <p className="text-lg text-muted-foreground">
          Your payment was not completed. You can try again anytime.
        </p>
      </div>
    </div>
  );
}
