import { getAnalytics } from "@/lib/data/analytics"
import AnalyticsDashboard from "@/components/pages/analytics/AnalyticsDashboard"

export default async function AnalyticsPage() {
  const [monthlyData] = await Promise.all([
    getAnalytics(),
  ])
  
  return <AnalyticsDashboard monthlyData={monthlyData} />
}
