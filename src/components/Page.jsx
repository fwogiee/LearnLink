import { useEffect } from 'react';

export default function Page({ title, subtitle, actions, children }) {
  useEffect(() => {
    if (title) {
      document.title = `${title} • LearnLink`;
    } else {
      document.title = 'LearnLink';
    }
  }, [title]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-neutral-200 bg-white/80 backdrop-blur">
        <div className="container-px flex h-16 items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">{title}</h1>
            {subtitle ? <p className="text-xs text-neutral-500">{subtitle}</p> : null}
          </div>
          {actions ? <div className="flex items-center gap-2 text-sm">{actions}</div> : null}
        </div>
      </header>
      <main className="container-px flex-1 py-6">
        {children}
      </main>
    </div>
  );
}
