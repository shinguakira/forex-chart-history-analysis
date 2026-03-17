import { PairList } from '@/components/sidebar/PairList'
import { WindowCanvas } from '@/components/window/WindowCanvas'

export function MainLayout() {
  return (
    <div className="flex h-[calc(100vh-49px)]">
      <aside className="w-52 border-r border-gray-800 overflow-y-auto flex-shrink-0">
        <PairList />
      </aside>
      <WindowCanvas />
    </div>
  )
}
