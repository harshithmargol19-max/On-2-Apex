import { api } from "@/library/api";

export interface JobOut {
  id: string;
  title: string;
  company: string;
  normalized_company: string;
  normalized_title: string;
  location: string | null;
  description: string | null;
  url: string | null;
  source: string;
  posted_at: string | null;
  experience_level: string | null;
  skills: string[];
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  is_saved: boolean;
  created_at: string;
}

export interface JobListOut {
  total: number;
  items: JobOut[];
}

export interface JobSearchQuery {
  role: string;
  location?: string;
  keywords?: string[];
  experience?: string;
  limit?: number;
  sources?: string[];
  country?: string;
  is_remote?: boolean;
}

export interface JobSearchResult {
  total_found: number;
  new_added: number;
  sources_status: Record<string, unknown>;
  jobs: JobOut[];
}

export interface JDAnalyzeRequest {
  job_id?: string;
  raw_jd?: string;
  force_refresh?: boolean;
}

export interface StructuredRequirementsOut {
  id: string;
  job_id: string | null;
  role: string;
  required_skills: string[];
  preferred_skills: string[];
  education_requirements: string[];
  experience_requirements: string[];
  responsibilities: string[];
  tools: string[];
  interview_topics: string[];
  model_used: string;
  prompt_version: string;
  cached: boolean;
  created_at: string;
}

export const jobService = {
  async searchJobs(query: JobSearchQuery): Promise<JobSearchResult> {
    return await api.post<JobSearchResult>("/jobs/search", query);
  },

  async listJobs(params?: {
    role?: string;
    location?: string;
    company?: string;
    search?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }): Promise<JobListOut> {
    const queryParts: string[] = [];
    if (params?.role) queryParts.push(`role=${encodeURIComponent(params.role)}`);
    if (params?.location) queryParts.push(`location=${encodeURIComponent(params.location)}`);
    if (params?.company) queryParts.push(`company=${encodeURIComponent(params.company)}`);
    if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);
    if (params?.source && params.source.toLowerCase() !== "all") {
      queryParts.push(`source=${encodeURIComponent(params.source)}`);
    }
    if (params?.limit !== undefined) queryParts.push(`limit=${params.limit}`);
    if (params?.offset !== undefined) queryParts.push(`offset=${params.offset}`);

    const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
    return await api.get<JobListOut>(`/jobs${qs}`);
  },

  async getSavedJobs(): Promise<JobOut[]> {
    return await api.get<JobOut[]>("/jobs/saved");
  },

  async getJobById(jobId: string): Promise<JobOut> {
    return await api.get<JobOut>(`/jobs/${jobId}`);
  },

  async saveJob(jobId: string): Promise<{ status: string; message: string }> {
    return await api.post<{ status: string; message: string }>(`/jobs/${jobId}/save`);
  },

  async unsaveJob(jobId: string): Promise<{ status: string; message: string }> {
    return await api.delete<{ status: string; message: string }>(`/jobs/${jobId}/save`);
  },

  async analyzeJobDescription(payload: JDAnalyzeRequest): Promise<StructuredRequirementsOut> {
    return await api.post<StructuredRequirementsOut>("/jobs/analyze", payload);
  },

  async getJobAnalysis(jobId: string): Promise<StructuredRequirementsOut> {
    return await api.get<StructuredRequirementsOut>(`/jobs/${jobId}/analysis`);
  },
};
