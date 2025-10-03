"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, Loader2, Calculator } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface Job {
  _id: string
  name: string
  description: string
  status: string
  created_at: string
  updated_at: string
}

interface CV {
  id: string
  filename: string
  job_id: string
  score: number | null | undefined
  subscores: {
    education: { score: number; short_justification: string }
    experience: { score: number; short_justification: string }
    soft_skills: { score: number; short_justification: string }
    tech_skills: { score: number; short_justification: string }
  } | null
  extracted: {
    name: string
    education: string[]
    experiences: string[]
    soft_skills: string[]
    tech_skills: string[]
    responsabilities: string[]
    summary: string
  }
  created_at: string
  updated_at: string
}

export function MatchingManager() {
  const [jobs, setJobs] = useState<Job[]>([])
  const [selectedJobId, setSelectedJobId] = useState<string>("")
  const [cvs, setCvs] = useState<CV[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const { toast } = useToast()

  // Fetch jobs on component mount
  useEffect(() => {
    fetchJobs()
  }, [])

  // Fetch CVs when job is selected
  useEffect(() => {
    if (selectedJobId) {
      fetchCVsForJob(selectedJobId)
    } else {
      setCvs([])
    }
  }, [selectedJobId])

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/jobs`)
      if (response.ok) {
        const data = await response.json()
        setJobs(data.items || [])
      }
    } catch (error) {
      console.error("Error fetching jobs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch jobs",
        variant: "destructive",
      })
    }
  }

  const fetchCVsForJob = async (jobId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/cvs/job/${jobId}`)
      if (response.ok) {
        const data = await response.json()
        setCvs(data || [])
      }
    } catch (error) {
      console.error("Error fetching CVs:", error)
      toast({
        title: "Error",
        description: "Failed to fetch CVs for selected job",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const generateScores = async () => {
    if (!selectedJobId) {
      toast({
        title: "Error",
        description: "Please select a job first",
        variant: "destructive",
      })
      return
    }

    setGenerating(true)
    toast({
      title: "Processing Started",
      description: "Score generation may take a few minutes. Please wait...",
    })

    try {
      const response = await fetch(`${API_BASE_URL}/api/matchings/generate_scores/${selectedJobId}`)

      if (response.ok) {
        const data = await response.json()

        if (data.message && data.message.includes("No new CVs")) {
          toast({
            title: "No Action Needed",
            description: "All CVs for this job already have calculated scores",
          })
        } else if (data.cvs && data.cvs.length > 0) {
          toast({
            title: "Success",
            description: `Scores generated for ${data.cvs.length} CV(s)`,
          })
        } else {
          toast({
            title: "Completed",
            description: "Score generation process completed",
          })
        }

        // Reload CVs to get updated scores
        await fetchCVsForJob(selectedJobId)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Server error: ${response.status}`)
      }
    } catch (error) {
      console.error("Error generating scores:", error)
      toast({
        title: "Score Generation Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred. Some scores may have been partially generated.",
        variant: "destructive",
      })

      try {
        await fetchCVsForJob(selectedJobId)
      } catch (reloadError) {
        console.error("Error reloading CVs after failed generation:", reloadError)
      }
    } finally {
      setGenerating(false)
    }
  }

  const isEmptyObject = (obj: any) => {
    return obj && typeof obj === "object" && Object.keys(obj).length === 0
  }

  const formatScore = (score: number | null | undefined | {}) => {
    if (score === null || score === undefined || isEmptyObject(score)) {
      return <span className="text-red-500 font-medium">Not calculated</span>
    }
    return <span className="font-medium">{((score as number) * 100).toFixed(1)}%</span>
  }

  const getScoreColor = (score: number | null | undefined | {}) => {
    if (score === null || score === undefined || isEmptyObject(score)) return "bg-gray-100 text-gray-800"
    const numScore = score as number
    if (numScore >= 0.7) return "bg-green-100 text-green-800"
    if (numScore >= 0.4) return "bg-yellow-100 text-yellow-800"
    return "bg-red-100 text-red-800"
  }

  return (
    <div className="space-y-6">
      {/* Job Selection and Generate Scores */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium">Select Job</label>
          <Select value={selectedJobId} onValueChange={setSelectedJobId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a job to analyze CVs" />
            </SelectTrigger>
            <SelectContent>
              {jobs.map((job) => (
                <SelectItem key={job._id} value={job._id}>
                  {job.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={generateScores} disabled={!selectedJobId || generating} className="flex items-center gap-2">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
          {generating ? "Processing (may take a few minutes)..." : "Generate Scores"}
        </Button>
      </div>

      {/* CVs Table */}
      {selectedJobId && (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    Loading CVs...
                  </TableCell>
                </TableRow>
              ) : cvs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No CVs found for this job
                  </TableCell>
                </TableRow>
              ) : (
                cvs.map((cv, index) => (
                  <TableRow key={cv.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell className="font-medium">{cv.extracted?.name || "Unknown"}</TableCell>
                    <TableCell>{new Date(cv.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{formatScore(cv.score)}</TableCell>
                    <TableCell>
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                          <SheetHeader>
                            <SheetTitle>CV Scoring Details</SheetTitle>
                          </SheetHeader>
                          <div className="mt-6 space-y-6">
                            {/* Overall Score */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                  Overall Score
                                  <Badge
                                    className={
                                      cv.score !== null && cv.score !== undefined && !isEmptyObject(cv.score)
                                        ? getScoreColor(cv.score)
                                        : "bg-gray-100 text-gray-800"
                                    }
                                  >
                                    {cv.score !== null && cv.score !== undefined && !isEmptyObject(cv.score)
                                      ? `${((cv.score as number) * 100).toFixed(1)}%`
                                      : "Not calculated"}
                                  </Badge>
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground">
                                  Candidate: <span className="font-medium">{cv.extracted?.name || "Unknown"}</span>
                                </p>
                              </CardContent>
                            </Card>

                            {/* Subscores */}
                            {cv.subscores && !isEmptyObject(cv.subscores) ? (
                              <div className="space-y-4">
                                <h3 className="text-lg font-semibold">Detailed Scores</h3>

                                {/* Education Score */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center justify-between text-base">
                                      Education
                                      <Badge className={getScoreColor(cv.subscores.education.score)}>
                                        {(cv.subscores.education.score * 100).toFixed(1)}%
                                      </Badge>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {cv.subscores.education.short_justification}
                                    </p>
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">CV Education:</p>
                                      {cv.extracted?.education?.map((edu, idx) => (
                                        <p key={idx} className="text-xs bg-muted p-2 rounded">
                                          {edu}
                                        </p>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Experience Score */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center justify-between text-base">
                                      Experience
                                      <Badge className={getScoreColor(cv.subscores.experience.score)}>
                                        {(cv.subscores.experience.score * 100).toFixed(1)}%
                                      </Badge>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {cv.subscores.experience.short_justification}
                                    </p>
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">CV Experience:</p>
                                      {cv.extracted?.experiences?.map((exp, idx) => (
                                        <p key={idx} className="text-xs bg-muted p-2 rounded">
                                          {exp}
                                        </p>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Soft Skills Score */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center justify-between text-base">
                                      Soft Skills
                                      <Badge className={getScoreColor(cv.subscores.soft_skills.score)}>
                                        {(cv.subscores.soft_skills.score * 100).toFixed(1)}%
                                      </Badge>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {cv.subscores.soft_skills.short_justification}
                                    </p>
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">CV Soft Skills:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {cv.extracted?.soft_skills?.map((skill, idx) => (
                                          <Badge key={idx} variant="secondary" className="text-xs">
                                            {skill}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>

                                {/* Tech Skills Score */}
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="flex items-center justify-between text-base">
                                      Technical Skills
                                      <Badge className={getScoreColor(cv.subscores.tech_skills.score)}>
                                        {(cv.subscores.tech_skills.score * 100).toFixed(1)}%
                                      </Badge>
                                    </CardTitle>
                                  </CardHeader>
                                  <CardContent>
                                    <p className="text-sm text-muted-foreground mb-3">
                                      {cv.subscores.tech_skills.short_justification}
                                    </p>
                                    <div className="space-y-1">
                                      <p className="text-xs font-medium text-muted-foreground">CV Technical Skills:</p>
                                      <div className="flex flex-wrap gap-1">
                                        {cv.extracted?.tech_skills?.length > 0 ? (
                                          cv.extracted.tech_skills.map((skill, idx) => (
                                            <Badge key={idx} variant="secondary" className="text-xs">
                                              {skill}
                                            </Badge>
                                          ))
                                        ) : (
                                          <p className="text-xs text-muted-foreground">No technical skills found</p>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              </div>
                            ) : (
                              <Card>
                                <CardContent className="pt-6">
                                  <div className="text-center py-8">
                                    <p className="text-muted-foreground">No detailed scores available</p>
                                    <p className="text-sm text-muted-foreground mt-2">
                                      Click "Generate Scores" to calculate detailed scoring breakdown
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            )}
                          </div>
                        </SheetContent>
                      </Sheet>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}

export default MatchingManager
