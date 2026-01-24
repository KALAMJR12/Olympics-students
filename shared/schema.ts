import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, pgEnum, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const matchStatusEnum = pgEnum("match_status", ["waiting", "live", "completed"]);
export const questionModeEnum = pgEnum("question_mode", ["competition", "practice"]);
export const paymentTypeEnum = pgEnum("payment_type", ["registration", "tokens"]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "completed", "failed"]);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  playerAnswers: many(playerAnswers),
  payments: many(payments),
}));

// Teams table
export const teams = pgTable("teams", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  practiceTokens: integer("practice_tokens").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const teamsRelations = relations(teams, ({ one, many }) => ({
  creator: one(users, { fields: [teams.createdBy], references: [users.id] }),
  members: many(teamMembers),
  registrations: many(competitionRegistrations),
  homeMatches: many(matches, { relationName: "homeTeam" }),
  awayMatches: many(matches, { relationName: "awayTeam" }),
  standings: many(standings),
  tokenTransactions: many(tokenTransactions),
}));

// Team Members (junction table)
export const teamMembers = pgTable("team_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
}));

// Competitions table
export const competitions = pgTable("competitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  registrationFee: decimal("registration_fee", { precision: 10, scale: 2 }).notNull(),
  maxTeams: integer("max_teams").default(20).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  registrationDeadline: timestamp("registration_deadline").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const competitionsRelations = relations(competitions, ({ many }) => ({
  registrations: many(competitionRegistrations),
  matches: many(matches),
  standings: many(standings),
  questions: many(questions),
}));

// Competition Registrations
export const competitionRegistrations = pgTable("competition_registrations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitionId: varchar("competition_id").references(() => competitions.id).notNull(),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  paidBy: varchar("paid_by").references(() => users.id).notNull(),
  paymentId: varchar("payment_id").references(() => payments.id),
  registeredAt: timestamp("registered_at").defaultNow().notNull(),
});

export const competitionRegistrationsRelations = relations(competitionRegistrations, ({ one }) => ({
  competition: one(competitions, { fields: [competitionRegistrations.competitionId], references: [competitions.id] }),
  team: one(teams, { fields: [competitionRegistrations.teamId], references: [teams.id] }),
  payer: one(users, { fields: [competitionRegistrations.paidBy], references: [users.id] }),
  payment: one(payments, { fields: [competitionRegistrations.paymentId], references: [payments.id] }),
}));

// Matches table
export const matches = pgTable("matches", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitionId: varchar("competition_id").references(() => competitions.id).notNull(),
  homeTeamId: varchar("home_team_id").references(() => teams.id).notNull(),
  awayTeamId: varchar("away_team_id").references(() => teams.id).notNull(),
  round: integer("round").notNull(),
  scheduledAt: timestamp("scheduled_at").notNull(),
  status: matchStatusEnum("status").default("waiting").notNull(),
  homeScore: integer("home_score").default(0).notNull(),
  awayScore: integer("away_score").default(0).notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const matchesRelations = relations(matches, ({ one, many }) => ({
  competition: one(competitions, { fields: [matches.competitionId], references: [competitions.id] }),
  homeTeam: one(teams, { fields: [matches.homeTeamId], references: [teams.id], relationName: "homeTeam" }),
  awayTeam: one(teams, { fields: [matches.awayTeamId], references: [teams.id], relationName: "awayTeam" }),
  playerAnswers: many(playerAnswers),
  matchQuestions: many(matchQuestions),
}));

// Match Questions (questions assigned to a specific match)
export const matchQuestions = pgTable("match_questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").references(() => matches.id).notNull(),
  questionId: varchar("question_id").references(() => questions.id).notNull(),
  questionOrder: integer("question_order").notNull(),
});

export const matchQuestionsRelations = relations(matchQuestions, ({ one }) => ({
  match: one(matches, { fields: [matchQuestions.matchId], references: [matches.id] }),
  question: one(questions, { fields: [matchQuestions.questionId], references: [questions.id] }),
}));

// Questions table
export const questions = pgTable("questions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitionId: varchar("competition_id").references(() => competitions.id),
  questionText: text("question_text").notNull(),
  optionA: text("option_a").notNull(),
  optionB: text("option_b").notNull(),
  optionC: text("option_c").notNull(),
  optionD: text("option_d").notNull(),
  correctAnswer: text("correct_answer").notNull(),
  subject: text("subject").notNull(),
  difficulty: text("difficulty").default("medium").notNull(),
  mode: questionModeEnum("mode").notNull(),
  timeLimit: integer("time_limit").default(30).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const questionsRelations = relations(questions, ({ one, many }) => ({
  competition: one(competitions, { fields: [questions.competitionId], references: [competitions.id] }),
  playerAnswers: many(playerAnswers),
  matchQuestions: many(matchQuestions),
}));

// Player Answers
export const playerAnswers = pgTable("player_answers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  matchId: varchar("match_id").references(() => matches.id).notNull(),
  questionId: varchar("question_id").references(() => questions.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  answer: text("answer"),
  isCorrect: boolean("is_correct").default(false).notNull(),
  answeredAt: timestamp("answered_at").defaultNow().notNull(),
  timeTaken: integer("time_taken"),
});

export const playerAnswersRelations = relations(playerAnswers, ({ one }) => ({
  match: one(matches, { fields: [playerAnswers.matchId], references: [matches.id] }),
  question: one(questions, { fields: [playerAnswers.questionId], references: [questions.id] }),
  user: one(users, { fields: [playerAnswers.userId], references: [users.id] }),
  team: one(teams, { fields: [playerAnswers.teamId], references: [teams.id] }),
}));

// Standings table
export const standings = pgTable("standings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  competitionId: varchar("competition_id").references(() => competitions.id).notNull(),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  played: integer("played").default(0).notNull(),
  won: integer("won").default(0).notNull(),
  drawn: integer("drawn").default(0).notNull(),
  lost: integer("lost").default(0).notNull(),
  pointsFor: integer("points_for").default(0).notNull(),
  pointsAgainst: integer("points_against").default(0).notNull(),
  goalDifference: integer("goal_difference").default(0).notNull(),
  leaguePoints: integer("league_points").default(0).notNull(),
});

