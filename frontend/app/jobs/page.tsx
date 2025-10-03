import { AppLayout } from "@/components/app-layout"
import { JobsManager } from "@/components/jobs-manager"

export default function JobsPage() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Job Management</h1>
        <p className="text-muted-foreground">Create and manage job postings for CV scoring</p>
      </div>
      <JobsManager />
    </AppLayout>
  )
}
