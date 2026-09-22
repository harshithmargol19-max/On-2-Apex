import { api } from "@/library/api";

export type TaskStatusType = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "VERIFIED";

export interface LearningPlanCreateRequest {
  job_id: string;
  hours_per_week?: number;
  target_weeks?: number;
}

export interface TaskStatusUpdateRequest {
  status: TaskStatusType;
  evidence?: string;
}

export interface LearningTaskOut {
  id: string;
  plan_id: string;
  user_id: string;
  skill: string;
  title: string;
  description: string;
  week_number: number;
  priority: string;
  estimated_hours: number;
  status: TaskStatusType | string;
  learning_goal: string;
  topics: string[];
  practice_project: string;
  interview_question_prep: string;
  evidence?: string | null;
  completed_at?: string | null;
  created_at: string;
}

export interface LearningPlanOut {
  id: string;
  user_id: string;
  job_id?: string | null;
  target_role: string;
  target_company?: string | null;
  hours_per_week: number;
  total_weeks: number;
  total_estimated_hours: number;
  status: string;
  progress_pct: number;
  completed_hours: number;
  tasks: LearningTaskOut[];
  created_at: string;
}

export const learningService = {
  async createPlan(payload: LearningPlanCreateRequest): Promise<LearningPlanOut> {
    return await api.post<LearningPlanOut>("/learning/plan", payload);
  },

  async getActivePlan(): Promise<LearningPlanOut> {
    return await api.get<LearningPlanOut>("/learning/plan/active");
  },

  async getUserPlans(): Promise<LearningPlanOut[]> {
    return await api.get<LearningPlanOut[]>("/learning/plans");
  },

  async getPlanById(planId: string): Promise<LearningPlanOut> {
    return await api.get<LearningPlanOut>(`/learning/plan/${planId}`);
  },

  async updateTaskStatus(
    taskId: string,
    payload: TaskStatusUpdateRequest
  ): Promise<LearningTaskOut> {
    return await api.put<LearningTaskOut>(`/learning/tasks/${taskId}`, payload);
  },
};
