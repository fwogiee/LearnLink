import Sidebar from './Sidebar.jsx';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar className="peer" />
      <div className="ml-16 flex min-h-screen flex-1 flex-col transition-[margin-left] duration-300 peer-hover:ml-60 peer-focus-within:ml-60">
        {children}
      </div>
    </div>
  );
}
