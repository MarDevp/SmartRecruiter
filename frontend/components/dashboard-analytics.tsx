"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Users, Briefcase, TrendingUp, Eye } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useToast } from "@/hooks/use-toast"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"

interface JobStats {
  total_jobs: number
}

interface CVsPerJob {
  cvs_count: number
  job_id: string
  job_name: string
}

interface BestCV {
  cv_id: string
  name: string | null
  score: number
  subscores: {
    education: { score: number; short_justification: string }
    experience: { score: number; short_justification: string }
    soft_skills: { score: number; short_justification: string }
    tech_skills: { score: number; short_justification: string }
  }
}

interface BestCVPerJob {
  best_cv: BestCV
  job_id: string
  job_name: string
}

interface JobAverageScore {
  average_score: number | null
  cv_count_scored: number
  job: {
    id: string
    name: string
    description: string
    status: string
    created_at: string
    updated_at: string
  }
}

export function DashboardAnalytics() {
  const [jobStats, setJobStats] = useState<JobStats | null>(null)
  const [cvsPerJob, setCvsPerJob] = useState<CVsPerJob[]>([])
  const [bestCVs, setBestCVs] = useState<BestCVPerJob[]>([])
  const [jobAverageScores, setJobAverageScores] = useState<JobAverageScore[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      await Promise.all([fetchJobStats(), fetchCVsPerJob(), fetchBestCVs(), fetchJobAverageScores()])
    } catch (error) {
      console.error("Error fetching dashboard data:", error)
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchJobStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats/jobs/count`)
      if (!response.ok) throw new Error("Failed to fetch job stats")
      const data = await response.json()
      setJobStats(data)
    } catch (error) {
      console.error("Error fetching job stats:", error)
      setJobStats({ total_jobs: 0 })
    }
  }

  const fetchCVsPerJob = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/stats/cvs-per-job`)
      if (!response.ok) throw new Error("Failed to fetch CVs per job")
      const data = await response.json()
      const validData = Array.isArray(data)
        ? data.filter((item) => item && typeof item.cvs_count === "number" && !isNaN(item.cvs_count))
        : []
      setCvsPerJob(validData)
    } catch (error) {
      console.error("Error fetching CVs per job:", error)
      setCvsPerJob([])
    }
  }

  const fetchBestCVs = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/best_cv_per_job`)
      if (!response.ok) throw new Error("Failed to fetch best CVs")
      const data = await response.json()
      const validData = Array.isArray(data)
        ? data.filter(
            (item) => item && item.best_cv && typeof item.best_cv.score === "number" && !isNaN(item.best_cv.score),
          )
        : []
      setBestCVs(validData)
    } catch (error) {
      console.error("Error fetching best CVs:", error)
      setBestCVs([])
    }
  }

  const fetchJobAverageScores = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/dashboard/jobs/average-score`)
      if (!response.ok) throw new Error("Failed to fetch job average scores")
      const data = await response.json()
      const validData = Array.isArray(data)
        ? data.filter(
            (item) =>
              item &&
              item.job &&
              (item.average_score === null || (typeof item.average_score === "number" && !isNaN(item.average_score))),
          )
        : []
      setJobAverageScores(validData)
    } catch (error) {
      console.error("Error fetching job average scores:", error)
      setJobAverageScores([])
    }
  }

  const openPDF = (cvId: string) => {
    window.open(`${API_BASE_URL}/api/cvs/${cvId}/file`, "_blank")
  }

  const formatScore = (score: number | null | undefined) => {
    if (score === null || score === undefined || isNaN(score)) return "Not calculated"
    return (score * 100).toFixed(1) + "%"
  }

  const getScoreColor = (score: number | null | undefined) => {
    if (score === null || score === undefined || isNaN(score)) return "text-red-500"
    if (score >= 0.9) return "text-green-600" // 90-100% - Excellent (Green)
    if (score >= 0.7) return "text-blue-600" // 70-89% - Good (Blue)
    if (score >= 0.5) return "text-yellow-600" // 50-69% - Fair (Yellow)
    return "text-red-500" // Below 50% - Poor (Red)
  }

  const getScoreBadgeVariant = (
    score: number | null | undefined,
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (score === null || score === undefined || isNaN(score)) return "destructive"
    if (score >= 0.95) return "default" // 95-100% - Excellent (Green)
    if (score >= 0.9) return "secondary" // 90-94% - Very Good (Blue/Gray)
    if (score >= 0.8) return "outline" // 80-89% - Good (Yellow outline)
    if (score >= 0.7) return "outline" // 70-79% - Fair (Yellow outline)
    if (score >= 0.6) return "outline" // 60-69% - Poor (Yellow outline)
    return "destructive" // Below 60% - Very Poor (Red)
  }

  const getModernBadgeClass = (score: number | null | undefined): string => {
    if (score === null || score === undefined || isNaN(score)) {
      return "bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm"
    }
    if (score >= 0.95) {
      return "bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0 shadow-lg"
    }
    if (score >= 0.9) {
      return "bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0 shadow-md"
    }
    if (score >= 0.8) {
      return "bg-gradient-to-r from-blue-400 to-blue-600 text-white border-0 shadow-md"
    }
    if (score >= 0.7) {
      return "bg-gradient-to-r from-indigo-400 to-blue-500 text-white border-0 shadow-sm"
    }
    if (score >= 0.6) {
      return "bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 shadow-sm"
    }
    if (score >= 0.5) {
      return "bg-gradient-to-r from-orange-400 to-red-500 text-white border-0 shadow-sm"
    }
    return "bg-gradient-to-r from-red-500 to-red-600 text-white border-0 shadow-sm"
  }

  const totalCVs = cvsPerJob.reduce((sum, job) => {
    const count = typeof job.cvs_count === "number" && !isNaN(job.cvs_count) ? job.cvs_count : 0
    return sum + count
  }, 0)

  const chartData = jobAverageScores
    .filter((job) => job.average_score !== null && job.average_score !== undefined)
    .map((job) => ({
      name: job.job.name,
      average_score: job.average_score,
      cv_count: job.cv_count_scored,
    }))

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                <p className="text-3xl font-bold">{jobStats?.total_jobs || 0}</p>
              </div>
              <Briefcase className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total CVs</p>
                <p className="text-3xl font-bold">{totalCVs}</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Jobs with CVs</p>
                <p className="text-3xl font-bold">{cvsPerJob.length}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CVs per Job Chart */}
        <Card>
          <CardHeader>
            <CardTitle>CVs per Job</CardTitle>
            <CardDescription>Distribution of CVs across different job positions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cvsPerJob}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="job_name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="cvs_count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Job Average Scores Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Job Average Scores</CardTitle>
            <CardDescription>Average CV scores for jobs with scored candidates</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} fontSize={12} />
                  <YAxis domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                  <Tooltip
                    formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Average Score"]}
                    labelFormatter={(label) => `Job: ${label}`}
                  />
                  <Bar dataKey="average_score" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">No jobs with scored CVs available</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Best Performing CVs per Job section */}
      {bestCVs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Best Performing CVs per Job</CardTitle>
            <CardDescription>Top-scoring candidates for each job position</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Job Position</TableHead>
                  <TableHead>Candidate Name</TableHead>
                  <TableHead>Overall Score</TableHead>
                  <TableHead>Education</TableHead>
                  <TableHead>Experience</TableHead>
                  <TableHead>Tech Skills</TableHead>
                  <TableHead>Soft Skills</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bestCVs.map((item) => (
                  <TableRow key={item.job_id}>
                    <TableCell className="font-medium">{item.job_name}</TableCell>
                    <TableCell>{item.best_cv.name || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getModernBadgeClass(item.best_cv.score)}>
                        {formatScore(item.best_cv.score)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getModernBadgeClass(item.best_cv.subscores.education.score)}>
                        {formatScore(item.best_cv.subscores.education.score)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getModernBadgeClass(item.best_cv.subscores.experience.score)}>
                        {formatScore(item.best_cv.subscores.experience.score)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getModernBadgeClass(item.best_cv.subscores.tech_skills.score)}
                      >
                        {formatScore(item.best_cv.subscores.tech_skills.score)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getModernBadgeClass(item.best_cv.subscores.soft_skills.score)}
                      >
                        {formatScore(item.best_cv.subscores.soft_skills.score)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => openPDF(item.best_cv.cv_id)}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground h-10 w-10"
                        title="View PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
