import Sidebar from './Sidebar.jsx';

export default function Layout({ children }) {
  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar />
      <div className="ml-16 flex min-h-screen flex-1 flex-col lg:ml-60">
        {children}
      </div>
    </div>
  );
}
