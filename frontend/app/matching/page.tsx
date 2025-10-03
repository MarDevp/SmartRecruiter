"use client"

import { AppLayout } from "@/components/app-layout"
import { MatchingManager } from "@/components/matching-manager"

export default function MatchingPage() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">CV Matching</h1>
        <p className="text-muted-foreground">Score CVs against job requirements</p>
      </div>
      <MatchingManager />
    </AppLayout>
  )
}
