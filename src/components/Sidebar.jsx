import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  HomeIcon,
  CardsIcon,
  BookIcon,
  SparklesIcon,
  ClipboardIcon,
  ShieldIcon,
  LogoutIcon,
  ChevronIcon,
  LinkIcon,
} from './Icons.jsx'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: HomeIcon },
  { to: '/flashcards', label: 'Flashcards', icon: CardsIcon },
  { to: '/materials', label: 'Learning Materials', icon: BookIcon },
  { to: '/ai-flashcards', label: 'AI Flashcards', icon: SparklesIcon },
  { to: '/quizzes', label: 'Quizzes', icon: ClipboardIcon },
]

export default function Sidebar({ className = '', isOpen, onToggle }) {
  const { role, logout, username } = useAuth()
  const navigate = useNavigate()

  const items =
    role === 'admin'
      ? [...NAV_ITEMS, { to: '/admin', label: 'Admin', icon: ShieldIcon }]
      : NAV_ITEMS

  const handleLogout = () => {
    logout()
    navigate('/auth', { replace: true })
  }

  return (
    <aside className={`sidebar ${isOpen ? 'w-60' : 'w-16'} ${className}`}>
      <div className='flex h-full flex-col'>
        <SidebarHeader>
          {isOpen && <LogoButton text={'Learn Link'} />}
          <ToggleButton isOpen={isOpen} onToggle={onToggle} />
        </SidebarHeader>

        <SidebarContent>
          {items.map((item) => (
            <NavListItem item={item} key={item.to} showLabel={isOpen} />
          ))}
        </SidebarContent>

        <SidebarFooter>
          <LogoutButton
            isOpen={isOpen}
            handleLogout={handleLogout}
            username={username}
          />
        </SidebarFooter>
      </div>
    </aside>
  )
}

// Sidebar Components
function SidebarHeader({ children }) {
  return (
    <div className='h-16 flex items-center gap-3 p-3 border-b border-neutral-300'>
      {children}
    </div>
  )
}

function SidebarContent({ children }) {
  return (
    <nav className='pt-4 flex-1 px-3'>
      <ul className='space-y-3'>{children}</ul>
    </nav>
  )
}

function SidebarFooter({ children }) {
  return <div className='border-t border-neutral-200 px-3 py-4'>{children}</div>
}

// Navigation List Button Component
function NavListItem({ item, showLabel }) {
  return (
    <li
      className={`flex cursor-pointer ${showLabel ? 'w-full' : 'w-9'} transition-all`}
    >
      <NavLink
        to={item.to}
        className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
      >
        <item.icon className='h-5 w-5 shrink-0' />
        {showLabel && <span className='text-nowrap'>{item.label}</span>}
      </NavLink>
    </li>
  )
}

// Button Components
function LogoButton({ text }) {
  return (
    <div className='flex h-9 px-2 gap-3 shrink-0 items-center justify-center rounded-xl text-sm font-semibold text-neutral-900'>
      <LinkIcon className='w-5 h-5' />
      {text}
    </div>
  )
}

function LogoutButton({ isOpen, username, handleLogout }) {
  return (
    <>
      {isOpen && (
        <div className='text-xs text-neutral-500 text-nowrap pb-2'>
          Signed in as{' '}
          <span className='font-medium text-neutral-900'>
            {username || 'User'}
          </span>
        </div>
      )}
      <button
        type='button'
        onClick={handleLogout}
        className='inline-flex w-full items-center gap-3 rounded-lg border border-neutral-300 p-2 text-sm text-neutral-700 transition hover:bg-neutral-50'
      >
        <LogoutIcon className='h-5 w-5 shrink-0' />
        {isOpen && <span>Logout</span>}
      </button>
    </>
  )
}

function ToggleButton({ isOpen, onToggle }) {
  return (
    <button
      type='button'
      onClick={onToggle}
      className='ml-auto w-9 rounded-lg border border-neutral-300 cursor-pointer p-2 items-center justify-items-center transition text-neutral-700 hover:bg-neutral-50'
      aria-label={isOpen ? 'Collapse sidebar' : 'Expand sidebar'}
    >
      <ChevronIcon className='h-5 w-5' isOpen={isOpen} />
    </button>
  )
}
