import { api } from "@/library/api";

export interface ResumeDiffItem {
  section: string;
  item_id?: string | null;
  original: string;
  tailored: string;
  explanation: string;
  keywords_added: string[];
}

export interface ResumeGenerateRequest {
  job_id: string;
  custom_position?: string;
  custom_instructions?: string;
}

export interface ResumeUpdateRequest {
  position?: string;
  tags?: string[];
  applied_companies?: string[];
  content?: Record<string, unknown>;
  status?: string;
}

export interface ResumeApplyRequest {
  company_name: string;
}

export interface GeneratedResumeBrief {
  id: string;
  user_id: string;
  job_id?: string | null;
  position: string;
  tags: string[];
  applied_companies: string[];
  status: string;
  diffs_count: number;
  created_at: string;
}

export interface GeneratedResumeOut {
  id: string;
  user_id: string;
  job_id?: string | null;
  position: string;
  tags: string[];
  applied_companies: string[];
  content: Record<string, unknown>;
  markdown: string;
  latex: string;
  diffs: ResumeDiffItem[];
  status: string;
  created_at: string;
  updated_at?: string | null;
}

export interface ResumeAnalysisOut {
  interview_readiness_score: number;
  short_description: string;
  technical_depth_score: number;
  impact_score: number;
  ats_score: number;
  strengths: string[];
  improvements: string[];
  interview_topics: string[];
  extracted_markdown?: string | null;
  candidate_name?: string | null;
  analyzed_at: string;
}

export interface PdfCompilerStatusOut {
  available: boolean;
  engine: string;
  version?: string | null;
  instructions?: string | null;
}

export const resumeService = {
  async generateResume(payload: ResumeGenerateRequest): Promise<GeneratedResumeOut> {
    return await api.post<GeneratedResumeOut>("/resumes/generate", payload);
  },

  async listResumes(params?: {
    tag?: string;
    position?: string;
  }): Promise<GeneratedResumeBrief[]> {
    const parts: string[] = [];
    if (params?.tag) parts.push(`tag=${encodeURIComponent(params.tag)}`);
    if (params?.position) parts.push(`position=${encodeURIComponent(params.position)}`);
    const qs = parts.length > 0 ? `?${parts.join("&")}` : "";
    return await api.get<GeneratedResumeBrief[]>(`/resumes${qs}`);
  },

  async getResumeById(resumeId: string): Promise<GeneratedResumeOut> {
    return await api.get<GeneratedResumeOut>(`/resumes/${resumeId}`);
  },

  async updateResume(
    resumeId: string,
    payload: ResumeUpdateRequest
  ): Promise<GeneratedResumeOut> {
    return await api.put<GeneratedResumeOut>(`/resumes/${resumeId}`, payload);
  },

  async recordApplication(
    resumeId: string,
    payload: ResumeApplyRequest
  ): Promise<GeneratedResumeOut> {
    return await api.post<GeneratedResumeOut>(`/resumes/${resumeId}/apply`, payload);
  },

  async deleteResume(resumeId: string): Promise<void> {
    await api.delete<void>(`/resumes/${resumeId}`);
  },

  async analyzeResumeFile(file: File, targetPosition?: string): Promise<ResumeAnalysisOut> {
    const form = new FormData();
    form.append("file", file);
    if (targetPosition) form.append("target_position", targetPosition);
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/v1/resumes/analyze-upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || `Analysis failed (${res.status})`);
    }
    return res.json();
  },

  async analyzeExistingResume(resumeId: string): Promise<ResumeAnalysisOut> {
    return await api.post<ResumeAnalysisOut>(`/resumes/${resumeId}/analyze`, {});
  },

  async getPdfStatus(): Promise<PdfCompilerStatusOut> {
    return await api.get<PdfCompilerStatusOut>("/resumes/pdf-status");
  },

  getResumePdfUrl(resumeId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    return `${baseUrl}/api/v1/resumes/${resumeId}/pdf`;
  },

  async downloadResumePdfBlob(resumeId: string): Promise<Blob> {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const url = this.getResumePdfUrl(resumeId);
    const res = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.detail || `PDF generation failed (${res.status})`);
    }
    return await res.blob();
  },
};


