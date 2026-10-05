import { Types } from "mongoose";

export enum JobStatus {
  OPEN = "Open",
  ON_HOLD = "On Hold",
  CLOSED = "Closed",
}

export enum WorkMode {
  ONSITE = "Onsite",
  REMOTE = "Remote",
  HYBRID = "Hybrid",
}

export enum EmploymentType {
  FULL_TIME = "Full-time",
  PART_TIME = "Part-time",
  CONTRACT = "Contract",
  INTERNSHIP = "Internship",
}

export enum CandidateStage {
  APPLIED = "Applied",
  SCREENING = "Screening",
  INTERVIEW = "Interview",
  OFFER = "Offer",
  HIRED = "Hired",
  REJECTED = "Rejected",
}

export enum CandidateSource {
  LINKEDIN = "LinkedIn",
  NAUKRI = "Naukri",
  INDEED = "Indeed",
  REFERRAL = "Referral",
  COMPANY_WEBSITE = "Company Website",
  CAMPUS = "Campus",
  OTHER = "Other",
}

export enum InterviewMode {
  ONLINE = "Online",
  IN_PERSON = "In-person",
  PHONE = "Phone",
}

export enum InterviewStatus {
  SCHEDULED = "Scheduled",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
}

export enum InterviewResult {
  SELECTED = "Selected",
  REJECTED = "Rejected",
  ON_HOLD = "On Hold",
}

export interface IJobOpening {
  title: string;
  department: string;
  location?: string;

  workMode: WorkMode;
  employmentType: EmploymentType;

  experienceMin: number;
  experienceMax?: number;

  // "Technical Skills" on the job details screen
  skills: string[];

  description?: string;

  vacancies: number;

  closingDate?: Date | null;

  status: JobStatus;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  isDeleted: boolean;

  // createdAt is the "Posted on" date
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ICandidateResume {
  url: string;
  publicId?: string;
  originalName?: string;
}

export interface IStageHistory {
  stage: CandidateStage;
  note?: string;
  changedBy?: Types.ObjectId;
  changedAt: Date;
}

export interface IInterview {
  _id?: Types.ObjectId;

  round: number;
  title?: string;

  scheduledAt: Date;
  durationMinutes: number;

  mode: InterviewMode;

  // Meeting link for online interviews or venue for in-person ones
  location?: string;

  interviewers: Types.ObjectId[];

  status: InterviewStatus;

  feedback?: string;
  rating?: number;
  result?: InterviewResult;

  completedAt?: Date;

  scheduledBy?: Types.ObjectId;
}

export interface ICandidate {
  job: Types.ObjectId;

  fullName: string;
  email: string;
  phone: string;

  experienceYears: number;
  currentCompany?: string;
  skills: string[];

  source: CandidateSource;

  resume?: ICandidateResume;

  stage: CandidateStage;
  stageHistory: IStageHistory[];

  interviews: IInterview[];

  notes?: string;

  // "Applied on" date
  appliedAt: Date;

  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;

  isDeleted: boolean;

  createdAt?: Date;
  updatedAt?: Date;
}
