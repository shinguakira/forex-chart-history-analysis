import { createFileRoute } from '@tanstack/react-router'
import { BacktestPage } from '@/components/backtest/BacktestPage'

export const Route = createFileRoute('/backtest')({
  component: BacktestPage,
})
