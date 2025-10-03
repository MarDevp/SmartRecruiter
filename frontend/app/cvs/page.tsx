import { AppLayout } from "@/components/app-layout"
import { CVsManager } from "@/components/cvs-manager"

export default function CVsPage() {
  return (
    <AppLayout>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">CV Management</h1>
        <p className="text-muted-foreground">Upload and manage candidate CVs</p>
      </div>
      <CVsManager />
    </AppLayout>
  )
}
