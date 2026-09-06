export default function Loading() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center p-6">
      <div className="w-full max-w-2xl space-y-4" aria-label="Loading dashboard">
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
          <div className="h-28 animate-pulse rounded-xl bg-muted" />
        </div>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    </main>
  );
}