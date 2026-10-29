
/**
 * Learning content queries: domains, roadmaps, skill nodes, lessons,
 * assessments, challenges, projects, milestones, and enrollments.
 */

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { notFound } from "@/lib/errors";

export interface RoadmapSummary {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  role: string | null;
  difficulty: string;
  xpMilestoneReward: number;
  progress: number;
  completedAt: Date | null;
  skillNodeCount: number;
}

export interface SkillNodeDetail {
  id: string;
  slug: string;
  title: string;
  explanation: string | null;
  difficulty: string;
  order: number;
  xpReward: number;
  prerequisites: { id: string; title: string }[];
}

export async function listDomains() {
  return prisma.learningDomain.findMany({
    where: { isPublished: true },
    orderBy: { order: "asc" },
    include: {
      roadmaps: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        select: { id: true, slug: true, title: true, role: true, difficulty: true, order: true },
      },
    },
  });
}

export async function listRoadmaps(userId?: string) {
  const roadmaps = await prisma.roadmap.findMany({
    where: { isPublished: true },
    orderBy: [{ domain: { order: "asc" } }, { order: "asc" }],
    include: {
      domain: { select: { id: true, slug: true, title: true, color: true } },
      skillNodes: {
        where: { isPublished: true },
        select: { id: true, slug: true, title: true, difficulty: true, order: true },
        orderBy: { order: "asc" },
      },
    },
  });

  if (!userId) {
    return roadmaps.map((r) => ({
      ...r,
      progress: 0,
      enrolled: false,
      completedAt: null,
    }));
  }

  const enrollments = await prisma.roadmapEnrollment.findMany({
    where: { userId },
    select: { roadmapId: true, progress: true, completedAt: true },
  });
  const enrollmentByRoadmap = new Map(
    enrollments.map((e) => [e.roadmapId, e]),
  );

  return roadmaps.map((r) => {
    const enrollment = enrollmentByRoadmap.get(r.id);
    return {
      ...r,
      progress: enrollment?.progress ?? 0,
      enrolled: !!enrollment,
      completedAt: enrollment?.completedAt ?? null,
    };
  });
}

export async function getRoadmap(roadmapId: string, userId?: string) {
  const roadmap = await prisma.roadmap.findUnique({
    where: { id: roadmapId },
    include: {
      domain: true,
      skillNodes: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
        include: {
          lessons: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            select: { id: true, slug: true, title: true, order: true, xpReward: true },
          },
          assessments: {
            where: { isPublished: true },
            orderBy: { order: "asc" },
            select: { id: true, slug: true, title: true, order: true, xpReward: true, isBoss: true },
          },
        },
      },
    },
  });
  if (!roadmap) throw notFound("Roadmap not found.");

  let enrollment = null;
  if (userId) {
    enrollment = await prisma.roadmapEnrollment.findUnique({
      where: { userId_roadmapId: { userId, roadmapId } },
    });
  }

  return { ...roadmap, enrollment };
}

export async function enrollInRoadmap(userId: string, roadmapId: string) {
  return prisma.roadmapEnrollment.upsert({
    where: { userId_roadmapId: { userId, roadmapId } },
    create: { userId, roadmapId, startedAt: new Date(), progress: 0 },
    update: {},
  });
}

/** Get a skill node with its lessons and assessments (for the topic view). */
export async function getSkillNode(
  skillNodeId: string,
  userId?: string,
) {
  const node = await prisma.skillNode.findUnique({
    where: { id: skillNodeId },
    include: {
      roadmap: { select: { id: true, slug: true, title: true } },
      lessons: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
      },
      assessments: {
        where: { isPublished: true },
        orderBy: { order: "asc" },
      },
      prerequisites: {
        include: { prerequisite: { select: { id: true, title: true } } },
      },
    },
  });
  if (!node) throw notFound("Topic not found.");

  let progress = null;
  let completions: Record<string, boolean> = {};
  if (userId) {
    progress = await prisma.userSkillProgress.findUnique({
      where: { userId_skillNodeId: { userId, skillNodeId } },
    });
    const lessonCompletions = await prisma.lessonCompletion.findMany({
      where: { userId, lessonId: { in: node.lessons.map((l) => l.id) } },
      select: { lessonId: true },
    });
    for (const c of lessonCompletions) completions[c.lessonId] = true;
  }

  return {
    ...node,
    progress,
    lessonCompletions: completions,
  };
}

export async function getLesson(lessonId: string, userId?: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: { skillNode: { select: { id: true, title: true, roadmapId: true } } },
  });
  if (!lesson) throw notFound("Lesson not found.");

  let completed = false;
  if (userId) {
    const c = await prisma.lessonCompletion.findUnique({
      where: { userId_lessonId: { userId, lessonId } },
      select: { id: true },
    });
    completed = !!c;
  }

  return { ...lesson, completed };
}

/** Mark a lesson complete (idempotent). Returns the completion record. */
export async function completeLesson(userId: string, lessonId: string) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    select: { id: true, skillNodeId: true },
  });
  if (!lesson) throw notFound("Lesson not found.");

  const completion = await prisma.lessonCompletion.upsert({
    where: { userId_lessonId: { userId, lessonId } },
    create: { userId, lessonId },
    update: {},
  });

  return { completion, skillNodeId: lesson.skillNodeId };
}

