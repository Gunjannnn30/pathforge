/**
 * Pathforge seed data.
 *
 * Populates a fresh database with the initial learning universe (domains,
 * roadmaps, skill nodes, lessons, assessments, challenges, projects),
 * achievement definitions, daily/weekly quest templates, and starter cosmetics.
 * Safe to re-run: uses upsert/unique constraints so it is idempotent.
 */

import { Prisma, CosmeticType } from "@prisma/client";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding Pathforge...");

  // ------------------------------------------------------------------
  // Domains (regions of the learning world)
  // ------------------------------------------------------------------
  const domains = [
    {
      slug: "code-kingdom",
      title: "The Code Kingdom",
      description:
        "Programming and software engineering — from first variables to shipped systems.",
      color: "signal",
      order: 1,
    },
    {
      slug: "intelligence-frontier",
      title: "The Intelligence Frontier",
      description: "AI and machine learning — embeddings, retrieval, and models.",
      color: "primary",
      order: 2,
    },
    {
      slug: "data-realm",
      title: "The Data Realm",
      description: "Databases, statistics, and analytics.",
      color: "accent",
      order: 3,
    },
    {
      slug: "systems-frontier",
      title: "The Systems Frontier",
      description: "Operating systems, networking, cloud, and architecture.",
      color: "secondary",
      order: 4,
    },
    {
      slug: "product-guild",
      title: "The Product Guild",
      description: "Product management, discovery, analytics, and strategy.",
      color: "muted",
      order: 5,
    },
    {
      slug: "security-citadel",
      title: "The Security Citadel",
      description: "Cybersecurity and defensive security.",
      color: "danger",
      order: 6,
    },
    {
      slug: "design-district",
      title: "The Design District",
      description: "UX, UI, research, and design systems.",
      color: "xp",
      order: 7,
    },
    {
      slug: "business-frontier",
      title: "The Business Frontier",
      description: "Business models, finance, marketing, and operations.",
      color: "muted",
      order: 8,
    },
  ] as const;

  for (const d of domains) {
    await prisma.learningDomain.upsert({
      where: { slug: d.slug },
      update: {},
      create: d,
    });
  }

  const codeKingdom = await prisma.learningDomain.findUnique({
    where: { slug: "code-kingdom" },
  });
  const intelligenceFrontier = await prisma.learningDomain.findUnique({
    where: { slug: "intelligence-frontier" },
  });
  const dataRealm = await prisma.learningDomain.findUnique({
    where: { slug: "data-realm" },
  });
  const productGuild = await prisma.learningDomain.findUnique({
    where: { slug: "product-guild" },
  });

  if (!codeKingdom || !intelligenceFrontier || !dataRealm || !productGuild) {
    throw new Error("Failed to create domains.");
  }

  // ------------------------------------------------------------------
  // Roadmaps (kingdoms/territories)
  // ------------------------------------------------------------------
  const roadmaps: Array<{
    slug: string;
    title: string;
    description: string | null;
    domainId: string;
    role: string | null;
    difficulty: "INTRODUCTORY" | "FOUNDATIONAL" | "INTERMEDIATE" | "ADVANCED" | "MASTERY";
    order: number;
    xpMilestoneReward: number;
  }> = [
    {
      slug: "web-developer",
      title: "Web Developer",
      description: "Build interactive websites with HTML, CSS, and JavaScript.",
      domainId: codeKingdom.id,
      role: "Frontend Engineer",
      difficulty: "FOUNDATIONAL",
      order: 1,
      xpMilestoneReward: 200,
    },
    {
      slug: "python-programmer",
      title: "Python Programmer",
      description: "Learn Python from first principles to working programs.",
      domainId: codeKingdom.id,
      role: "Software Developer",
      difficulty: "FOUNDATIONAL",
      order: 2,
      xpMilestoneReward: 200,
    },
    {
      slug: "ai-engineer",
      title: "AI Engineer",
      description: "Build and evaluate retrieval-augmented AI applications.",
      domainId: intelligenceFrontier.id,
      role: "AI Engineer",
      difficulty: "INTERMEDIATE",
      order: 1,
      xpMilestoneReward: 300,
    },
    {
      slug: "data-analyst",
      title: "Data Analyst",
      description: "Answer business questions with SQL and analytics.",
      domainId: dataRealm.id,
      role: "Data Analyst",
      difficulty: "FOUNDATIONAL",
      order: 1,
      xpMilestoneReward: 200,
    },
    {
      slug: "product-manager",
      title: "Product Manager",
      description: "Discovery, experiments, and product strategy.",
      domainId: productGuild.id,
      role: "Product Manager",
      difficulty: "FOUNDATIONAL",
      order: 1,
      xpMilestoneReward: 200,
    },
  ];

  const createdRoadmaps = new Map<string, typeof roadmaps[0] & { id: string }>();
  for (const r of roadmaps) {
    const created = await prisma.roadmap.upsert({
      where: { slug: r.slug },
      update: {},
      create: r,
    });
    createdRoadmaps.set(r.slug, created as any);
  }

  // ------------------------------------------------------------------
  // Helper to create a skill node with lessons and an assessment
  // ------------------------------------------------------------------
  async function createNode(
    roadmapId: string,
    data: {
      slug: string;
      title: string;
      explanation?: string;
      difficulty: typeof roadmaps[0]["difficulty"];
      order: number;
      xpReward?: number;
      prerequisites?: string[]; // node slugs within same roadmap
      lesson: {
        slug: string;
        title: string;
        body: string;
        comprehensionCheck?: boolean;
        xpReward?: number;
      };
      assessment?: {
        slug: string;
        title: string;
        passingScore?: number;
        xpReward?: number;
        isBoss?: boolean;
      };
    },
  ) {
    const node = await prisma.skillNode.create({
      data: {
        slug: data.slug,
        roadmapId,
        title: data.title,
        explanation: data.explanation ?? null,
        difficulty: data.difficulty,
        order: data.order,
        xpReward: data.xpReward ?? 10,
        isPublished: true,
        lessons: {
          create: {
            slug: data.lesson.slug,
            title: data.lesson.title,
            body: data.lesson.body,
            comprehensionCheck: data.lesson.comprehensionCheck ?? true,
            xpReward: data.lesson.xpReward ?? 10,
            order: 1,
            isPublished: true,
          },
        },
        ...(data.assessment
          ? {
              assessments: {
                create: {
                  slug: data.assessment.slug,
                  title: data.assessment.title,
                  description: null,
                  passingScore: data.assessment.passingScore ?? 80,
                  xpReward: data.assessment.xpReward ?? 15,
                  isBoss: data.assessment.isBoss ?? false,
                  order: 1,
                  isPublished: true,
                  questions: {
                    create: [
                      {
                        type: "multiple_choice",
                        prompt: `Sample question for ${data.assessment.title}`,
                        options: ["A", "B", "C", "D"],
                        correctAnswer: "A",
                        explanation: "A is the correct answer.",
                        order: 1,
                        points: 1,
                      },
                    ],
                  },
                },
              },
            }
          : {}),
      },
      include: { lessons: true, assessments: true },
    });

    return node;
  }

  // ---- Web Developer roadmap ----
  const wd = createdRoadmaps.get("web-developer")!;
  await createNode(wd.id, {
    slug: "html-basics",
    title: "HTML Basics",
    explanation: "Structure web pages with HTML elements and semantic tags.",
    difficulty: "INTRODUCTORY",
    order: 1,
    xpReward: 10,
    lesson: {
      slug: "html-basics-lesson",
      title: "Your First HTML Page",
      body: "HTML (HyperText Markup Language) gives a web page its structure. Learn elements, tags, and attributes.",
      comprehensionCheck: true,
      xpReward: 10,
    },
    assessment: {
      slug: "html-basics-check",
      title: "HTML Basics Check",
      passingScore: 80,
      xpReward: 15,
    },
  });

  await createNode(wd.id, {
    slug: "css-basics",
    title: "CSS Basics",
    explanation: "Style pages with CSS — selectors, the box model, and layout.",
    difficulty: "INTRODUCTORY",
    order: 2,
    xpReward: 10,
    prerequisites: ["html-basics"],
    lesson: {
      slug: "css-basics-lesson",
      title: "Styling with CSS",
      body: "CSS (Cascading Style Sheets) controls how HTML elements look. Learn selectors, the box model, and layout.",
      comprehensionCheck: true,
      xpReward: 10,
    },
    assessment: {
      slug: "css-basics-check",
      title: "CSS Basics Check",
      passingScore: 80,
      xpReward: 15,
    },
  });

  await createNode(wd.id, {
    slug: "javascript-basics",
    title: "JavaScript Basics",
    explanation: "Add interactivity with variables, functions, and events.",
    difficulty: "FOUNDATIONAL",
    order: 3,
    xpReward: 10,
    prerequisites: ["html-basics", "css-basics"],
    lesson: {
      slug: "js-basics-lesson",
      title: "First Steps in JavaScript",
      body: "JavaScript makes pages interactive. Learn variables, functions, and events.",
      comprehensionCheck: true,
      xpReward: 10,
    },
    assessment: {
      slug: "js-basics-check",
      title: "JavaScript Basics Check",
      passingScore: 80,
      xpReward: 15,
    },
  });

  // ---- Python Programmer roadmap ----
  const py = createdRoadmaps.get("python-programmer")!;
  await createNode(py.id, {
    slug: "python-variables",
    title: "Variables and Types",
    explanation: "Store data in variables and work with Python's types.",
    difficulty: "INTRODUCTORY",
    order: 1,
    xpReward: 10,
    lesson: {
      slug: "py-vars-lesson",
      title: "Variables and Types",
      body: "Python variables hold values. Learn strings, numbers, booleans, and dynamic typing.",
      comprehensionCheck: true,
      xpReward: 10,
    },
    assessment: {
      slug: "py-vars-check",
      title: "Variables and Types Check",
      passingScore: 80,
      xpReward: 15,
    },
  });

  await createNode(py.id, {
    slug: "python-loops",
    title: "Loops and Collections",
    explanation: "Iterate with loops and work with lists and dictionaries.",
    difficulty: "FOUNDATIONAL",
    order: 2,
    xpReward: 10,
    prerequisites: ["python-variables"],
    lesson: {
      slug: "py-loops-lesson",
      title: "Loops and Collections",
      body: "Repeat work with for/while loops and store collections in lists and dicts.",
      comprehensionCheck: true,
      xpReward: 10,
    },
    assessment: {
      slug: "py-loops-check",
      title: "Loops and Collections Check",
      passingScore: 80,
      xpReward: 15,
    },
  });

  await createNode(py.id, {
    slug: "python-functions",
    title: "Functions",
    explanation: "Organize code into reusable functions.",
    difficulty: "FOUNDATIONAL",
    order: 3,
    xpReward: 10,
    prerequisites: ["python-loops"],
    lesson: {
      slug: "py-functions-lesson",
      title: "Functions",
      body: "Functions let you name and reuse blocks of code.",
      comprehensionCheck: true,
      xpReward: 10,
    },
    assessment: {
      slug: "py-functions-check",
      title: "Functions Check",
      passingScore: 80,
      xpReward: 15,
    },
  });

  // Boss challenge for Python roadmap
  await prisma.challenge.upsert({
    where: { slug: "python-boss" },
    update: {},
    create: {
      slug: "python-boss",
      roadmapId: py.id,
      title: "Defeat the Code Guardian",
      description:
        "Write a small Python program that reads data, transforms it, and reports a result.",
      story:
        "The Code Guardian blocks the path to the next chamber. Only a working function can pass.",
      difficulty: "INTERMEDIATE",
      relatedConcepts: ["python-variables", "python-loops", "python-functions"],
      completionCriteria: {
        kind: "code_submission",
        language: "python",
        requiresTests: true,
      },
      xpReward: 50,
      isBoss: true,
      order: 1,
      isPublished: true,
    },
  });

  // ---- AI Engineer roadmap ----
  const ai = createdRoadmaps.get("ai-engineer")!;
  await createNode(ai.id, {
    slug: "embeddings",
    title: "Embeddings",
    explanation: "Represent text as vectors for semantic search.",
    difficulty: "INTERMEDIATE",
    order: 1,
    xpReward: 15,
    lesson: {
      slug: "embeddings-lesson",
      title: "Embeddings",
      body: "Embeddings turn text into vectors so similar ideas are close together in space.",
      comprehensionCheck: true,
      xpReward: 15,
    },
    assessment: {
      slug: "embeddings-check",
      title: "Embeddings Check",
      passingScore: 80,
      xpReward: 20,
    },
  });

  await createNode(ai.id, {
    slug: "retrieval",
    title: "Retrieval",
    explanation: "Find the most relevant documents for a query.",
    difficulty: "INTERMEDIATE",
    order: 2,
    xpReward: 15,
    prerequisites: ["embeddings"],
    lesson: {
      slug: "retrieval-lesson",
      title: "Retrieval",
      body: "Retrieval ranks documents by relevance to a user's query.",
      comprehensionCheck: true,
      xpReward: 15,
    },
    assessment: {
      slug: "retrieval-check",
      title: "Retrieval Check",
      passingScore: 80,
      xpReward: 20,
    },
  });

  await prisma.challenge.upsert({
    where: { slug: "ai-boss" },
    update: {},
    create: {
      slug: "ai-boss",
      roadmapId: ai.id,
      title: "Defeat the Retrieval Guardian",
      description: "Build and evaluate a small retrieval pipeline.",
      story:
        "The Retrieval Guardian tests whether you can connect embeddings to search.",
      difficulty: "ADVANCED",
      relatedConcepts: ["embeddings", "retrieval"],
      completionCriteria: {
        kind: "pipeline",
        requiresEvaluation: true,
      },
      xpReward: 50,
      isBoss: true,
      order: 1,
      isPublished: true,
    },
  });

  // ---- Data Analyst roadmap ----
  const da = createdRoadmaps.get("data-analyst")!;
  await createNode(da.id, {
    slug: "sql-filtering",
    title: "SQL Filtering",
    explanation: "Select and filter rows with WHERE.",
    difficulty: "INTRODUCTORY",
    order: 1,
    xpReward: 10,
    lesson: {
      slug: "sql-filtering-lesson",
      title: "Filtering Data",
      body: "Use WHERE to filter rows and comparison operators to match conditions.",
      comprehensionCheck: true,
      xpReward: 10,
    },
    assessment: {
      slug: "sql-filtering-check",
      title: "SQL Filtering Check",
      passingScore: 80,
      xpReward: 15,
    },
  });

  await createNode(da.id, {
    slug: "sql-joins",
    title: "SQL Joins",
    explanation: "Combine tables with INNER and OUTER joins.",
    difficulty: "FOUNDATIONAL",
    order: 2,
    xpReward: 10,
    prerequisites: ["sql-filtering"],
    lesson: {
      slug: "sql-joins-lesson",
      title: "Joining Tables",
      body: "JOIN lets you combine related data from multiple tables.",
      comprehensionCheck: true,
      xpReward: 10,
    },
    assessment: {
      slug: "sql-joins-check",
      title: "SQL Joins Check",
      passingScore: 80,
      xpReward: 15,
    },
  });

  // ---- Product Manager roadmap ----
  const pm = createdRoadmaps.get("product-manager")!;
  await createNode(pm.id, {
    slug: "product-discovery",
    title: "Product Discovery",
    explanation: "Find and validate user problems before building.",
    difficulty: "FOUNDATIONAL",
    order: 1,
    xpReward: 10,
    lesson: {
      slug: "pd-discovery-lesson",
      title: "Product Discovery",
      body: "Discovery is the process of understanding user problems and validating them.",
      comprehensionCheck: true,
      xpReward: 10,
    },
    assessment: {
      slug: "pd-discovery-check",
      title: "Product Discovery Check",
      passingScore: 80,
      xpReward: 15,
    },
  });

  // ------------------------------------------------------------------
  // Projects & milestones
  // ------------------------------------------------------------------
  const webProject = await prisma.project.upsert({
    where: { slug: "personal-portfolio" },
    update: {},
    create: {
      slug: "personal-portfolio",
      title: "Personal Portfolio",
      description: "Build and deploy a personal portfolio website.",
      roadmapId: wd.id,
      xpReward: 30,
      isPublished: true,
      milestones: {
        create: [
          { title: "Plan the site", description: "Sketch pages and content.", order: 1, xpReward: 10, isRequired: true },
          { title: "Build HTML structure", description: "Create semantic HTML pages.", order: 2, xpReward: 10, isRequired: true },
          { title: "Add CSS styling", description: "Style the site with CSS.", order: 3, xpReward: 10, isRequired: true },
        ],
      },
    },
    include: { milestones: true },
  });

  // ------------------------------------------------------------------
  // Achievement definitions
  // ------------------------------------------------------------------
  const achievements = [
    {
      slug: "first-contact",
      title: "First Contact",
      description: "Complete your first learning activity.",
      category: "exploration",
      rewardXp: 5,
      badgeIcon: "sparkles",
      criteria: { kind: "lesson_completed", count: 1 },
    },
    {
      slug: "cartographer",
      title: "Cartographer",
      description: "Explore five concepts in one roadmap.",
      category: "exploration",
      rewardXp: 20,
      badgeIcon: "map",
      criteria: { kind: "nodes_discovered", count: 5, roadmap: "web-developer" },
    },
    {
      slug: "pathfinder",
      title: "Pathfinder",
      description: "Complete a foundational roadmap section.",
      category: "learning",
      rewardXp: 30,
      badgeIcon: "flag",
      criteria: { kind: "roadmap_section_completed", count: 1 },
    },
    {
      slug: "deep-thinker",
      title: "Deep Thinker",
      description: "Correctly explain a difficult concept.",
      category: "learning",
      rewardXp: 25,
      badgeIcon: "brain",
      criteria: { kind: "assessment_passed", difficulty: "INTERMEDIATE" },
    },
    {
      slug: "recall-specialist",
      title: "Recall Specialist",
      description: "Successfully review previously learned concepts.",
      category: "learning",
      rewardXp: 15,
      badgeIcon: "refresh-ccw",
      criteria: { kind: "review_completed", count: 3 },
    },
    {
      slug: "builder",
      title: "Builder",
      description: "Complete a project milestone.",
      category: "practice",
      rewardXp: 30,
      badgeIcon: "hammer",
      criteria: { kind: "milestone_completed", count: 1 },
    },
    {
      slug: "first-mastery",
      title: "First Mastery",
      description: "Demonstrate mastery of a topic.",
      category: "mastery",
      rewardXp: 50,
      badgeIcon: "award",
      criteria: { kind: "tier_reached", tier: "MASTERED", count: 1 },
    },
    {
      slug: "steady-learner",
      title: "Steady Learner",
      description: "Learn on three separate days.",
      category: "consistency",
      rewardXp: 25,
      badgeIcon: "flame",
      criteria: { kind: "streak_days", count: 3 },
    },
    {
      slug: "first-artifact",
      title: "First Artifact",
      description: "Submit your first project.",
      category: "projects",
      rewardXp: 40,
      badgeIcon: "folder",
      criteria: { kind: "project_submitted", count: 1 },
    },
    {
      slug: "boss-slayer",
      title: "Boss Slayer",
      description: "Pass a comprehensive boss assessment.",
      category: "mastery",
      rewardXp: 75,
      badgeIcon: "trophy",
      criteria: { kind: "boss_passed", count: 1 },
    },
  ];

  for (const a of achievements) {
    const { criteria, ...rest } = a;
    await prisma.achievementDefinition.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        ...rest,
        unlockCriteria: criteria as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // ------------------------------------------------------------------
  // Quest definitions (daily + roadmap)
  // ------------------------------------------------------------------
  const webRoadmapId = wd.id;
  const quests = [
    {
      slug: "daily-learn-one",
      title: "Learn One New Concept",
      description: "Complete one lesson and its comprehension check.",
      questType: "DAILY" as const,
      objectives: [{ kind: "lesson", target: "", count: 1 }],
      rewardXp: 10,
      expiresAt: null,
    },
    {
      slug: "daily-review-three",
      title: "Review Three Concepts",
      description: "Review three previously studied concepts.",
      questType: "DAILY" as const,
      objectives: [{ kind: "review", target: "", count: 3 }],
      rewardXp: 10,
      expiresAt: null,
    },
    {
      slug: "web-intro",
      title: "First Steps on the Web",
      description: "Begin the Web Developer roadmap with HTML Basics.",
      questType: "ROADMAP" as const,
      roadmapId: webRoadmapId,
      objectives: [{ kind: "lesson", target: "html-basics", count: 1 }],
      rewardXp: 10,
      expiresAt: null,
    },
  ];

  for (const q of quests) {
    await prisma.questDefinition.upsert({
      where: { slug: q.slug },
      update: {},
      create: {
        ...q,
        objectives: q.objectives as unknown as Prisma.InputJsonValue,
        ...(q.roadmapId ? { roadmapId: q.roadmapId } : {}),
        availabilityRules: {} as unknown as Prisma.InputJsonValue,
      },
    });
  }

  // ------------------------------------------------------------------
  // Starter cosmetics
  // ------------------------------------------------------------------
  const cosmetics = [
    {
      slug: "apprentice-cape",
      name: "Apprentice Cape",
      description: "A humble cape for new learners.",
      cosmeticType: CosmeticType.AVATAR_ACCESSORY,
      unlockCriteria: { kind: "level", level: 5 } as unknown as Prisma.InputJsonValue,
      sparkCost: 0,
    },
    {
      slug: "map-parchment",
      name: "Parchment Map Theme",
      description: "View your world on aged parchment.",
      cosmeticType: CosmeticType.MAP_THEME,
      unlockCriteria: { kind: "achievement", slug: "pathfinder" } as unknown as Prisma.InputJsonValue,
      sparkCost: 0,
    },
  ];

  for (const c of cosmetics) {
    await prisma.cosmeticItem.upsert({
      where: { slug: c.slug },
      update: {},
      create: c as unknown as Prisma.CosmeticItemCreateInput,
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
