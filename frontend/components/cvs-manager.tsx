"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Trash2, Upload, FileText, Eye, Info, GraduationCap, Briefcase, Code, Heart, Filter } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/auth-context"


const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface CV {
  id: string
  job_id: string | null
  filename?: string
  score?: any
  created_at: string
  updated_at: string
  extracted: {
    name?: string
    email?: string
    phone?: string
    skills?: string[]
    experience?: string
    education?: string[]
    tech_skills?: string[]
    soft_skills?: string[]
    error?: string
  }
}

interface Job {
  _id: string
  name: string
  description: string
  status: string
}

export function CVsManager() {
  const [cvs, setCvs] = useState<CV[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string>("")
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [filterJobId, setFilterJobId] = useState<string>("all")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [cvToDelete, setCvToDelete] = useState<CV | null>(null)
  const [validationErrors, setValidationErrors] = useState<{ jobId?: boolean; files?: boolean }>({})
  const { toast } = useToast()

  useEffect(() => {
    fetchCVs()
    fetchJobs()
  }, [])

  const fetchCVs = async (jobId?: string) => {
    try {
      const url = jobId && jobId !== "all" ? `${API_URL}/api/cvs/job/${jobId}` : `${API_URL}/api/cvs`

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setCvs(data)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch CVs",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/jobs`)
      if (response.ok) {
        const data = await response.json()
        const mappedJobs = data.items.map((job: any) => ({
          ...job,
          id: job._id,
        }))
        setJobs(mappedJobs)
      }
    } catch (error) {
      console.error("Failed to fetch jobs:", error)
    }
  }

  const handleUpload = async () => {
    const errors: { jobId?: boolean; files?: boolean } = {}

    if (!selectedJobId) {
      errors.jobId = true
    }
    if (!selectedFiles || selectedFiles.length === 0) {
      errors.files = true
    }

    setValidationErrors(errors)

    if (Object.keys(errors).length > 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append("job_id", selectedJobId)

    Array.from(selectedFiles).forEach((file) => {
      formData.append("files", file)
    })

    try {
      const response = await fetch(`${API_URL}/api/cvs`, {
        method: "POST",
        body: formData,
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: `${selectedFiles.length} CV(s) uploaded successfully`,
        })
        setUploadDialogOpen(false)
        setSelectedFiles(null)
        setSelectedJobId("")
        setValidationErrors({})
        fetchCVs(filterJobId === "all" ? undefined : filterJobId)
      } else {
        const error = await response.json()
        toast({
          title: "Error",
          description: error.error || "Failed to upload CVs",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteClick = (cv: CV) => {
    setCvToDelete(cv)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!cvToDelete) return

    try {
      const response = await fetch(`${API_URL}/api/cvs/${cvToDelete.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "CV deleted successfully",
        })
        fetchCVs(filterJobId === "all" ? undefined : filterJobId)
      } else {
        toast({
          title: "Error",
          description: "Failed to delete CV",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to connect to server",
        variant: "destructive",
      })
    } finally {
      setDeleteDialogOpen(false)
      setCvToDelete(null)
    }
  }

  const handleJobFilterChange = (jobId: string) => {
    setFilterJobId(jobId)
    setLoading(true)
    fetchCVs(jobId === "all" ? undefined : jobId)
  }

  const handleViewPDF = (cvId: string) => {
    window.open(`${API_URL}/api/cvs/${cvId}/file`, "_blank")
  }

  const getJobName = (jobId: string | null) => {
    if (!jobId) return "No Job"
    const job = jobs.find((j) => j._id === jobId)
    return job?.name || "Unknown Job"
  }

  if (loading) {
    return <div className="text-center py-8">Loading CVs...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">CVs ({cvs.length})</h2>
          <p className="text-muted-foreground">Manage uploaded candidate CVs</p>
        </div>
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Upload className="h-4 w-4 mr-2" />
              Upload CVs
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload CVs</DialogTitle>
              <DialogDescription>Select a job and upload one or more CV files (PDF format)</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="job-select">Job *</Label>
                <Select
                  value={selectedJobId}
                  onValueChange={(value) => {
                    setSelectedJobId(value)
                    setValidationErrors((prev) => ({ ...prev, jobId: false }))
                  }}
                >
                  <SelectTrigger className={validationErrors.jobId ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job._id} value={job._id}>
                        {job.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.jobId && <p className="text-sm text-red-500 mt-1">Required</p>}
              </div>
              <div>
                <Label htmlFor="cv-files">CV Files *</Label>
                <Input
                  id="cv-files"
                  type="file"
                  multiple
                  accept=".pdf"
                  className={validationErrors.files ? "border-red-500" : ""}
                  onChange={(e) => {
                    setSelectedFiles(e.target.files)
                    setValidationErrors((prev) => ({ ...prev, files: false }))
                  }}
                />
                {validationErrors.files && <p className="text-sm text-red-500 mt-1">Required</p>}
                {selectedFiles && (
                  <p className="text-sm text-muted-foreground mt-1">{selectedFiles.length} file(s) selected</p>
                )}
              </div>
              <Button onClick={handleUpload} disabled={uploading} className="w-full">
                {uploading ? "Uploading..." : "Upload CVs"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Label htmlFor="job-filter">Filter by Job:</Label>
        </div>
        <Select value={filterJobId} onValueChange={handleJobFilterChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Jobs</SelectItem>
            {jobs.map((job) => (
              <SelectItem key={job._id} value={job._id}>
                {job.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {cvs.length > 0 ? (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Creation Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cvs.map((cv, index) => (
                <TableRow key={cv.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="font-medium">{cv.extracted.name || cv.filename || `CV ${cv.id.slice(-6)}`}</div>
                      <div className="flex items-center gap-2">
                        <Badge variant={cv.job_id ? "default" : "secondary"} className="text-xs">
                          {getJobName(cv.job_id)}
                        </Badge>
                        {cv.score && (
                          <Badge variant="outline" className="text-xs">
                            Score: {typeof cv.score === "object" ? "Not yet calculated" : cv.score}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">{new Date(cv.created_at).toLocaleDateString()}</div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Info className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>CV Details</SheetTitle>
                            <SheetDescription>
                              Extracted information from {cv.extracted.name || cv.filename || "CV"}
                            </SheetDescription>
                          </SheetHeader>
                          <div className="mt-6 space-y-6 pb-6">
                            {cv.extracted.error ? (
                              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                                <p className="text-sm text-destructive">{cv.extracted.error}</p>
                              </div>
                            ) : (
                              <>
                                {cv.extracted.education && cv.extracted.education.length > 0 && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <GraduationCap className="h-4 w-4 text-blue-600" />
                                      <h3 className="font-semibold text-blue-600">Education</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {cv.extracted.education.map((edu, index) => (
                                        <Badge key={index} variant="secondary" className="bg-blue-50 text-blue-700">
                                          {edu}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {cv.extracted.experience && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Briefcase className="h-4 w-4 text-green-600" />
                                      <h3 className="font-semibold text-green-600">Experience</h3>
                                    </div>
                                    <div className="p-3 bg-green-50 rounded-lg">
                                      <p className="text-sm text-green-800">{cv.extracted.experience}</p>
                                    </div>
                                  </div>
                                )}

                                {cv.extracted.tech_skills && cv.extracted.tech_skills.length > 0 && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Code className="h-4 w-4 text-purple-600" />
                                      <h3 className="font-semibold text-purple-600">Technical Skills</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {cv.extracted.tech_skills.map((skill, index) => (
                                        <Badge key={index} variant="secondary" className="bg-purple-50 text-purple-700">
                                          {skill}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {cv.extracted.soft_skills && cv.extracted.soft_skills.length > 0 && (
                                  <div className="space-y-3">
                                    <div className="flex items-center gap-2">
                                      <Heart className="h-4 w-4 text-pink-600" />
                                      <h3 className="font-semibold text-pink-600">Soft Skills</h3>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                      {cv.extracted.soft_skills.map((skill, index) => (
                                        <Badge key={index} variant="secondary" className="bg-pink-50 text-pink-700">
                                          {skill}
                                        </Badge>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {cv.extracted.email && (
                                  <div className="space-y-2">
                                    <h3 className="font-semibold text-gray-600">Contact</h3>
                                    <p className="text-sm text-gray-700">{cv.extracted.email}</p>
                                    {cv.extracted.phone && (
                                      <p className="text-sm text-gray-700">{cv.extracted.phone}</p>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>

                      <Button variant="outline" size="sm" onClick={() => handleViewPDF(cv.id)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteClick(cv)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No CVs uploaded</h3>
          <p className="text-muted-foreground mb-4">Upload your first CV to get started with candidate management</p>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload CVs
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete CV</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete the CV for "
              {cvToDelete?.extracted.name || cvToDelete?.filename || "this candidate"}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete CV
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
