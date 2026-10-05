import { Schema, model } from "mongoose";
import {
  CandidateSource,
  CandidateStage,
  EmploymentType,
  ICandidate,
  IInterview,
  IJobOpening,
  InterviewMode,
  InterviewResult,
  InterviewStatus,
  JobStatus,
  WorkMode,
} from "./recruitment.interface";

/* ----------------------------- Job opening ----------------------------- */

const jobOpeningSchema = new Schema<IJobOpening>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },

    department: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
      index: true,
    },

    location: {
      type: String,
      trim: true,
      maxlength: 120,
    },

    workMode: {
      type: String,
      enum: Object.values(WorkMode),
      default: WorkMode.ONSITE,
    },

    employmentType: {
      type: String,
      enum: Object.values(EmploymentType),
      default: EmploymentType.FULL_TIME,
    },

    experienceMin: {
      type: Number,
      default: 0,
      min: 0,
    },

    experienceMax: {
      type: Number,
      min: 0,
    },

    skills: {
      type: [String],
      default: [],
    },

    description: {
      type: String,
      trim: true,
      maxlength: 3000,
    },

    vacancies: {
      type: Number,
      default: 1,
      min: 1,
    },

    closingDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: Object.values(JobStatus),
      default: JobStatus.OPEN,
      index: true,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

jobOpeningSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

export const JobOpening = model<IJobOpening>(
  "JobOpening",
  jobOpeningSchema
);

/* ------------------------------- Candidate ------------------------------ */

const stageHistorySchema = new Schema(
  {
    stage: {
      type: String,
      enum: Object.values(CandidateStage),
      required: true,
    },

    note: {
      type: String,
      trim: true,
      maxlength: 500,
    },

    changedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },

    changedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const interviewSchema = new Schema<IInterview>({
  round: {
    type: Number,
    required: true,
    min: 1,
  },

  title: {
    type: String,
    trim: true,
    maxlength: 100,
  },

  scheduledAt: {
    type: Date,
    required: true,
  },

  durationMinutes: {
    type: Number,
    default: 60,
    min: 15,
    max: 480,
  },

  mode: {
    type: String,
    enum: Object.values(InterviewMode),
    default: InterviewMode.ONLINE,
  },

  location: {
    type: String,
    trim: true,
    maxlength: 300,
  },

  interviewers: [
    {
      type: Schema.Types.ObjectId,
      ref: "Employee",
    },
  ],

  status: {
    type: String,
    enum: Object.values(InterviewStatus),
    default: InterviewStatus.SCHEDULED,
  },

  feedback: {
    type: String,
    trim: true,
    maxlength: 2000,
  },

  rating: {
    type: Number,
    min: 1,
    max: 5,
  },

  result: {
    type: String,
    enum: Object.values(InterviewResult),
  },

  completedAt: {
    type: Date,
  },

  scheduledBy: {
    type: Schema.Types.ObjectId,
    ref: "Auth",
  },
});

const candidateSchema = new Schema<ICandidate>(
  {
    job: {
      type: Schema.Types.ObjectId,
      ref: "JobOpening",
      required: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    experienceYears: {
      type: Number,
      default: 0,
      min: 0,
    },

    currentCompany: {
      type: String,
      trim: true,
      maxlength: 120,
    },

    skills: {
      type: [String],
      default: [],
    },

    source: {
      type: String,
      enum: Object.values(CandidateSource),
      default: CandidateSource.OTHER,
    },

    resume: {
      type: new Schema(
        {
          url: { type: String, required: true },
          publicId: { type: String },
          originalName: { type: String },
        },
        { _id: false }
      ),
    },

    stage: {
      type: String,
      enum: Object.values(CandidateStage),
      default: CandidateStage.APPLIED,
      index: true,
    },

    stageHistory: {
      type: [stageHistorySchema],
      default: [],
    },

    interviews: {
      type: [interviewSchema],
      default: [],
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
    },

    appliedAt: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "Auth",
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

candidateSchema.index({ job: 1, isDeleted: 1, appliedAt: -1 });
candidateSchema.index({ job: 1, email: 1 });
candidateSchema.index({ "interviews.scheduledAt": 1 });

export const Candidate = model<ICandidate>("Candidate", candidateSchema);