/** Get an assessment with its questions (answers withheld). */
export async function getAssessment(assessmentId: string, userId?: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: {
      questions: {
        orderBy: { order: "asc" },
        select: { id: true, type: true, prompt: true, options: true, points: true },
      },
      skillNode: { select: { id: true, title: true } },
    },
  });
  if (!assessment) throw notFound("Assessment not found.");

  let previousAttempt = null;
  if (userId) {
    previousAttempt = await prisma.assessmentAttempt.findFirst({
      where: { userId, assessmentId },
      orderBy: { attemptedAt: "desc" },
      select: { id: true, score: true, passed: true, attemptedAt: true },
    });
  }

  // Return questions without correctAnswer (withheld from the learner).
  const questions = assessment.questions;

  return {
    ...assessment,
    questions,
    previousAttempt,
  };
}

/** Submit an assessment. Validates answers, records attempt, returns result. */
export interface SubmitAssessmentResult {
  attempt: import("@prisma/client").AssessmentAttempt;
  score: number;
  passed: boolean;
  feedback: string;
}
export async function submitAssessment(
  userId: string,
  assessmentId: string,
  answers: Record<string, unknown>,
) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { questions: true },
  });
  if (!assessment) throw notFound("Assessment not found.");

  let correct = 0;
  let total = 0;
  const questionFeedback: Record<string, { correct: boolean; explanation: string | null }> = {};

  for (const q of assessment.questions) {
    total += q.points;
    const userAnswer = answers[q.id];
    const isCorrect = String(userAnswer ?? "").trim() === String(q.correctAnswer ?? "").trim();
    if (isCorrect) correct += q.points;
    questionFeedback[q.id] = { correct: isCorrect, explanation: q.explanation };
  }

  const score = total > 0 ? Math.round((correct / total) * 100) : 0;
  const passed = score >= assessment.passingScore;

  const feedback = passed
    ? "Assessment passed. You demonstrated understanding of this topic."
    : `You scored ${score}%. The passing score is ${assessment.passingScore}%. Review the topics above and try again.`;

  const attempt = await prisma.assessmentAttempt.create({
    data: {
      userId,
      assessmentId,
      score,
      passed,
      answers: answers as unknown as Prisma.InputJsonValue,
      feedback,
      attemptedAt: new Date(),
      completedAt: new Date(),
    },
  });

  return { attempt, score, passed, feedback, questionFeedback };
}

export interface ChallengeDetail {
  id: string;
  slug: string;
  title: string;
  description: string;
  story: string | null;
  difficulty: string;
  relatedConcepts: unknown[];
  completionCriteria: unknown;
  xpReward: number;
  isBoss: boolean;
}

export async function listChallenges(roadmapId: string) {
  return prisma.challenge.findMany({
    where: { roadmapId, isPublished: true },
    orderBy: { order: "asc" },
    select: {
      id: true, slug: true, title: true, description: true, story: true,
      difficulty: true, relatedConcepts: true, completionCriteria: true,
      xpReward: true, isBoss: true, order: true,
    },
  });
}

export async function getChallenge(challengeId: string) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: {
      id: true, slug: true, title: true, description: true, story: true,
      difficulty: true, relatedConcepts: true, completionCriteria: true,
      xpReward: true, isBoss: true, order: true, roadmapId: true,
    },
  });
  if (!challenge) throw notFound("Challenge not found.");
  return challenge;
}

export interface SubmitChallengeResult {
  attempt: import("@prisma/client").ChallengeAttempt;
  result: string;
  feedback: string;
  xpAwarded: number;
}
export async function submitChallenge(
  userId: string,
  challengeId: string,
  submittedWorkReference: string | null,
) {
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, title: true, xpReward: true, isBoss: true },
  });
  if (!challenge) throw notFound("Challenge not found.");

  // MVP: challenge is marked PASS when work is submitted. Instructors can
  // review later. The attempt records the result for audit.
  const attempt = await prisma.challengeAttempt.create({
    data: {
      userId,
      challengeId,
      submittedWorkReference: submittedWorkReference ?? undefined,
      result: "PASS",
      feedback: "Challenge completed. Your submission has been recorded.",
      score: 100,
      attemptedAt: new Date(),
      completedAt: new Date(),
      xpAwarded: challenge.xpReward,
    },
  });

  return {
    attempt,
    result: "PASS",
    feedback: attempt.feedback,
    xpAwarded: attempt.xpAwarded,
  };
}

export async function listProjects(roadmapId?: string) {
  return prisma.project.findMany({
    where: { ...(roadmapId ? { roadmapId } : {}), isPublished: true },
    include: {
      milestones: {
        orderBy: { order: "asc" },
        select: { id: true, title: true, description: true, order: true, xpReward: true, isRequired: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listMilestoneCompletions(userId: string) {
  return prisma.projectMilestoneCompletion.findMany({
    where: { userId },
    include: { milestone: { select: { title: true, project: { select: { title: true } } } } },
    orderBy: { submittedAt: "desc" },
  });
}

