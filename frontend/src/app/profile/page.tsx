"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Modal } from "@/components/ui/modal";
import {
  profileService,
  FullProfileOut,
  ProfileUpdate,
  SkillCreate,
  ProjectCreate,
  ExperienceCreate,
  EducationCreate,
  CertificationCreate,
} from "@/services/profile";
import {
  User,
  GraduationCap,
  Briefcase,
  Code2,
  Award,
  Plus,
  Trash2,
  Edit3,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  MapPin,
  Phone,
  Mail,
  BookOpen,
  Calendar,
  Layers,
  FolderGit2,
} from "lucide-react";

export default function ProfilePage() {
  const [fullProfile, setFullProfile] = useState<FullProfileOut | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusMsg, setStatusMsg] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"overview" | "skills" | "projects" | "experience" | "education">("overview");

  const [isEditProfileOpen, setIsEditProfileOpen] = useState<boolean>(false);
  const [profileForm, setProfileForm] = useState<{
    phone: string;
    location: string;
    college: string;
    degree: string;
    branch: string;
    graduation_year: string;
    cgpa: string;
    bio: string;
    preferred_roles: string;
    preferred_locations: string;
  }>({
    phone: "",
    location: "",
    college: "",
    degree: "",
    branch: "",
    graduation_year: "",
    cgpa: "",
    bio: "",
    preferred_roles: "",
    preferred_locations: "",
  });

  const [isAddSkillOpen, setIsAddSkillOpen] = useState<boolean>(false);
  const [skillForm, setSkillForm] = useState<{
    name: string;
    category: string;
    proficiency: string;
    evidence: string;
  }>({
    name: "",
    category: "Programming",
    proficiency: "Intermediate",
    evidence: "",
  });

  const [isAddProjectOpen, setIsAddProjectOpen] = useState<boolean>(false);
  const [projectForm, setProjectForm] = useState<{
    title: string;
    description: string;
    technologies: string;
    role: string;
    repo_url: string;
    demo_url: string;
  }>({
    title: "",
    description: "",
    technologies: "",
    role: "Full Stack Engineer",
    repo_url: "",
    demo_url: "",
  });

  const [isAddExperienceOpen, setIsAddExperienceOpen] = useState<boolean>(false);
  const [experienceForm, setExperienceForm] = useState<{
    company: string;
    role: string;
    start_date: string;
    end_date: string;
    description: string;
    technologies: string;
  }>({
    company: "",
    role: "",
    start_date: "",
    end_date: "",
    description: "",
    technologies: "",
  });

  const [isAddEducationOpen, setIsAddEducationOpen] = useState<boolean>(false);
  const [educationForm, setEducationForm] = useState<{
    institution: string;
    degree: string;
    branch: string;
    start_year: string;
    end_year: string;
    cgpa: string;
  }>({
    institution: "",
    degree: "",
    branch: "",
    start_year: "",
    end_year: "",
    cgpa: "",
  });

  const [isAddCertOpen, setIsAddCertOpen] = useState<boolean>(false);
  const [certForm, setCertForm] = useState<{
    name: string;
    issuing_organization: string;
    issue_date: string;
    credential_url: string;
  }>({
    name: "",
    issuing_organization: "",
    issue_date: "",
    credential_url: "",
  });

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await profileService.getFullProfile();
      setFullProfile(data);
      if (data.profile) {
        setProfileForm({
          phone: data.profile.phone || "",
          location: data.profile.location || "",
          college: data.profile.college || "",
          degree: data.profile.degree || "",
          branch: data.profile.branch || "",
          graduation_year: data.profile.graduation_year ? String(data.profile.graduation_year) : "",
          cgpa: data.profile.cgpa !== undefined && data.profile.cgpa !== null ? String(data.profile.cgpa) : "",
          bio: data.profile.bio || "",
          preferred_roles: (data.profile.preferred_roles || []).join(", "),
          preferred_locations: (data.profile.preferred_locations || []).join(", "),
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load candidate profile";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: ProfileUpdate = {
        phone: profileForm.phone.trim() || undefined,
        location: profileForm.location.trim() || undefined,
        college: profileForm.college.trim() || undefined,
        degree: profileForm.degree.trim() || undefined,
        branch: profileForm.branch.trim() || undefined,
        graduation_year: profileForm.graduation_year ? parseInt(profileForm.graduation_year, 10) : undefined,
        cgpa: profileForm.cgpa ? parseFloat(profileForm.cgpa) : undefined,
        bio: profileForm.bio.trim() || undefined,
        preferred_roles: profileForm.preferred_roles
          ? profileForm.preferred_roles.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        preferred_locations: profileForm.preferred_locations
          ? profileForm.preferred_locations.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      };

      await profileService.updateProfile(payload);
      setIsEditProfileOpen(false);
      setStatusMsg("Profile updated successfully");
      setTimeout(() => setStatusMsg(""), 3000);
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving profile";
      setErrorMsg(msg);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!skillForm.name.trim()) return;
    try {
      const payload: SkillCreate = {
        name: skillForm.name.trim(),
        category: skillForm.category.trim() || "General",
        proficiency: skillForm.proficiency.trim() || "Intermediate",
        evidence: skillForm.evidence.trim() || undefined,
      };
      await profileService.addSkill(payload);
      setSkillForm({ name: "", category: "Programming", proficiency: "Intermediate", evidence: "" });
      setIsAddSkillOpen(false);
      setStatusMsg("Skill added successfully");
      setTimeout(() => setStatusMsg(""), 3000);
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error adding skill";
      setErrorMsg(msg);
    }
  };

  const handleDeleteSkill = async (id: string) => {
    try {
      await profileService.deleteSkill(id);
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting skill";
      setErrorMsg(msg);
    }
  };

  const handleAddProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectForm.title.trim()) return;
    try {
      const payload: ProjectCreate = {
        title: projectForm.title.trim(),
        description: projectForm.description.trim() || undefined,
        technologies: projectForm.technologies
          ? projectForm.technologies.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
        role: projectForm.role.trim() || undefined,
        repo_url: projectForm.repo_url.trim() || undefined,
        demo_url: projectForm.demo_url.trim() || undefined,
      };
      await profileService.addProject(payload);
      setProjectForm({ title: "", description: "", technologies: "", role: "Full Stack Engineer", repo_url: "", demo_url: "" });
      setIsAddProjectOpen(false);
      setStatusMsg("Project recorded successfully");
      setTimeout(() => setStatusMsg(""), 3000);
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error adding project";
      setErrorMsg(msg);
    }
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await profileService.deleteProject(id);
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting project";
      setErrorMsg(msg);
    }
  };

  const handleAddExperience = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!experienceForm.company.trim() || !experienceForm.role.trim()) return;
    try {
      const payload: ExperienceCreate = {
        company: experienceForm.company.trim(),
        role: experienceForm.role.trim(),
        start_date: experienceForm.start_date.trim() || undefined,
        end_date: experienceForm.end_date.trim() || undefined,
        description: experienceForm.description.trim() || undefined,
        technologies: experienceForm.technologies
          ? experienceForm.technologies.split(",").map((s) => s.trim()).filter(Boolean)
          : [],
      };
      await profileService.addExperience(payload);
      setExperienceForm({ company: "", role: "", start_date: "", end_date: "", description: "", technologies: "" });
      setIsAddExperienceOpen(false);
      setStatusMsg("Experience recorded successfully");
      setTimeout(() => setStatusMsg(""), 3000);
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error adding experience";
      setErrorMsg(msg);
    }
  };

  const handleDeleteExperience = async (id: string) => {
    try {
      await profileService.deleteExperience(id);
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting experience";
      setErrorMsg(msg);
    }
  };

  const handleAddEducation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!educationForm.institution.trim() || !educationForm.degree.trim()) return;
    try {
      const payload: EducationCreate = {
        institution: educationForm.institution.trim(),
        degree: educationForm.degree.trim(),
        branch: educationForm.branch.trim() || undefined,
        start_year: educationForm.start_year ? parseInt(educationForm.start_year, 10) : undefined,
        end_year: educationForm.end_year ? parseInt(educationForm.end_year, 10) : undefined,
        cgpa: educationForm.cgpa.trim() || undefined,
      };
      await profileService.addEducation(payload);
      setEducationForm({ institution: "", degree: "", branch: "", start_year: "", end_year: "", cgpa: "" });
      setIsAddEducationOpen(false);
      setStatusMsg("Education entry added successfully");
      setTimeout(() => setStatusMsg(""), 3000);
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error adding education";
      setErrorMsg(msg);
    }
  };

  const handleDeleteEducation = async (id: string) => {
    try {
      await profileService.deleteEducation(id);
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting education";
      setErrorMsg(msg);
    }
  };

  const handleAddCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certForm.name.trim()) return;
    try {
      const payload: CertificationCreate = {
        name: certForm.name.trim(),
        issuing_organization: certForm.issuing_organization.trim() || undefined,
        issue_date: certForm.issue_date.trim() || undefined,
        credential_url: certForm.credential_url.trim() || undefined,
      };
      await profileService.addCertification(payload);
      setCertForm({ name: "", issuing_organization: "", issue_date: "", credential_url: "" });
      setIsAddCertOpen(false);
      setStatusMsg("Certification recorded successfully");
      setTimeout(() => setStatusMsg(""), 3000);
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error adding certification";
      setErrorMsg(msg);
    }
  };

  const handleDeleteCert = async (id: string) => {
    try {
      await profileService.deleteCertification(id);
      await loadProfile();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error deleting certification";
      setErrorMsg(msg);
    }
  };

  return (
    <AppShell>
      <div className="space-y-6 pb-20 animate-pop-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-2 border-black pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-black text-white rounded-[5px]">
                <User className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black uppercase tracking-tight">
                Candidate Profile Studio
              </h1>
            </div>
            <p className="text-xs text-neutral-600 font-medium">
              Maintain academic credentials, verified skills, and project portfolios. This profile feeds directly into the Job Match and Skill Gap engines.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsEditProfileOpen(true)}
              className="flex items-center gap-1.5 text-xs shadow-[3px_3px_0px_#000]"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Candidate Bio</span>
            </Button>
          </div>
        </div>

        {statusMsg && (
          <div className="bg-lime-50 border-2 border-black p-3 rounded-[5px] text-xs font-bold text-black flex items-center gap-2 shadow-[2px_2px_0px_#000] animate-pop-in">
            <CheckCircle2 className="w-4 h-4 text-black" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border-2 border-black p-3 rounded-[5px] text-xs font-bold text-black flex items-center gap-2 shadow-[2px_2px_0px_#000] animate-pop-in">
            <AlertCircle className="w-4 h-4 text-black" />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-4 border-black border-t-transparent animate-spin mx-auto rounded-full" />
            <p className="text-xs font-black uppercase tracking-wider text-neutral-600">
              Loading Candidate Profile...
            </p>
          </div>
        ) : (
          <>
            <div className="border-2 border-black rounded-[5px] bg-white p-6 shadow-[5px_5px_0px_#000] flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-[5px] border-2 border-black bg-black text-white flex items-center justify-center font-black text-2xl uppercase shadow-[3px_3px_0px_#000]">
                  {fullProfile?.full_name?.charAt(0) || "S"}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black uppercase text-black">
                      {fullProfile?.full_name || "Student Candidate"}
                    </h2>
                    <Badge variant="dark" className="text-[10px]">
                      VERIFIED PROFILE
                    </Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-600 font-medium pt-1">
                    <span className="flex items-center gap-1 font-bold text-black">
                      <Mail className="w-3.5 h-3.5" />
                      {fullProfile?.email}
                    </span>
                    {fullProfile?.profile?.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" />
                        {fullProfile.profile.phone}
                      </span>
                    )}
                    {fullProfile?.profile?.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {fullProfile.profile.location}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-700 font-medium pt-2 max-w-2xl">
                    {fullProfile?.profile?.bio || "No summary added yet. Click 'Edit Candidate Bio' to add your target engineering focus and career objectives."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 w-full lg:w-auto">
                <div className="p-3 border-2 border-black rounded-[5px] bg-neutral-50 shadow-[2px_2px_0px_#000] text-center min-w-[110px]">
                  <div className="text-[10px] font-black uppercase text-neutral-500">Skills</div>
                  <div className="text-xl font-black text-black">{fullProfile?.skills.length || 0}</div>
                </div>
                <div className="p-3 border-2 border-black rounded-[5px] bg-neutral-50 shadow-[2px_2px_0px_#000] text-center min-w-[110px]">
                  <div className="text-[10px] font-black uppercase text-neutral-500">Projects</div>
                  <div className="text-xl font-black text-black">{fullProfile?.projects.length || 0}</div>
                </div>
                <div className="p-3 border-2 border-black rounded-[5px] bg-neutral-50 shadow-[2px_2px_0px_#000] text-center min-w-[110px]">
                  <div className="text-[10px] font-black uppercase text-neutral-500">CGPA</div>
                  <div className="text-xl font-black text-black">
                    {fullProfile?.profile?.cgpa ? `${fullProfile.profile.cgpa}` : "N/A"}
                  </div>
                </div>
                <div className="p-3 border-2 border-black rounded-[5px] bg-neutral-50 shadow-[2px_2px_0px_#000] text-center min-w-[110px]">
                  <div className="text-[10px] font-black uppercase text-neutral-500">Grad Year</div>
                  <div className="text-xl font-black text-black">
                    {fullProfile?.profile?.graduation_year || "2025"}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b-2 border-black pb-2 overflow-x-auto">
              {[
                { key: "overview", label: "Overview", icon: Layers },
                { key: "skills", label: `Skills (${fullProfile?.skills.length || 0})`, icon: Code2 },
                { key: "projects", label: `Projects (${fullProfile?.projects.length || 0})`, icon: FolderGit2 },
                { key: "experience", label: `Experience (${fullProfile?.experiences.length || 0})`, icon: Briefcase },
                { key: "education", label: `Education & Certs (${(fullProfile?.educations.length || 0) + (fullProfile?.certifications.length || 0)})`, icon: GraduationCap },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as typeof activeTab)}
                    className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider rounded-[5px] border-2 border-black transition-all whitespace-nowrap ${
                      isActive
                        ? "bg-black text-white shadow-[2px_2px_0px_#000]"
                        : "bg-white text-black hover:bg-neutral-100"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {activeTab === "overview" && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
                    <CardHeader className="border-b-2 border-black bg-neutral-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Code2 className="w-4 h-4 text-black" />
                          <CardTitle className="text-sm font-black uppercase tracking-wider">Top Technical Skills</CardTitle>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsAddSkillOpen(true)}
                          className="text-xs flex items-center gap-1 border border-black"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Skill</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {fullProfile?.skills.length === 0 ? (
                        <div className="text-center py-6 text-xs text-neutral-500 font-bold">
                          No skills added yet. Add programming languages and frameworks to boost matching.
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {fullProfile?.skills.map((skill) => (
                            <div
                              key={skill.id}
                              className="px-3 py-1.5 border-2 border-black rounded-[5px] bg-white text-xs font-black flex items-center gap-2 shadow-[2px_2px_0px_#000]"
                            >
                              <span>{skill.name}</span>
                              <span className="text-[9px] uppercase px-1.5 py-0.5 bg-neutral-100 border border-black rounded-[3px]">
                                {skill.proficiency || "General"}
                              </span>
                              <button
                                onClick={() => handleDeleteSkill(skill.id)}
                                className="text-neutral-400 hover:text-black transition-colors"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
                    <CardHeader className="border-b-2 border-black bg-neutral-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FolderGit2 className="w-4 h-4 text-black" />
                          <CardTitle className="text-sm font-black uppercase tracking-wider">Featured Engineering Projects</CardTitle>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsAddProjectOpen(true)}
                          className="text-xs flex items-center gap-1 border border-black"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Project</span>
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {fullProfile?.projects.length === 0 ? (
                        <div className="text-center py-6 text-xs text-neutral-500 font-bold">
                          No projects recorded yet. Showcase full-stack and systems projects to strengthen your applications.
                        </div>
                      ) : (
                        fullProfile?.projects.map((proj) => (
                          <div
                            key={proj.id}
                            className="p-3 border-2 border-black rounded-[5px] bg-neutral-50 shadow-[2px_2px_0px_#000] space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-black uppercase text-black">{proj.title}</h4>
                              <div className="flex items-center gap-2">
                                {proj.repo_url && (
                                  <a
                                    href={proj.repo_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-[10px] font-black uppercase flex items-center gap-1 text-black hover:underline"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Code</span>
                                  </a>
                                )}
                                <button
                                  onClick={() => handleDeleteProject(proj.id)}
                                  className="text-neutral-400 hover:text-black"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            {proj.description && (
                              <p className="text-xs text-neutral-600 font-medium">{proj.description}</p>
                            )}
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {proj.technologies.map((t, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 text-[10px] font-bold border border-black rounded-[3px] bg-white text-black"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
                    <CardHeader className="border-b-2 border-black bg-neutral-50 p-4">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4 text-black" />
                        <CardTitle className="text-sm font-black uppercase tracking-wider">Academic Record</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-1 border-b border-neutral-200 pb-2">
                        <div className="text-[10px] font-black uppercase text-neutral-500">Institution</div>
                        <div className="text-xs font-black text-black">
                          {fullProfile?.profile?.college || "Engineering College"}
                        </div>
                      </div>
                      <div className="space-y-1 border-b border-neutral-200 pb-2">
                        <div className="text-[10px] font-black uppercase text-neutral-500">Degree & Branch</div>
                        <div className="text-xs font-black text-black">
                          {fullProfile?.profile?.degree ? `${fullProfile.profile.degree} - ` : ""}
                          {fullProfile?.profile?.branch || "Computer Science"}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 border-b border-neutral-200 pb-2">
                        <div className="space-y-1">
                          <div className="text-[10px] font-black uppercase text-neutral-500">Graduation</div>
                          <div className="text-xs font-black text-black">
                            {fullProfile?.profile?.graduation_year || "2025"}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-[10px] font-black uppercase text-neutral-500">CGPA</div>
                          <div className="text-xs font-black text-black">
                            {fullProfile?.profile?.cgpa || "N/A"}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase text-neutral-500">Target Roles</div>
                        <div className="flex flex-wrap gap-1 pt-1">
                          {(fullProfile?.profile?.preferred_roles || ["Software Engineer", "Backend Developer"]).map((r, i) => (
                            <span key={i} className="px-2 py-0.5 bg-black text-white rounded-[3px] text-[10px] font-bold">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-black shadow-[4px_4px_0px_#000] bg-white">
                    <CardHeader className="border-b-2 border-black bg-neutral-50 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Award className="w-4 h-4 text-black" />
                          <CardTitle className="text-sm font-black uppercase tracking-wider">Certifications</CardTitle>
                        </div>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setIsAddCertOpen(true)}
                          className="text-xs flex items-center gap-1 border border-black"
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                      {fullProfile?.certifications.length === 0 ? (
                        <div className="text-xs text-neutral-500 font-bold text-center py-2">
                          No certifications added yet.
                        </div>
                      ) : (
                        fullProfile?.certifications.map((c) => (
                          <div key={c.id} className="p-2 border border-black rounded-[4px] bg-neutral-50 text-xs flex items-center justify-between">
                            <div>
                              <div className="font-black text-black">{c.name}</div>
                              <div className="text-[10px] text-neutral-500">{c.issuing_organization}</div>
                            </div>
                            <button onClick={() => handleDeleteCert(c.id)} className="text-neutral-400 hover:text-black">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {activeTab === "skills" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-black">
                    All Verified Skills ({fullProfile?.skills.length || 0})
                  </h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddSkillOpen(true)}
                    className="flex items-center gap-1.5 text-xs shadow-[3px_3px_0px_#000]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Skill</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {fullProfile?.skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="p-3 border-2 border-black rounded-[5px] bg-white shadow-[3px_3px_0px_#000] flex flex-col justify-between space-y-2"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase text-neutral-500">
                            {skill.category || "General"}
                          </span>
                          <button
                            onClick={() => handleDeleteSkill(skill.id)}
                            className="text-neutral-400 hover:text-black"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <h4 className="text-sm font-black uppercase text-black">{skill.name}</h4>
                      </div>

                      <div className="pt-2 border-t border-neutral-200 flex items-center justify-between">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-neutral-100 border border-black rounded-[3px]">
                          {skill.proficiency || "Intermediate"}
                        </span>
                        {skill.evidence && (
                          <span className="text-[10px] text-neutral-500 font-medium truncate max-w-[120px]">
                            {skill.evidence}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "projects" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-black">
                    Project Showcase ({fullProfile?.projects.length || 0})
                  </h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddProjectOpen(true)}
                    className="flex items-center gap-1.5 text-xs shadow-[3px_3px_0px_#000]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Project</span>
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {fullProfile?.projects.map((proj) => (
                    <div
                      key={proj.id}
                      className="p-4 border-2 border-black rounded-[5px] bg-white shadow-[4px_4px_0px_#000] space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-black uppercase text-black">{proj.title}</h4>
                          <button
                            onClick={() => handleDeleteProject(proj.id)}
                            className="text-neutral-400 hover:text-black"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {proj.description && (
                          <p className="text-xs text-neutral-700 font-medium leading-relaxed">
                            {proj.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {proj.technologies.map((t, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[10px] font-bold border border-black rounded-[3px] bg-neutral-50 text-black"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-neutral-200 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-neutral-500 uppercase">
                          Role: {proj.role || "Lead Developer"}
                        </span>
                        <div className="flex items-center gap-2">
                          {proj.repo_url && (
                            <a
                              href={proj.repo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-black uppercase flex items-center gap-1 text-black hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>GitHub</span>
                            </a>
                          )}
                          {proj.demo_url && (
                            <a
                              href={proj.demo_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[11px] font-black uppercase flex items-center gap-1 text-black hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Live Demo</span>
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "experience" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-black">
                    Work Experience & Internships ({fullProfile?.experiences.length || 0})
                  </h3>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setIsAddExperienceOpen(true)}
                    className="flex items-center gap-1.5 text-xs shadow-[3px_3px_0px_#000]"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Experience</span>
                  </Button>
                </div>

                <div className="space-y-3">
                  {fullProfile?.experiences.length === 0 ? (
                    <div className="text-center py-10 border-2 border-dashed border-neutral-300 rounded-[5px] text-xs font-bold text-neutral-400 uppercase tracking-wider">
                      No internships or full-time roles logged yet.
                    </div>
                  ) : (
                    fullProfile?.experiences.map((exp) => (
                      <div
                        key={exp.id}
                        className="p-4 border-2 border-black rounded-[5px] bg-white shadow-[4px_4px_0px_#000] space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-black uppercase text-black">{exp.role}</h4>
                            <div className="text-xs font-bold text-neutral-600 flex items-center gap-2 pt-0.5">
                              <span>{exp.company}</span>
                              <span>•</span>
                              <span>
                                {exp.start_date || "Start"} — {exp.end_date || "Present"}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteExperience(exp.id)}
                            className="text-neutral-400 hover:text-black"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {exp.description && (
                          <p className="text-xs text-neutral-700 font-medium whitespace-pre-line leading-relaxed">
                            {exp.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {exp.technologies.map((t, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 text-[10px] font-bold border border-black rounded-[3px] bg-neutral-50 text-black"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === "education" && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider text-black">
                      Education History
                    </h3>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddEducationOpen(true)}
                      className="text-xs flex items-center gap-1 shadow-[2px_2px_0px_#000]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Education</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {fullProfile?.educations.map((edu) => (
                      <div
                        key={edu.id}
                        className="p-3.5 border-2 border-black rounded-[5px] bg-white shadow-[3px_3px_0px_#000] space-y-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-black uppercase text-black">{edu.institution}</h4>
                            <div className="text-xs font-bold text-neutral-600">
                              {edu.degree} {edu.branch ? `in ${edu.branch}` : ""}
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteEducation(edu.id)}
                            className="text-neutral-400 hover:text-black"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-neutral-500 font-medium pt-1">
                          <span>
                            {edu.start_year || ""} — {edu.end_year || ""}
                          </span>
                          {edu.cgpa && <span className="font-black text-black">CGPA: {edu.cgpa}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-wider text-black">
                      Certifications
                    </h3>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsAddCertOpen(true)}
                      className="text-xs flex items-center gap-1 shadow-[2px_2px_0px_#000]"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Cert</span>
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {fullProfile?.certifications.map((c) => (
                      <div
                        key={c.id}
                        className="p-3.5 border-2 border-black rounded-[5px] bg-white shadow-[3px_3px_0px_#000] space-y-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-xs font-black uppercase text-black">{c.name}</h4>
                            <div className="text-xs font-bold text-neutral-600">{c.issuing_organization}</div>
                          </div>
                          <button
                            onClick={() => handleDeleteCert(c.id)}
                            className="text-neutral-400 hover:text-black"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                        {c.credential_url && (
                          <a
                            href={c.credential_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] font-black uppercase text-black hover:underline flex items-center gap-1 pt-1"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Verify Credential</span>
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        <Modal
          isOpen={isEditProfileOpen}
          onClose={() => setIsEditProfileOpen(false)}
          title="Edit Candidate Bio & Academics"
        >
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  College / University
                </label>
                <Input
                  value={profileForm.college}
                  onChange={(e) => setProfileForm({ ...profileForm, college: e.target.value })}
                  placeholder="e.g. National Institute of Technology"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Degree
                </label>
                <Input
                  value={profileForm.degree}
                  onChange={(e) => setProfileForm({ ...profileForm, degree: e.target.value })}
                  placeholder="e.g. B.Tech"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Branch / Major
                </label>
                <Input
                  value={profileForm.branch}
                  onChange={(e) => setProfileForm({ ...profileForm, branch: e.target.value })}
                  placeholder="e.g. Computer Science and Engineering"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Graduation Year
                </label>
                <Input
                  type="number"
                  value={profileForm.graduation_year}
                  onChange={(e) => setProfileForm({ ...profileForm, graduation_year: e.target.value })}
                  placeholder="2025"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  CGPA / Grade (out of 10)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={profileForm.cgpa}
                  onChange={(e) => setProfileForm({ ...profileForm, cgpa: e.target.value })}
                  placeholder="8.75"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Location
                </label>
                <Input
                  value={profileForm.location}
                  onChange={(e) => setProfileForm({ ...profileForm, location: e.target.value })}
                  placeholder="e.g. Bangalore, India"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Phone
                </label>
                <Input
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Target Roles (Comma-separated)
                </label>
                <Input
                  value={profileForm.preferred_roles}
                  onChange={(e) => setProfileForm({ ...profileForm, preferred_roles: e.target.value })}
                  placeholder="Software Engineer, SRE, ML Engineer"
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Candidate Bio / Career Summary
              </label>
              <Textarea
                rows={3}
                value={profileForm.bio}
                onChange={(e) => setProfileForm({ ...profileForm, bio: e.target.value })}
                placeholder="Passionate software engineer focused on high-performance distributed systems, algorithms, and clean architecture..."
                className="text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsEditProfileOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="text-xs">
                Save Changes
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isAddSkillOpen}
          onClose={() => setIsAddSkillOpen(false)}
          title="Add Verified Skill"
        >
          <form onSubmit={handleAddSkill} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Skill Name *
              </label>
              <Input
                required
                value={skillForm.name}
                onChange={(e) => setSkillForm({ ...skillForm, name: e.target.value })}
                placeholder="e.g. Python, Docker, React, PostgreSQL"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Category
                </label>
                <select
                  value={skillForm.category}
                  onChange={(e) => setSkillForm({ ...skillForm, category: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded-[5px] text-xs font-bold bg-white shadow-[2px_2px_0px_#000]"
                >
                  <option value="Programming">Programming</option>
                  <option value="Frameworks">Frameworks</option>
                  <option value="Cloud & DevOps">Cloud & DevOps</option>
                  <option value="Databases">Databases</option>
                  <option value="Core CS">Core CS & Algorithms</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Proficiency
                </label>
                <select
                  value={skillForm.proficiency}
                  onChange={(e) => setSkillForm({ ...skillForm, proficiency: e.target.value })}
                  className="w-full px-3 py-2 border-2 border-black rounded-[5px] text-xs font-bold bg-white shadow-[2px_2px_0px_#000]"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Evidence / Context (Optional)
              </label>
              <Input
                value={skillForm.evidence}
                onChange={(e) => setSkillForm({ ...skillForm, evidence: e.target.value })}
                placeholder="e.g. 2 years production use, GitHub repo, LeetCode 300+ problems"
                className="text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAddSkillOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="text-xs">
                Add Skill
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isAddProjectOpen}
          onClose={() => setIsAddProjectOpen(false)}
          title="Add Engineering Project"
        >
          <form onSubmit={handleAddProject} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Project Title *
              </label>
              <Input
                required
                value={projectForm.title}
                onChange={(e) => setProjectForm({ ...projectForm, title: e.target.value })}
                placeholder="e.g. High-Throughput Distributed Message Queue"
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Description & Impact
              </label>
              <Textarea
                rows={3}
                value={projectForm.description}
                onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                placeholder="Built an in-memory message broker in Go handling 50k msgs/sec with Raft consensus..."
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Technologies Used (Comma-separated)
              </label>
              <Input
                value={projectForm.technologies}
                onChange={(e) => setProjectForm({ ...projectForm, technologies: e.target.value })}
                placeholder="Go, Raft, gRPC, Docker, Prometheus"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  GitHub / Repo URL
                </label>
                <Input
                  value={projectForm.repo_url}
                  onChange={(e) => setProjectForm({ ...projectForm, repo_url: e.target.value })}
                  placeholder="https://github.com/..."
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Live Demo URL
                </label>
                <Input
                  value={projectForm.demo_url}
                  onChange={(e) => setProjectForm({ ...projectForm, demo_url: e.target.value })}
                  placeholder="https://..."
                  className="text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAddProjectOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="text-xs">
                Save Project
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isAddExperienceOpen}
          onClose={() => setIsAddExperienceOpen(false)}
          title="Add Work Experience / Internship"
        >
          <form onSubmit={handleAddExperience} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Company *
                </label>
                <Input
                  required
                  value={experienceForm.company}
                  onChange={(e) => setExperienceForm({ ...experienceForm, company: e.target.value })}
                  placeholder="e.g. Google, Amazon, Razorpay"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Role Title *
                </label>
                <Input
                  required
                  value={experienceForm.role}
                  onChange={(e) => setExperienceForm({ ...experienceForm, role: e.target.value })}
                  placeholder="e.g. Software Engineering Intern"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Start Date
                </label>
                <Input
                  value={experienceForm.start_date}
                  onChange={(e) => setExperienceForm({ ...experienceForm, start_date: e.target.value })}
                  placeholder="e.g. May 2024"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  End Date
                </label>
                <Input
                  value={experienceForm.end_date}
                  onChange={(e) => setExperienceForm({ ...experienceForm, end_date: e.target.value })}
                  placeholder="e.g. Aug 2024 or Present"
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Responsibilities & Accomplishments
              </label>
              <Textarea
                rows={3}
                value={experienceForm.description}
                onChange={(e) => setExperienceForm({ ...experienceForm, description: e.target.value })}
                placeholder="Architected internal metrics dashboard, optimized SQL queries decreasing latency by 40%..."
                className="text-xs"
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Technologies (Comma-separated)
              </label>
              <Input
                value={experienceForm.technologies}
                onChange={(e) => setExperienceForm({ ...experienceForm, technologies: e.target.value })}
                placeholder="Python, FastAPI, Redis, Kubernetes"
                className="text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAddExperienceOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="text-xs">
                Save Experience
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isAddEducationOpen}
          onClose={() => setIsAddEducationOpen(false)}
          title="Add Education Entry"
        >
          <form onSubmit={handleAddEducation} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Institution Name *
              </label>
              <Input
                required
                value={educationForm.institution}
                onChange={(e) => setEducationForm({ ...educationForm, institution: e.target.value })}
                placeholder="e.g. Indian Institute of Technology"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Degree *
                </label>
                <Input
                  required
                  value={educationForm.degree}
                  onChange={(e) => setEducationForm({ ...educationForm, degree: e.target.value })}
                  placeholder="e.g. B.Tech, M.Tech, B.S."
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Branch
                </label>
                <Input
                  value={educationForm.branch}
                  onChange={(e) => setEducationForm({ ...educationForm, branch: e.target.value })}
                  placeholder="e.g. Electrical Engineering"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Start Year
                </label>
                <Input
                  type="number"
                  value={educationForm.start_year}
                  onChange={(e) => setEducationForm({ ...educationForm, start_year: e.target.value })}
                  placeholder="2021"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  End Year
                </label>
                <Input
                  type="number"
                  value={educationForm.end_year}
                  onChange={(e) => setEducationForm({ ...educationForm, end_year: e.target.value })}
                  placeholder="2025"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  CGPA / Grade
                </label>
                <Input
                  value={educationForm.cgpa}
                  onChange={(e) => setEducationForm({ ...educationForm, cgpa: e.target.value })}
                  placeholder="9.1"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAddEducationOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="text-xs">
                Save Education
              </Button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isAddCertOpen}
          onClose={() => setIsAddCertOpen(false)}
          title="Add Certification"
        >
          <form onSubmit={handleAddCert} className="space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Certification Name *
              </label>
              <Input
                required
                value={certForm.name}
                onChange={(e) => setCertForm({ ...certForm, name: e.target.value })}
                placeholder="e.g. AWS Certified Solutions Architect"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Issuing Organization
                </label>
                <Input
                  value={certForm.issuing_organization}
                  onChange={(e) => setCertForm({ ...certForm, issuing_organization: e.target.value })}
                  placeholder="e.g. Amazon Web Services, Linux Foundation"
                  className="text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                  Issue Date
                </label>
                <Input
                  value={certForm.issue_date}
                  onChange={(e) => setCertForm({ ...certForm, issue_date: e.target.value })}
                  placeholder="e.g. Dec 2024"
                  className="text-xs"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wider text-black block mb-1">
                Credential URL
              </label>
              <Input
                value={certForm.credential_url}
                onChange={(e) => setCertForm({ ...certForm, credential_url: e.target.value })}
                placeholder="https://..."
                className="text-xs"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-neutral-200">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setIsAddCertOpen(false)}
                className="text-xs"
              >
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="text-xs">
                Save Certification
              </Button>
            </div>
          </form>
        </Modal>
      </div>
    </AppShell>
  );
}
