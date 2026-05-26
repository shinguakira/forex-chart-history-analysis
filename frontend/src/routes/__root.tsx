import { createRootRoute, Outlet } from '@tanstack/react-router'
import { Header } from '@/components/layout/Header'

function RootLayout() {
  return (
    <div className="bg-[#0f1117] min-h-screen text-gray-300">
      <Header />
      <Outlet />
    </div>
  )
}

export const Route = createRootRoute({
  component: RootLayout,
})
