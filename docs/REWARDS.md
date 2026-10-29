# Pathforge — Reward Rules, XP Economy & Progression

This document describes the gamification reward system implemented in Pathforge
(MVP, sections 1-19 of the design). It is the authoritative reference for the
XP economy, progression logic, database migrations, implemented features, test
commands, and known limitations.

---

## Core principle

**Reward demonstrated learning, not merely activity.** Every XP award is
generated server-side from a validated educational event. The client can never
submit arbitrary XP, and no event is rewarded more than once.

---

## Data model extensions (prisma/schema.prisma)

New models added to the existing schema (see `prisma/migrations/`):

| Model | Purpose |
|-------|---------|
| `UserGameProfile` | Persistent learner profile: level, totalXP, streak, cosmetics |
| `XPTransaction` | Auditable, idempotent XP award ledger (`eventId` unique) |
| `AchievementDefinition` | Achievement unlock criteria + reward config |
| `UserAchievement` | Achievements earned by a user (once each) |
| `QuestDefinition` | Quest templates (daily/weekly/roadmap/personalized) |
| `UserQuest` | A user's quest instances and progress |
| `Challenge` | Dungeon/boss practice challenges |
| `ChallengeAttempt` | Challenge attempts with results and feedback |
| `UserMasteryEvidence` | Evidence records behind mastery tiers |
| `UserStreakRecord` | Per-day qualifying activity records |
| `CosmeticItem` | Optional cosmetic items |
| `UserCosmeticInventory` | Owned cosmetics |
| `SeasonalEvent` | Time-limited learning events |
| `UserSkillProgress` | Per-skill-node progress/status/tier |

Existing models reused: `User`, `Roadmap`, `SkillNode`, `Lesson`,
`LessonCompletion`, `Assessment`, `AssessmentAttempt`, `Project`,
`ProjectMilestone`, `ProjectMilestoneCompletion`, `UserSettings`, `Session`.

Key constraints: `XPTransaction.eventId` is `@unique` (idempotency key);
`UserAchievement(userId, achievementId)` and
`UserStreakRecord(userId, localDate)` are unique; reward assignment and
progression updates run inside `prisma.$transaction`.

---

## XP policy (configurable)

Defined in `src/server/services/reward.ts` as `XP_POLICY`. Administrators can
edit these values; they are read server-side only.

| Event | XP |
|-------|-----|
| lesson_complete | 10 |
| assessment_pass | 15 |
| challenge_pass | 20 |
| boss_pass | 50 |
| milestone_complete | 30 |
| quest_complete | 10 |
| review_session | 10 |
| roadmap_complete | 200 (roadmap's `xpMilestoneReward` if set) |

For content-backed events (lesson, assessment, challenge, milestone), the
stored `xpReward` on the content record takes precedence over the policy
default.

---

## Level system

- Level 1 starts at 0 XP.
- Cumulative XP to reach level `L`: `floor(60 * (L-1)^1.4)`.
- `levelForXP(totalXP)` returns the highest reachable level.
- Progression ranks (game labels, not certifications):

| Level | Rank |
|-------|------|
| 1 | Initiate |
| 5 | Explorer |
| 10 | Apprentice |
| 20 | Practitioner |
| 35 | Specialist |
| 50 | Expert |
| 75 | Master |
| 100 | Grandmaster |

The server computes level from totalXP; the client never submits a level.

---

## Anti-exploitation rules

- Idempotency key (`eventId`) on every `XPTransaction` — replaying the same key
  returns the original award, never a duplicate.
- Client-submitted `amount` is ignored; the server resolves the amount from
  policy/content and validates eligibility.
- Lesson XP requires a real `LessonCompletion` record.
- Assessment/challenge/milestone/quest XP awarded once per item.
- Zero-amount transactions are still recorded (auditable, non-retryable).
- Failed attempts produce feedback without awarding the completion reward and
  without penalty.
- Time spent is not rewarded; only demonstrated outcomes are.

---

## Streak system

- A streak counts qualifying **days**, not app opens.
- Qualifying activities: lesson, assessment, challenge, milestone, review.
- Respects the user's configured timezone; daily reset at local midnight.
- Idempotent per (user, localDate) — repeated activity the same day does not
  double-count.
- Ending a streak never removes earned XP; no shame/guilt language.
- Users can hide the streak display (`UserGameProfile.hideStreakDisplay`).

---

## Mastery tiers (never granted by checkbox)

1. Discovered — topic opened
2. Understood — basic comprehension check passed
3. Practiced — relevant exercise completed
4. Demonstrated — demanding assessment/practical task passed
5. Mastered — sustained retention and application

Effective tier is computed from `UserMasteryEvidence` records with result
`PASS`, taking the highest tier reached. `syncSkillProgress` persists the
computed status/tier per skill node.

---

## Implemented features (MVP)

- User registration/login/session (cookie-based)
- User game profile, level, rank, XP progress
- XP transaction ledger with idempotency
- Domains, roadmaps, skill nodes, lessons, assessments
- Lesson completion → server-validated XP award (exactly once)
- Assessment submission → scoring → pass/fail → XP if passed
- Challenge (dungeon/boss) submission → XP if passed
- Project milestone completion → XP
- Daily + roadmap quests with progress tracking
- Mastery evidence + effective tier computation
- Streak recording and retrieval
- Achievements (definitions + earned list)
- Cosmetics (list, inventory, equipped) — optional, non-educational
- Personal world map (domains → roadmaps → mastery progress)
- Adventurer's hub dashboard (level, XP, roadmap, quests, streak, achievements)
- AI study companion (static guidance; degrades gracefully without a provider)
- Reduced-motion support, keyboard navigation, accessible progress indicators

---

## Test commands

```bash
# Start the embedded dev database
npm run db:start

# Apply migrations + seed (dev database)
npm run db:setup

# Run the test suite (applies migrations to TEST_DATABASE_URL)
npm test

# Typecheck
npm run typecheck

# Production build
npm run build

# Start dev server
npm run dev
```

Tests live in `tests/*.test.ts` and cover:
- XP awarding idempotency (exactly once)
- Ineligible events awarding zero
- Level/rank/progression computation
- Lesson-based XP
- Streak recording and consecutive-day accumulation
- Mastery evidence, highest-tier selection, failed-evidence handling

---

## Known limitations (MVP)

1. **Cosmetics economy** is present but "Sparks" currency is not implemented;
   cosmetics unlock via criteria and cost 0. Real-money purchase is explicitly
   out of scope for the MVP.
2. **Challenge assessment** is MVP-simplified: a submitted challenge is marked
   PASS on submission. Instructor review and rubric-based scoring are deferred.
3. **Seasonal events** model exists but no event UI or activity integration yet.
4. **Social features** (study groups, leaderboards, public profiles) are not
   implemented; no public XP leaderboard (by design).
5. **AI companion** runs in static mode unless `AI_PROVIDER` is configured
   (ollama/openai/gemini). It never grants mastery.
6. **Embedded PostgreSQL** (`@embedded-postgres`) is used for local/dev
   database management; production should use a managed PostgreSQL instance.
7. Rate limiting is in-memory (single-node). Production should back it with
   Redis.
8. The visual "personal world map" is rendered as a grid of domains/roadmaps;
   a rich canvas-style map is deferred.
