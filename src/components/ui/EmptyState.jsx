export default function EmptyState({ title, description, action, icon }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-ink-200 bg-white px-6 py-14 text-center">
      {icon && <div className="mb-3 text-ink-400">{icon}</div>}
      <p className="text-sm font-medium text-ink-900">{title}</p>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-ink-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
