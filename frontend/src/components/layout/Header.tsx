import { Link, useRouterState } from '@tanstack/react-router'
import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'

const NAV_ITEMS = [
  { to: '/', label: 'Chart' },
  { to: '/analysis', label: 'Analysis' },
  { to: '/review', label: 'Review' },
  { to: '/forecast', label: 'Forecast' },
  { to: '/predictions', label: 'Predictions' },
  { to: '/backtest', label: 'Backtest' },
  { to: '/practice', label: 'Practice' },
  { to: '/playbook', label: 'Playbook' },
  { to: '/notes', label: 'Notes' },
  { to: '/learning', label: 'Learning' },
  { to: '/ingestion', label: 'Ingestion' },
] as const

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const linkClass = (to: string, mobile = false) => {
    const base = mobile ? 'px-3 py-2 text-sm rounded' : 'px-3 py-1 text-xs rounded'
    const active =
      pathname === to
        ? 'bg-blue-600 text-white'
        : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
    return `${base} transition-colors ${active}`
  }

  return (
    <header className="relative border-b border-gray-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <div className="flex items-center gap-6 min-w-0">
          <h1 className="text-lg font-bold text-white shrink-0">Forex Chart</h1>
          <nav className="hidden md:flex gap-1 flex-wrap">
            {NAV_ITEMS.map((item) => (
              <Link key={item.to} to={item.to} className={linkClass(item.to)}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden md:inline text-xs text-gray-500">30s auto-refresh</span>
          <button
            type="button"
            className="md:hidden p-1 text-gray-300 hover:text-white"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <nav className="md:hidden absolute top-full left-0 right-0 z-40 flex flex-col gap-1 px-4 pb-3 pt-2 border-t border-gray-800 bg-[#0f1117] shadow-xl">
          {NAV_ITEMS.map((item) => (
            <Link key={item.to} to={item.to} className={linkClass(item.to, true)}>
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
