// Shared SVG props helper
function withIconProps(props) {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    fill: 'none',
    viewBox: '0 0 24 24',
    strokeWidth: 1.6,
    stroke: 'currentColor',
    ...props,
  }
}

function HomeIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M2.25 12 11.2 3.045a1.1 1.1 0 0 1 1.6 0L21.75 12M6 9.75V18a2.25 2.25 0 0 0 2.25 2.25H9.75v-6h4.5v6h1.5A2.25 2.25 0 0 0 18 18V9.75'
      />
    </svg>
  )
}

function CardsIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M4.5 6.75A2.25 2.25 0 0 1 6.75 4.5h10.5A2.25 2.25 0 0 1 19.5 6.75V15a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 15V6.75z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M7.5 9h9m-9 3h9m-9 3h5.25'
      />
    </svg>
  )
}

function BookIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M6.75 4.5h8.25A2.25 2.25 0 0 1 17.25 6.75v10.5A2.25 2.25 0 0 0 15 15h-8.25A2.25 2.25 0 0 0 4.5 17.25V6.75A2.25 2.25 0 0 1 6.75 4.5z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M15 4.5c1.243 0 2.25 1.12 2.25 2.25v10.5c0 .621-.504 1.125-1.125 1.125M6.75 4.5c-1.243 0-2.25 1.12-2.25 2.25v10.5c0 .621.504 1.125 1.125 1.125'
      />
    </svg>
  )
}

function SparklesIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M9.813 15.904 9 21l3.75-3 3.75 3-.813-5.096M9.813 15.904A7.5 7.5 0 1 1 19 8.25a7.5 7.5 0 0 1-9.187 7.654'
      />
    </svg>
  )
}

function ClipboardIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M9 7.5h6m-3-3h-1.875A2.625 2.625 0 0 0 7.5 7.125V18.75A2.25 2.25 0 0 0 9.75 21h4.5A2.25 2.25 0 0 0 16.5 18.75V7.125A2.625 2.625 0 0 0 13.875 4.5H12Z'
      />
      <path strokeLinecap='round' strokeLinejoin='round' d='M9 12h6m-6 4h6' />
    </svg>
  )
}

function ShieldIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M12 3 20.25 6.375v4.5c0 5.25-3.437 9.938-8.25 11.25C7.188 20.813 3.75 16.125 3.75 10.875v-4.5L12 3Z'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M9 12l2.25 2.25L15 10.5'
      />
    </svg>
  )
}

function LogoutIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='m15.75 9 3 3m0 0-3 3m3-3H9'
      />
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M9 5.25H6.75A2.25 2.25 0 0 0 4.5 7.5v9a2.25 2.25 0 0 0 2.25 2.25H9'
      />
    </svg>
  )
}

function ChevronIcon({ className, isOpen }) {
  return (
    <svg
      {...withIconProps({ className })}
      style={{
        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 0.3s',
      }}
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='m9 5 7 7-7 7' />
    </svg>
  )
}

function LinkIcon(props) {
  return (
    <svg {...withIconProps(props)}>
      <path
        strokeLinecap='round'
        strokeLinejoin='round'
        d='M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244'
      />
    </svg>
  )
}

export {
  HomeIcon,
  CardsIcon,
  BookIcon,
  SparklesIcon,
  ClipboardIcon,
  ShieldIcon,
  LogoutIcon,
  ChevronIcon,
  LinkIcon,
}
