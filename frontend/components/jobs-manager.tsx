"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  Loader2,
  RefreshCw,
  GraduationCap,
  Briefcase,
  Users,
  Code,
  Lightbulb,
} from "lucide-react"

interface Job {
  _id: string
  id?: string // Keep for backward compatibility
  name: string
  description: string
  status: "open" | "closed"
  created_at: string
  updated_at: string
  extracted?: {
    education?: string[]
    experiences?: string[]
    responsabilities?: string[]
    soft_skills?: string[]
    tech_skills?: string[]
  }
  extraction?: {
    status: "succeeded" | "failed"
    error?: string
  }
}

interface JobsResponse {
  items: Job[]
  page: number
  limit: number
  total: number
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

export function JobsManager() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalJobs, setTotalJobs] = useState(0)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [formData, setFormData] = useState({ name: "", description: "", status: "open" as "open" | "closed" })
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  const limit = 10

  const fetchJobs = async (page = 1, query = "") => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...(query && { q: query }),
      })

      const response = await fetch(`${API_BASE_URL}/jobs?${params}`)
      if (!response.ok) throw new Error("Failed to fetch jobs")

      const data: JobsResponse = await response.json()
      const mappedJobs = data.items.map((job) => ({
        ...job,
        id: job._id || job.id, // Use _id from API, fallback to id if exists
      }))
      setJobs(mappedJobs)
      setTotalJobs(data.total)
      setCurrentPage(data.page)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch jobs",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const createJob = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`${API_BASE_URL}/jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) throw new Error("Failed to create job")

      toast({
        title: "Success",
        description: "Job created successfully",
      })

      setIsCreateDialogOpen(false)
      setFormData({ name: "", description: "", status: "open" })
      fetchJobs(currentPage, searchQuery)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create job",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const updateJob = async () => {
    if (!selectedJob || !formData.name.trim() || !formData.description.trim()) return

    try {
      setSubmitting(true)
      const jobId = selectedJob._id || selectedJob.id
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          status: formData.status,
        }),
      })

      if (!response.ok) throw new Error("Failed to update job")

      toast({
        title: "Success",
        description: "Job updated successfully",
      })

      setIsEditDialogOpen(false)
      setSelectedJob(null)
      setFormData({ name: "", description: "", status: "open" })
      fetchJobs(currentPage, searchQuery)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const deleteJob = async (job: Job) => {
    try {
      const jobId = job._id || job.id
      console.log("[v0] Deleting job with ID:", jobId) // Debug log
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}`, {
        method: "DELETE",
      })

      if (!response.ok) throw new Error("Failed to delete job")

      toast({
        title: "Success",
        description: "Job deleted successfully",
      })

      fetchJobs(currentPage, searchQuery)
    } catch (error) {
      console.log("[v0] Delete error:", error) // Debug log
      toast({
        title: "Error",
        description: "Failed to delete job",
        variant: "destructive",
      })
    }
  }

  const extractJobRequirements = async (job: Job) => {
    try {
      const jobId = job._id || job.id
      const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/extract`, {
        method: "POST",
      })

      if (!response.ok) throw new Error("Failed to extract job requirements")

      const data = await response.json()
      toast({
        title: "Success",
        description: "Job requirements extracted successfully",
      })

      fetchJobs(currentPage, searchQuery)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to extract job requirements",
        variant: "destructive",
      })
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setCurrentPage(1)
    fetchJobs(1, searchQuery)
  }

  const handleEdit = (job: Job) => {
    setSelectedJob(job)
    setFormData({ name: job.name, description: job.description, status: job.status })
    setIsEditDialogOpen(true)
  }

  const handleView = (job: Job) => {
    setSelectedJob(job)
    setIsViewSheetOpen(true)
  }

  const renderExtractedSection = (title: string, items: string[] | undefined, icon: React.ReactNode) => {
    if (!items || items.length === 0) return null

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          {icon}
          <h4 className="font-semibold text-sm">{title}</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {items.map((item, index) => (
       

            <Badge
  key={index}
  variant="secondary"
  className={`text-xs ${
    title === "Technical Skills"
      ? "bg-blue-600 text-white"
      : title === "Experience"
      ? "bg-green-600 text-white"
      : title === "Soft Skills"
      ? "bg-orange-500 text-white"
      : title === "Education"
      ? "bg-sky-500 text-white"
      : ""
  }`}
>
  {item}
</Badge>



          ))}
        </div>
      </div>
    )
  }

  const totalPages = Math.ceil(totalJobs / limit)

  useEffect(() => {
    fetchJobs()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 max-w-md">
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" variant="outline" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Job
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Job</DialogTitle>
              <DialogDescription>Add a new job posting with name and description</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Job Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Senior Frontend Developer"
                />
              </div>
              <div>
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter detailed job description, requirements, and qualifications..."
                  rows={8}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createJob} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Job
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Jobs List */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No jobs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {jobs.map((job) => (
            <Card key={job._id || job.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{job.name}</CardTitle>
                    <CardDescription>
                      Created: {new Date(job.created_at).toLocaleDateString()}
                      {job.updated_at !== job.created_at && (
                        <span> • Updated: {new Date(job.updated_at).toLocaleDateString()}</span>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={job.status === "open" ? "default" : "secondary"}>{job.status}</Badge>
                    {job.extraction && (
                      <Badge variant={job.extraction.status === "succeeded" ? "default" : "destructive"}>
                        {job.extraction.status === "succeeded" ? "Extracted" : "Failed"}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{job.description}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleView(job)}>
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(job)}>
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => extractJobRequirements(job)}>
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Extract
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Job</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{job.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteJob(job)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            onClick={() => fetchJobs(currentPage - 1, searchQuery)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4 text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            onClick={() => fetchJobs(currentPage + 1, searchQuery)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Job</DialogTitle>
            <DialogDescription>Update the job information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Job Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="edit-description">Job Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={8}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="status-toggle"
                checked={formData.status === "open"}
                onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? "open" : "closed" })}
              />
              <Label htmlFor="status-toggle">
                Job Status:{" "}
                <Badge variant={formData.status === "open" ? "default" : "secondary"}>{formData.status}</Badge>
              </Label>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={updateJob} disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Update Job
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Sheet */}
      <Sheet open={isViewSheetOpen} onOpenChange={setIsViewSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedJob?.name}</SheetTitle>
            <SheetDescription>Job details and extracted requirements</SheetDescription>
          </SheetHeader>
          {selectedJob && (
            <div className="space-y-6 mt-6">
              <div className="flex items-center gap-2">
                <Label>Status:</Label>
                <Badge variant={selectedJob.status === "open" ? "default" : "secondary"}>{selectedJob.status}</Badge>
              </div>

              <div>
                <Label className="text-sm font-semibold">Description</Label>
                <div className="mt-2 p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                  {selectedJob.description}
                </div>
              </div>

              {selectedJob.extracted && (
                <div className="space-y-4">
                  <Label className="text-sm font-semibold">Extracted Requirements</Label>

                  {renderExtractedSection(
                    "Education",
                    selectedJob.extracted.education,
                    <GraduationCap className="h-4 w-4 text-blue-600" />,
                  )}

                  {renderExtractedSection(
                    "Experience",
                    selectedJob.extracted.experiences,
                    <Briefcase className="h-4 w-4 text-green-600" />,
                  )}

                  {renderExtractedSection(
                    "Responsibilities",
                    selectedJob.extracted.responsabilities,
                    <Users className="h-4 w-4 text-purple-600" />,
                  )}

                  {renderExtractedSection(
                    "Technical Skills",
                    selectedJob.extracted.tech_skills,
                    <Code className="h-4 w-4 text-orange-600" />,
                  )}

                  {renderExtractedSection(
                    "Soft Skills",
                    selectedJob.extracted.soft_skills,
                    <Lightbulb className="h-4 w-4 text-yellow-600" />,
                  )}
                </div>
              )}

              {selectedJob.extraction?.error && (
                <div>
                  <Label className="text-sm font-semibold">Extraction Error</Label>
                  <div className="mt-2 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
                    {selectedJob.extraction.error}
                  </div>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-4 border-t">
                <div>Created: {new Date(selectedJob.created_at).toLocaleString()}</div>
                <div>Updated: {new Date(selectedJob.updated_at).toLocaleString()}</div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Toaster />
    </div>
  )
}