export const standingsRelations = relations(standings, ({ one }) => ({
  competition: one(competitions, { fields: [standings.competitionId], references: [competitions.id] }),
  team: one(teams, { fields: [standings.teamId], references: [teams.id] }),
}));

// Practice Tokens & Transactions
export const tokenTransactions = pgTable("token_transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  paymentId: varchar("payment_id").references(() => payments.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tokenTransactionsRelations = relations(tokenTransactions, ({ one }) => ({
  team: one(teams, { fields: [tokenTransactions.teamId], references: [teams.id] }),
  user: one(users, { fields: [tokenTransactions.userId], references: [users.id] }),
  payment: one(payments, { fields: [tokenTransactions.paymentId], references: [payments.id] }),
}));

// Payments table
export const payments = pgTable("payments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  teamId: varchar("team_id").references(() => teams.id),
  competitionId: varchar("competition_id").references(() => competitions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  type: paymentTypeEnum("type").notNull(),
  status: paymentStatusEnum("status").default("pending").notNull(),
  reference: text("reference").unique(),
  providerReference: text("provider_reference"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  team: one(teams, { fields: [payments.teamId], references: [teams.id] }),
  competition: one(competitions, { fields: [payments.competitionId], references: [competitions.id] }),
}));

// Practice Sessions
export const practiceSessions = pgTable("practice_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(),
  status: text("status").default("active").notNull(),
  score: integer("score").default(0).notNull(),
  totalQuestions: integer("total_questions").default(0).notNull(),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

export const practiceSessionsRelations = relations(practiceSessions, ({ one }) => ({
  team: one(teams, { fields: [practiceSessions.teamId], references: [teams.id] }),
  user: one(users, { fields: [practiceSessions.userId], references: [users.id] }),
}));

// Team Invitations
export const teamInvitations = pgTable("team_invitations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: varchar("team_id").references(() => teams.id).notNull(),
  email: text("email").notNull(),
  invitedBy: varchar("invited_by").references(() => users.id).notNull(),
  status: text("status").default("pending").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
});

export const teamInvitationsRelations = relations(teamInvitations, ({ one }) => ({
  team: one(teams, { fields: [teamInvitations.teamId], references: [teams.id] }),
  inviter: one(users, { fields: [teamInvitations.invitedBy], references: [users.id] }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true, practiceTokens: true });
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, joinedAt: true });
export const insertCompetitionSchema = createInsertSchema(competitions).omit({ id: true, createdAt: true, isActive: true });
export const insertCompetitionRegistrationSchema = createInsertSchema(competitionRegistrations).omit({ id: true, registeredAt: true });
export const insertMatchSchema = createInsertSchema(matches).omit({ id: true, homeScore: true, awayScore: true, startedAt: true, completedAt: true });
export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true, createdAt: true });
export const insertPlayerAnswerSchema = createInsertSchema(playerAnswers).omit({ id: true, answeredAt: true });
export const insertStandingSchema = createInsertSchema(standings).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(payments).omit({ id: true, createdAt: true, completedAt: true });
export const insertTokenTransactionSchema = createInsertSchema(tokenTransactions).omit({ id: true, createdAt: true });
export const insertPracticeSessionSchema = createInsertSchema(practiceSessions).omit({ id: true, startedAt: true, completedAt: true, score: true, totalQuestions: true });
export const insertTeamInvitationSchema = createInsertSchema(teamInvitations).omit({ id: true, createdAt: true, status: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = z.infer<typeof insertCompetitionSchema>;
export type CompetitionRegistration = typeof competitionRegistrations.$inferSelect;
export type InsertCompetitionRegistration = z.infer<typeof insertCompetitionRegistrationSchema>;
export type Match = typeof matches.$inferSelect;
export type InsertMatch = z.infer<typeof insertMatchSchema>;
export type Question = typeof questions.$inferSelect;
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type PlayerAnswer = typeof playerAnswers.$inferSelect;
export type InsertPlayerAnswer = z.infer<typeof insertPlayerAnswerSchema>;
export type Standing = typeof standings.$inferSelect;
export type InsertStanding = z.infer<typeof insertStandingSchema>;
export type Payment = typeof payments.$inferSelect;
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type TokenTransaction = typeof tokenTransactions.$inferSelect;
export type InsertTokenTransaction = z.infer<typeof insertTokenTransactionSchema>;
export type PracticeSession = typeof practiceSessions.$inferSelect;
export type InsertPracticeSession = z.infer<typeof insertPracticeSessionSchema>;
export type TeamInvitation = typeof teamInvitations.$inferSelect;
export type InsertTeamInvitation = z.infer<typeof insertTeamInvitationSchema>;
export type MatchQuestion = typeof matchQuestions.$inferSelect;

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = insertUserSchema.extend({
  email: z.string().email("Invalid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
