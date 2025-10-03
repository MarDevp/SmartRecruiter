"use client"

import { AppLayout } from "@/components/app-layout"
import { DashboardAnalytics } from "@/components/dashboard-analytics"

export default function HomePage() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Analytics and insights for your recruitment management system</p>
      </div>
      <DashboardAnalytics />
    </AppLayout>
  )
}
