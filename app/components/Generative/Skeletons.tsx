export function ProductCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="relative w-full pb-[100%] max-h-[140px]">
        <div className="absolute inset-0 rounded-lg bg-slate-200" />
      </div>
      <div className="mt-2 h-3 w-3/4 rounded bg-slate-200" />
      <div className="mt-1 h-3 w-1/2 rounded bg-slate-200" />
      <div className="mt-1 flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <div
            key={`star-${star}`}
            className="h-3.5 w-3.5 rounded-full bg-slate-200"
          />
        ))}
      </div>
      <div className="mt-0.5 h-4 w-12 rounded bg-slate-200" />
    </div>
  );
}

export function CarouselSkeleton() {
  return (
    <div className="my-4 rounded-2xl bg-gray-50 px-3 py-4 shadow-sm ring-1 ring-slate-200/70">
      <ul
        className="grid grid-cols-3 gap-3 list-none"
        aria-label="Loading products..."
      >
        {['slot-1', 'slot-2', 'slot-3'].map((slotId) => (
          <li key={slotId}>
            <div className="rounded-xl bg-white p-2 shadow-sm ring-1 ring-slate-200 h-full">
              <ProductCardSkeleton />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function InlineProductSkeleton() {
  return (
    <div className="my-3 w-full max-w-[18rem] animate-pulse">
      <div className="aspect-square w-full rounded-lg bg-slate-200" />
      <div className="mt-4 h-4 w-3/4 rounded bg-slate-200" />
      <div className="mt-2 h-5 w-1/3 rounded bg-slate-200" />
    </div>
  );
}

export function NextActionsSkeleton() {
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4 animate-pulse">
      {['action-1', 'action-2', 'action-3'].map((actionId) => (
        <div key={actionId} className="h-7 w-24 rounded-full bg-slate-200" />
      ))}
    </div>
  );
}
