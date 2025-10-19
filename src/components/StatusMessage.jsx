const toneStyles = {
  info: 'border-blue-200 bg-blue-50 text-blue-700',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  error: 'border-red-200 bg-red-50 text-red-700',
  warning: 'border-amber-200 bg-amber-50 text-amber-700',
};

export default function StatusMessage({ tone = 'info', children, className = '' }) {
  if (!children) return null;
  const styles = toneStyles[tone] || toneStyles.info;
  return (
    <div className={`rounded-xl border px-3 py-2 text-sm ${styles} ${className}`}>
      {children}
    </div>
  );
}
