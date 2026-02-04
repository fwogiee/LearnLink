import { useState } from 'react';
import Sidebar from './Sidebar.jsx';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-neutral-50 text-neutral-900">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className={`flex min-h-screen flex-1 flex-col transition-[margin-left] duration-300 ${sidebarOpen ? 'ml-60' : 'ml-16'}`}>
        {children}
      </div>
    </div>
  );
}
