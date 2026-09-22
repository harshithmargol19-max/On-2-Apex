import { api } from "@/library/api";

export type SuggestionType =
  | "PROJECT_ENHANCEMENT"
  | "DSA_PRACTICE"
  | "STACK_EXPANSION"
  | "RESUME_OPTIMIZATION";

export interface SmartSuggestion {
  type: SuggestionType;
  title: string;
  action: string;
  impact: string;
}

export interface MatchedSkillDetail {
  skill: string;
  canonical_name: string;
  evidence_source: string;
  source_type: string;
}

export interface ScoreBreakdown {
  required_skills_pct?: number;
  preferred_skills_pct?: number;
  project_evidence_score?: number;
  experience_score?: number;
  education_score?: number;
  weights?: {
    required_skills?: number;
    preferred_skills?: number;
    project_evidence?: number;
    experience?: number;
    education?: number;
  };
  [key: string]: unknown;
}

export interface JobMatchRequest {
  force_recompute?: boolean;
}

export interface JobMatchOut {
  id: string;
  user_id: string;
  job_id: string;
  job_analysis_id: string | null;
  match_score: number;
  score_breakdown: ScoreBreakdown;
  matched_skills: MatchedSkillDetail[];
  missing_skills: string[];
  improvement_explanation: string;
  smart_suggestions: SmartSuggestion[];
  interview_topics: string[];
  created_at: string;
}

export const jobMatchService = {
  async compareStudentToJob(
    jobId: string,
    payload: JobMatchRequest = {}
  ): Promise<JobMatchOut> {
    return await api.post<JobMatchOut>(`/jobs/${jobId}/compare`, payload);
  },

  async getJobMatch(jobId: string): Promise<JobMatchOut> {
    return await api.get<JobMatchOut>(`/jobs/${jobId}/match`);
  },
};
