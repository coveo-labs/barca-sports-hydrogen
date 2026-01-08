interface AssistantHeaderProps {
  isEmpty: boolean;
}

export function AssistantHeader({isEmpty}: AssistantHeaderProps) {
  if (!isEmpty) {
    return null;
  }

  return (
    <header className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-6 lg:px-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Barca water sports assistant
        </h1>
        <p className="text-sm text-slate-500">
          Find surf, paddle, and kayak accessories tailored to your next
          session.
        </p>
      </div>
    </header>
  );
}
