import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/flashcards', label: 'Flashcards', icon: CardsIcon },
  { to: '/materials', label: 'Learning Materials', icon: BookIcon },
  { to: '/ai-flashcards', label: 'AI Flashcards', icon: SparklesIcon },
  { to: '/quizzes', label: 'Quizzes', icon: ClipboardIcon },
  { to: '/materials', label: 'Materials', icon: DocumentIcon },
];

export default function Sidebar() {
  const { role, logout, username } = useAuth();
  const navigate = useNavigate();

  const items = role === 'admin'
    ? [...NAV_ITEMS, { to: '/admin', label: 'Admin', icon: ShieldIcon }]
    : NAV_ITEMS;

  const handleLogout = () => {
    logout();
    navigate('/auth', { replace: true });
  };

  return (
    <aside className="group fixed left-0 top-0 z-40 flex h-screen w-16 flex-col overflow-hidden border-r border-neutral-200 bg-white transition-[width] duration-300 hover:w-60 lg:w-60">
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-900 text-sm font-semibold text-white">LL</div>
          <div className="hidden text-sm font-semibold text-neutral-900 group-hover:block">LearnLink</div>
        </div>
        <nav className="mt-2 flex-1 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  isActive
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-100',
                ].join(' ')
              }
            >
              <item.icon className="h-5 w-5" />
              <span className="hidden group-hover:block">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-neutral-200 p-3">
          <div className="hidden text-xs text-neutral-500 group-hover:block">
            Signed in as
            <div className="font-medium text-neutral-900">{username || 'User'}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="mt-2 inline-flex w-full items-center gap-3 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700 transition hover:bg-neutral-50"
          >
            <LogoutIcon className="h-5 w-5" />
            <span className="hidden group-hover:block">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}

function withIconProps(props) {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    strokeWidth: 1.6,
    stroke: 'currentColor',
    ...props,
  };
}

function HomeIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12 11.2 3.045a1.1 1.1 0 0 1 1.6 0L21.75 12M6 9.75V18a2.25 2.25 0 0 0 2.25 2.25H9.75v-6h4.5v6h1.5A2.25 2.25 0 0 0 18 18V9.75" />
    </svg>
  );
}

function CardsIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5A2.25 2.25 0 0 1 19.5 6.75V15a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 15V6.75z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 9h9m-9 3h9m-9 3h5.25" />
    </svg>
  );
}

function BookIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 4.5h8.25A2.25 2.25 0 0 1 17.25 6.75v10.5A2.25 2.25 0 0 0 15 15h-8.25A2.25 2.25 0 0 0 4.5 17.25V6.75A2.25 2.25 0 0 1 6.75 4.5z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 4.5c1.243 0 2.25 1.12 2.25 2.25v10.5c0 .621-.504 1.125-1.125 1.125M6.75 4.5c-1.243 0-2.25 1.12-2.25 2.25v10.5c0 .621.504 1.125 1.125 1.125" />
    </svg>
  );
}

function SparklesIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 21l3.75-3 3.75 3-.813-5.096M9.813 15.904A7.5 7.5 0 1 1 19 8.25a7.5 7.5 0 0 1-9.187 7.654" />
    </svg>
  );
}

function ClipboardIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 7.5h6m-3-3h-1.875A2.625 2.625 0 0 0 7.5 7.125V18.75A2.25 2.25 0 0 0 9.75 21h4.5A2.25 2.25 0 0 0 16.5 18.75V7.125A2.625 2.625 0 0 0 13.875 4.5H12Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6" />
    </svg>
  );
}

function DocumentIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
    </svg>
  );
}

function ShieldIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3 20.25 6.375v4.5c0 5.25-3.437 9.938-8.25 11.25C7.188 20.813 3.75 16.125 3.75 10.875v-4.5L12 3Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2.25 2.25L15 10.5" />
    </svg>
  );
}

function LogoutIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 9 3 3m0 0-3 3m3-3H9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5.25H6.75A2.25 2.25 0 0 0 4.5 7.5v9a2.25 2.25 0 0 0 2.25 2.25H9" />
    </svg>
  );
}
