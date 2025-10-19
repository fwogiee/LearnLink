export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex items-center gap-3 text-sm text-neutral-600">
      <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-neutral-400 border-t-transparent" />
      <span>{label}</span>
    </div>
  );
}
