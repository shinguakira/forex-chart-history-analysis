import { Link, useRouterState } from '@tanstack/react-router'

export function Header() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-bold text-white">Forex Chart</h1>
        <nav className="flex gap-1">
          <Link
            to="/"
            className={`px-3 py-1 text-xs rounded transition-colors ${
              pathname === '/'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Chart
          </Link>
          <Link
            to="/analysis"
            className={`px-3 py-1 text-xs rounded transition-colors ${
              pathname === '/analysis'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Analysis
          </Link>
          <Link
            to="/review"
            className={`px-3 py-1 text-xs rounded transition-colors ${
              pathname === '/review'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Review
          </Link>
          <Link
            to="/forecast"
            className={`px-3 py-1 text-xs rounded transition-colors ${
              pathname === '/forecast'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Forecast
          </Link>
          <Link
            to="/notes"
            className={`px-3 py-1 text-xs rounded transition-colors ${
              pathname === '/notes'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Notes
          </Link>
          <Link
            to="/learning"
            className={`px-3 py-1 text-xs rounded transition-colors ${
              pathname === '/learning'
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }`}
          >
            Learning
          </Link>
        </nav>
      </div>
      <span className="text-xs text-gray-500">30s auto-refresh</span>
    </header>
  )
}
