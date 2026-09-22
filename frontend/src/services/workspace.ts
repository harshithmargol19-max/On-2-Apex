import { api } from "@/library/api";

export type ApplicationStage =
  | "WISHLIST"
  | "APPLIED"
  | "OA_SCHEDULED"
  | "INTERVIEWING"
  | "OFFER"
  | "REJECTED"
  | "WITHDRAWN";

export type ApplicationEventType =
  | "STAGE_CHANGE"
  | "NOTE_ADDED"
  | "INTERVIEW_SCHEDULED"
  | "OA_DEADLINE"
  | "OFFER_RECEIVED"
  | "REJECTION_RECEIVED"
  | "STATUS_UPDATE";

export interface ApplicationCreateRequest {
  company: string;
  role: string;
  job_id?: string | null;
  resume_id?: string | null;
  stage?: ApplicationStage;
  job_url?: string | null;
  salary?: string | null;
  location?: string | null;
  notes?: string | null;
  deadline?: string | null;
  applied_at?: string | null;
}

export interface ApplicationUpdateRequest {
  company?: string;
  role?: string;
  job_id?: string | null;
  resume_id?: string | null;
  job_url?: string | null;
  salary?: string | null;
  location?: string | null;
  notes?: string | null;
  deadline?: string | null;
  applied_at?: string | null;
}

export interface ApplicationStageUpdateRequest {
  stage: ApplicationStage;
  note?: string | null;
}

export interface ApplicationEventCreateRequest {
  event_type: ApplicationEventType;
  title: string;
  description?: string | null;
  event_date?: string | null;
}

export interface ApplicationEventOut {
  id: string;
  application_id: string;
  user_id: string;
  event_type: string;
  title: string;
  description?: string | null;
  event_date: string;
  created_at: string;
}

export interface ApplicationBrief {
  id: string;
  company: string;
  role: string;
  stage: ApplicationStage | string;
  job_id?: string | null;
  resume_id?: string | null;
  salary?: string | null;
  location?: string | null;
  deadline?: string | null;
  applied_at?: string | null;
  events_count: number;
  created_at: string;
}

export interface ApplicationOut {
  id: string;
  user_id: string;
  job_id?: string | null;
  resume_id?: string | null;
  company: string;
  role: string;
  stage: ApplicationStage | string;
  job_url?: string | null;
  salary?: string | null;
  location?: string | null;
  notes?: string | null;
  deadline?: string | null;
  applied_at?: string | null;
  events: ApplicationEventOut[];
  created_at: string;
  updated_at?: string | null;
}

export interface WorkspaceBoardOut {
  total_applications: number;
  stages: Record<string, ApplicationBrief[]>;
}

export interface UpcomingDeadlineOut {
  application_id: string;
  company: string;
  role: string;
  stage: string;
  title: string;
  deadline_date: string;
  event_type: string;
}

export const workspaceService = {
  async getBoard(): Promise<WorkspaceBoardOut> {
    return await api.get<WorkspaceBoardOut>("/workspace/board");
  },

  async createApplication(
    payload: ApplicationCreateRequest
  ): Promise<ApplicationOut> {
    return await api.post<ApplicationOut>("/workspace/applications", payload);
  },

  async listApplications(params?: {
    stage?: string;
    company?: string;
    search?: string;
  }): Promise<ApplicationBrief[]> {
    const parts: string[] = [];
    if (params?.stage) parts.push(`stage=${encodeURIComponent(params.stage)}`);
    if (params?.company) parts.push(`company=${encodeURIComponent(params.company)}`);
    if (params?.search) parts.push(`search=${encodeURIComponent(params.search)}`);
    const qs = parts.length > 0 ? `?${parts.join("&")}` : "";
    return await api.get<ApplicationBrief[]>(`/workspace/applications${qs}`);
  },

  async getUpcomingDeadlines(daysAhead: number = 14): Promise<UpcomingDeadlineOut[]> {
    return await api.get<UpcomingDeadlineOut[]>(
      `/workspace/upcoming?days_ahead=${daysAhead}`
    );
  },

  async getApplicationDetail(id: string): Promise<ApplicationOut> {
    return await api.get<ApplicationOut>(`/workspace/applications/${id}`);
  },

  async updateApplication(
    id: string,
    payload: ApplicationUpdateRequest
  ): Promise<ApplicationOut> {
    return await api.put<ApplicationOut>(`/workspace/applications/${id}`, payload);
  },

  async updateStage(
    id: string,
    payload: ApplicationStageUpdateRequest
  ): Promise<ApplicationOut> {
    return await api.put<ApplicationOut>(
      `/workspace/applications/${id}/stage`,
      payload
    );
  },

  async addEvent(
    id: string,
    payload: ApplicationEventCreateRequest
  ): Promise<ApplicationEventOut> {
    return await api.post<ApplicationEventOut>(
      `/workspace/applications/${id}/events`,
      payload
    );
  },

  async deleteApplication(id: string): Promise<void> {
    await api.delete<void>(`/workspace/applications/${id}`);
  },
};
