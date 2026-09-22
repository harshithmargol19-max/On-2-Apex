import { api } from "@/library/api";

export interface ProfileUpdate {
  phone?: string;
  location?: string;
  college?: string;
  degree?: string;
  branch?: string;
  graduation_year?: number;
  cgpa?: number;
  preferred_roles?: string[];
  preferred_locations?: string[];
  work_authorization?: string;
  bio?: string;
}

export interface ProfileOut {
  id: string;
  user_id: string;
  phone?: string;
  location?: string;
  college?: string;
  degree?: string;
  branch?: string;
  graduation_year?: number;
  cgpa?: number;
  preferred_roles: string[];
  preferred_locations: string[];
  work_authorization?: string;
  bio?: string;
  created_at: string;
  updated_at: string;
}

export interface SkillCreate {
  name: string;
  category?: string;
  proficiency?: string;
  evidence?: string;
}

export interface SkillOut {
  id: string;
  user_id: string;
  name: string;
  category?: string;
  proficiency?: string;
  evidence?: string;
  created_at: string;
}

export interface EducationCreate {
  institution: string;
  degree: string;
  branch?: string;
  start_year?: number;
  end_year?: number;
  cgpa?: string;
}

export interface EducationOut {
  id: string;
  user_id: string;
  institution: string;
  degree: string;
  branch?: string;
  start_year?: number;
  end_year?: number;
  cgpa?: string;
  created_at: string;
}

export interface ProjectCreate {
  title: string;
  description?: string;
  technologies: string[];
  role?: string;
  repo_url?: string;
  demo_url?: string;
  achievements?: string;
}

export interface ProjectUpdate {
  title?: string;
  description?: string;
  technologies?: string[];
  role?: string;
  repo_url?: string;
  demo_url?: string;
  achievements?: string;
}

export interface ProjectOut {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  technologies: string[];
  role?: string;
  repo_url?: string;
  demo_url?: string;
  achievements?: string;
  created_at: string;
}

export interface ExperienceCreate {
  company: string;
  role: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  technologies: string[];
  achievements?: string;
}

export interface ExperienceUpdate {
  company?: string;
  role?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  technologies?: string[];
  achievements?: string;
}

export interface ExperienceOut {
  id: string;
  user_id: string;
  company: string;
  role: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  technologies: string[];
  achievements?: string;
  created_at: string;
}

export interface CertificationCreate {
  name: string;
  issuing_organization?: string;
  issue_date?: string;
  credential_url?: string;
}

export interface CertificationOut {
  id: string;
  user_id: string;
  name: string;
  issuing_organization?: string;
  issue_date?: string;
  credential_url?: string;
  created_at: string;
}

export interface AchievementCreate {
  title: string;
  category?: string;
  date?: string;
  description?: string;
}

export interface AchievementOut {
  id: string;
  user_id: string;
  title: string;
  category?: string;
  date?: string;
  description?: string;
  created_at: string;
}

export interface FullProfileOut {
  user_id: string;
  email: string;
  full_name: string;
  profile?: ProfileOut;
  skills: SkillOut[];
  educations: EducationOut[];
  projects: ProjectOut[];
  experiences: ExperienceOut[];
  certifications: CertificationOut[];
  achievements: AchievementOut[];
}

export const profileService = {
  getFullProfile: async (): Promise<FullProfileOut> => {
    return api.get<FullProfileOut>("/profile");
  },

  updateProfile: async (data: ProfileUpdate): Promise<ProfileOut> => {
    return api.put<ProfileOut>("/profile", data);
  },

  getSkills: async (): Promise<SkillOut[]> => {
    return api.get<SkillOut[]>("/profile/skills");
  },

  addSkill: async (data: SkillCreate): Promise<SkillOut> => {
    return api.post<SkillOut>("/profile/skills", data);
  },

  deleteSkill: async (id: string): Promise<void> => {
    return api.delete<void>(`/profile/skills/${id}`);
  },

  addEducation: async (data: EducationCreate): Promise<EducationOut> => {
    return api.post<EducationOut>("/profile/education", data);
  },

  deleteEducation: async (id: string): Promise<void> => {
    return api.delete<void>(`/profile/education/${id}`);
  },

  addProject: async (data: ProjectCreate): Promise<ProjectOut> => {
    return api.post<ProjectOut>("/profile/projects", data);
  },

  updateProject: async (id: string, data: ProjectUpdate): Promise<ProjectOut> => {
    return api.put<ProjectOut>(`/profile/projects/${id}`, data);
  },

  deleteProject: async (id: string): Promise<void> => {
    return api.delete<void>(`/profile/projects/${id}`);
  },

  addExperience: async (data: ExperienceCreate): Promise<ExperienceOut> => {
    return api.post<ExperienceOut>("/profile/experience", data);
  },

  updateExperience: async (id: string, data: ExperienceUpdate): Promise<ExperienceOut> => {
    return api.put<ExperienceOut>(`/profile/experience/${id}`, data);
  },

  deleteExperience: async (id: string): Promise<void> => {
    return api.delete<void>(`/profile/experience/${id}`);
  },

  addCertification: async (data: CertificationCreate): Promise<CertificationOut> => {
    return api.post<CertificationOut>("/profile/certifications", data);
  },

  deleteCertification: async (id: string): Promise<void> => {
    return api.delete<void>(`/profile/certifications/${id}`);
  },

  addAchievement: async (data: AchievementCreate): Promise<AchievementOut> => {
    return api.post<AchievementOut>("/profile/achievements", data);
  },

  deleteAchievement: async (id: string): Promise<void> => {
    return api.delete<void>(`/profile/achievements/${id}`);
  },
};
