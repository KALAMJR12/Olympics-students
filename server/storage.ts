import { 
  users, teams, teamMembers, competitions, competitionRegistrations, 
  matches, matchQuestions, questions, playerAnswers, standings, 
  tokenTransactions, payments, practiceSessions, teamInvitations,
  type User, type InsertUser, type Team, type InsertTeam, 
  type TeamMember, type InsertTeamMember, type Competition, type InsertCompetition,
  type CompetitionRegistration, type InsertCompetitionRegistration,
  type Match, type InsertMatch, type Question, type InsertQuestion,
  type PlayerAnswer, type InsertPlayerAnswer, type Standing, type InsertStanding,
  type TokenTransaction, type InsertTokenTransaction, type Payment, type InsertPayment,
  type PracticeSession, type InsertPracticeSession, type TeamInvitation, type InsertTeamInvitation
} from "@shared/schema";
import { db } from "./db";
import { eq, and, or, sql, desc, inArray } from "drizzle-orm";
import { LocalStorageAdapter } from "./local-storage";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<User>): Promise<User | undefined>;

  // Teams
  getTeam(id: string): Promise<Team | undefined>;
  getTeamsByUser(userId: string): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, data: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<void>;
  getTeamWithMembers(id: string): Promise<(Team & { members: { user: User }[] }) | undefined>;

  // Team Members
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  removeTeamMember(teamId: string, userId: string): Promise<void>;
  getTeamMembers(teamId: string): Promise<TeamMember[]>;
  isTeamMember(teamId: string, userId: string): Promise<boolean>;

  // Competitions
  getCompetition(id: string): Promise<Competition | undefined>;
  getAllCompetitions(): Promise<Competition[]>;
  getActiveCompetitions(): Promise<Competition[]>;
  createCompetition(competition: InsertCompetition): Promise<Competition>;
  updateCompetition(id: string, data: Partial<Competition>): Promise<Competition | undefined>;

  // Competition Registrations
  registerTeam(registration: InsertCompetitionRegistration): Promise<CompetitionRegistration>;
  getRegisteredTeams(competitionId: string): Promise<CompetitionRegistration[]>;
  getTeamRegistrations(teamId: string): Promise<CompetitionRegistration[]>;
  isTeamRegistered(competitionId: string, teamId: string): Promise<boolean>;

  // Matches
  getMatch(id: string): Promise<Match | undefined>;
  getMatchesByCompetition(competitionId: string): Promise<Match[]>;
  getUpcomingMatchesForTeam(teamId: string): Promise<Match[]>;
  createMatch(match: InsertMatch): Promise<Match>;
  updateMatch(id: string, data: Partial<Match>): Promise<Match | undefined>;
  getMatchWithTeams(id: string): Promise<(Match & { homeTeam: Team; awayTeam: Team }) | undefined>;

  // Questions
  getQuestion(id: string): Promise<Question | undefined>;
  getQuestionsByMode(mode: "competition" | "practice", limit?: number): Promise<Question[]>;
  getQuestionsByCompetition(competitionId: string): Promise<Question[]>;
  createQuestion(question: InsertQuestion): Promise<Question>;
  getAllQuestions(): Promise<Question[]>;

  // Player Answers
  submitAnswer(answer: InsertPlayerAnswer): Promise<PlayerAnswer>;
  getAnswersByMatch(matchId: string): Promise<PlayerAnswer[]>;
  getPlayerScoresByMatch(matchId: string): Promise<Record<string, number>>;

  // Standings
  getStandingsByCompetition(competitionId: string): Promise<Standing[]>;
  updateStanding(id: string, data: Partial<Standing>): Promise<Standing | undefined>;
  createStanding(standing: InsertStanding): Promise<Standing>;
  getStandingForTeam(competitionId: string, teamId: string): Promise<Standing | undefined>;

  // Token Transactions
  createTokenTransaction(transaction: InsertTokenTransaction): Promise<TokenTransaction>;
  getTransactionsByTeam(teamId: string): Promise<TokenTransaction[]>;

  // Payments
  createPayment(payment: InsertPayment): Promise<Payment>;
  getPayment(id: string): Promise<Payment | undefined>;
  getPaymentsByUser(userId: string): Promise<Payment[]>;
  updatePayment(id: string, data: Partial<Payment>): Promise<Payment | undefined>;

  // Practice Sessions
  createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession>;
  getPracticeSession(id: string): Promise<PracticeSession | undefined>;
  updatePracticeSession(id: string, data: Partial<PracticeSession>): Promise<PracticeSession | undefined>;
  getRecentSessionsByUser(userId: string, limit?: number): Promise<PracticeSession[]>;

  // Team Invitations
  createInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation>;
  getInvitationsByEmail(email: string): Promise<TeamInvitation[]>;
  getInvitationsByTeam(teamId: string): Promise<TeamInvitation[]>;
  updateInvitation(id: string, data: Partial<TeamInvitation>): Promise<TeamInvitation | undefined>;

  // Dashboard data
  getDashboardData(userId: string): Promise<any>;
  getAdminData(): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    if (!db) throw new Error("Database not initialized");
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [user] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  // Teams
  async getTeam(id: string): Promise<Team | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [team] = await db!.select().from(teams).where(eq(teams.id, id));
    return team || undefined;
  }

  async getTeamsByUser(userId: string): Promise<Team[]> {
    if (!db) throw new Error("Database not initialized");
    const memberRows = await db!.select().from(teamMembers).where(eq(teamMembers.userId, userId));
    if (memberRows.length === 0) return [];
    
    const teamIds = memberRows.map(m => m.teamId);
    return db!.select().from(teams).where(inArray(teams.id, teamIds));
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    if (!db) throw new Error("Database not initialized");
    const [newTeam] = await db!.insert(teams).values(team).returning();
    return newTeam;
  }

  async updateTeam(id: string, data: Partial<Team>): Promise<Team | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [team] = await db!.update(teams).set(data).where(eq(teams.id, id)).returning();
    return team || undefined;
  }

  async deleteTeam(id: string): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    await db!.delete(teams).where(eq(teams.id, id));
  }

  async getTeamWithMembers(id: string): Promise<(Team & { members: { user: User }[] }) | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [team] = await db!.select().from(teams).where(eq(teams.id, id));
    if (!team) return undefined;

    const members = await db!
      .select({ user: users })
      .from(teamMembers)
      .innerJoin(users, eq(teamMembers.userId, users.id))
      .where(eq(teamMembers.teamId, id));

    return { ...team, members };
  }

  // Team Members
  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    if (!db) throw new Error("Database not initialized");
    const [newMember] = await db!.insert(teamMembers).values(member).returning();
    return newMember;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    if (!db) throw new Error("Database not initialized");
    await db!.delete(teamMembers).where(
      and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId))
    );
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(teamMembers).where(eq(teamMembers.teamId, teamId));
  }

  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    if (!db) throw new Error("Database not initialized");
    const [member] = await db!.select().from(teamMembers)
      .where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
    return !!member;
  }

  // Competitions
  async getCompetition(id: string): Promise<Competition | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [competition] = await db!.select().from(competitions).where(eq(competitions.id, id));
    return competition || undefined;
  }

  async getAllCompetitions(): Promise<Competition[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(competitions).orderBy(desc(competitions.createdAt));
  }

  async getActiveCompetitions(): Promise<Competition[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(competitions).where(eq(competitions.isActive, true));
  }

  async createCompetition(competition: InsertCompetition): Promise<Competition> {
    if (!db) throw new Error("Database not initialized");
    const [newCompetition] = await db!.insert(competitions).values(competition).returning();
    return newCompetition;
  }

  async updateCompetition(id: string, data: Partial<Competition>): Promise<Competition | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [competition] = await db!.update(competitions).set(data).where(eq(competitions.id, id)).returning();
    return competition || undefined;
  }

  // Competition Registrations
  async registerTeam(registration: InsertCompetitionRegistration): Promise<CompetitionRegistration> {
    if (!db) throw new Error("Database not initialized");
    const [newRegistration] = await db!.insert(competitionRegistrations).values(registration).returning();
    return newRegistration;
  }

  async getRegisteredTeams(competitionId: string): Promise<CompetitionRegistration[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(competitionRegistrations).where(eq(competitionRegistrations.competitionId, competitionId));
  }

  async getTeamRegistrations(teamId: string): Promise<CompetitionRegistration[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(competitionRegistrations).where(eq(competitionRegistrations.teamId, teamId));
  }

  async isTeamRegistered(competitionId: string, teamId: string): Promise<boolean> {
    if (!db) throw new Error("Database not initialized");
    const [reg] = await db!.select().from(competitionRegistrations)
      .where(and(
        eq(competitionRegistrations.competitionId, competitionId),
        eq(competitionRegistrations.teamId, teamId)
      ));
    return !!reg;
  }

  // Matches
  async getMatch(id: string): Promise<Match | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [match] = await db!.select().from(matches).where(eq(matches.id, id));
    return match || undefined;
  }

  async getMatchesByCompetition(competitionId: string): Promise<Match[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(matches).where(eq(matches.competitionId, competitionId));
  }

  async getUpcomingMatchesForTeam(teamId: string): Promise<Match[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(matches)
      .where(
        and(
          or(eq(matches.homeTeamId, teamId), eq(matches.awayTeamId, teamId)),
          eq(matches.status, "waiting")
        )
      )
      .orderBy(matches.scheduledAt);
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    if (!db) throw new Error("Database not initialized");
    const [newMatch] = await db!.insert(matches).values(match).returning();
    return newMatch;
  }

  async updateMatch(id: string, data: Partial<Match>): Promise<Match | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [match] = await db!.update(matches).set(data).where(eq(matches.id, id)).returning();
    return match || undefined;
  }

  async getMatchWithTeams(id: string): Promise<(Match & { homeTeam: Team; awayTeam: Team }) | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [match] = await db!.select().from(matches).where(eq(matches.id, id));
    if (!match) return undefined;

    const [homeTeam] = await db!.select().from(teams).where(eq(teams.id, match.homeTeamId));
    const [awayTeam] = await db!.select().from(teams).where(eq(teams.id, match.awayTeamId));
    
    if (!homeTeam || !awayTeam) return undefined;
    
    return { ...match, homeTeam, awayTeam };
  }

  // Questions
  async getQuestion(id: string): Promise<Question | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [question] = await db!.select().from(questions).where(eq(questions.id, id));
    return question || undefined;
  }

  async getQuestionsByMode(mode: "competition" | "practice", limit = 20): Promise<Question[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(questions)
      .where(eq(questions.mode, mode))
      .orderBy(sql`RANDOM()`)
      .limit(limit);
  }

  async getQuestionsByCompetition(competitionId: string): Promise<Question[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(questions).where(eq(questions.competitionId, competitionId));
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    if (!db) throw new Error("Database not initialized");
    const [newQuestion] = await db!.insert(questions).values(question).returning();
    return newQuestion;
  }

  async getAllQuestions(): Promise<Question[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(questions).orderBy(desc(questions.createdAt));
  }

  // Player Answers
  async submitAnswer(answer: InsertPlayerAnswer): Promise<PlayerAnswer> {
    if (!db) throw new Error("Database not initialized");
    const [newAnswer] = await db!.insert(playerAnswers).values(answer).returning();
    return newAnswer;
  }

  async getAnswersByMatch(matchId: string): Promise<PlayerAnswer[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(playerAnswers).where(eq(playerAnswers.matchId, matchId));
  }

  async getPlayerScoresByMatch(matchId: string): Promise<Record<string, number>> {
    if (!db) throw new Error("Database not initialized");
    const answers = await this.getAnswersByMatch(matchId);
    const scores: Record<string, number> = {};
    
    for (const answer of answers) {
      if (!scores[answer.userId]) scores[answer.userId] = 0;
      if (answer.isCorrect) scores[answer.userId]++;
    }
    
    return scores;
  }

  // Standings
  async getStandingsByCompetition(competitionId: string): Promise<Standing[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(standings)
      .where(eq(standings.competitionId, competitionId))
      .orderBy(desc(standings.leaguePoints), desc(standings.goalDifference));
  }

  async updateStanding(id: string, data: Partial<Standing>): Promise<Standing | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [standing] = await db!.update(standings).set(data).where(eq(standings.id, id)).returning();
    return standing || undefined;
  }

  async createStanding(standing: InsertStanding): Promise<Standing> {
    if (!db) throw new Error("Database not initialized");
    const [newStanding] = await db!.insert(standings).values(standing).returning();
    return newStanding;
  }

  async getStandingForTeam(competitionId: string, teamId: string): Promise<Standing | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [standing] = await db!.select().from(standings)
      .where(and(eq(standings.competitionId, competitionId), eq(standings.teamId, teamId)));
    return standing || undefined;
  }

  // Token Transactions
  async createTokenTransaction(transaction: InsertTokenTransaction): Promise<TokenTransaction> {
    if (!db) throw new Error("Database not initialized");
    const [newTransaction] = await db!.insert(tokenTransactions).values(transaction).returning();
    return newTransaction;
  }

  async getTransactionsByTeam(teamId: string): Promise<TokenTransaction[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(tokenTransactions)
      .where(eq(tokenTransactions.teamId, teamId))
      .orderBy(desc(tokenTransactions.createdAt));
  }

  // Payments
  async createPayment(payment: InsertPayment): Promise<Payment> {
    if (!db) throw new Error("Database not initialized");
    const [newPayment] = await db!.insert(payments).values(payment).returning();
    return newPayment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [payment] = await db!.select().from(payments).where(eq(payments.id, id));
    return payment || undefined;
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(payments)
      .where(eq(payments.userId, userId))
      .orderBy(desc(payments.createdAt));
  }

  async updatePayment(id: string, data: Partial<Payment>): Promise<Payment | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [payment] = await db!.update(payments).set(data).where(eq(payments.id, id)).returning();
    return payment || undefined;
  }

  // Practice Sessions
  async createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession> {
    if (!db) throw new Error("Database not initialized");
    const [newSession] = await db!.insert(practiceSessions).values(session).returning();
    return newSession;
  }

  async getPracticeSession(id: string): Promise<PracticeSession | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [session] = await db!.select().from(practiceSessions).where(eq(practiceSessions.id, id));
    return session || undefined;
  }

  async updatePracticeSession(id: string, data: Partial<PracticeSession>): Promise<PracticeSession | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [session] = await db!.update(practiceSessions).set(data).where(eq(practiceSessions.id, id)).returning();
    return session || undefined;
  }

  async getRecentSessionsByUser(userId: string, limit = 10): Promise<PracticeSession[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(practiceSessions)
      .where(eq(practiceSessions.userId, userId))
      .orderBy(desc(practiceSessions.startedAt))
      .limit(limit);
  }

  // Team Invitations
  async createInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    if (!db) throw new Error("Database not initialized");
    const [newInvitation] = await db!.insert(teamInvitations).values(invitation).returning();
    return newInvitation;
  }

  async getInvitationsByEmail(email: string): Promise<TeamInvitation[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(teamInvitations)
      .where(and(eq(teamInvitations.email, email), eq(teamInvitations.status, "pending")));
  }

  async getInvitationsByTeam(teamId: string): Promise<TeamInvitation[]> {
    if (!db) throw new Error("Database not initialized");
    return db!.select().from(teamInvitations).where(eq(teamInvitations.teamId, teamId));
  }

  async updateInvitation(id: string, data: Partial<TeamInvitation>): Promise<TeamInvitation | undefined> {
    if (!db) throw new Error("Database not initialized");
    const [invitation] = await db!.update(teamInvitations).set(data).where(eq(teamInvitations.id, id)).returning();
    return invitation || undefined;
  }

  // Dashboard Data
  async getDashboardData(userId: string): Promise<any> {
    if (!db) throw new Error("Database not initialized");
    const userTeams = await this.getTeamsByUser(userId);
    const teamIds = userTeams.map(t => t.id);
    
    const teamsWithMembers = await Promise.all(
      userTeams.map(async (team) => {
        const members = await this.getTeamMembers(team.id);
        return { ...team, memberCount: members.length };
      })
    );

    let upcomingMatches: any[] = [];
    let standingsData: any[] = [];
    
    if (teamIds.length > 0) {
      const allMatches = await db!.select().from(matches)
        .where(or(
          inArray(matches.homeTeamId, teamIds),
          inArray(matches.awayTeamId, teamIds)
        ))
        .orderBy(matches.scheduledAt)
        .limit(10);

      upcomingMatches = await Promise.all(
        allMatches.map(async (match) => {
          const homeTeam = await this.getTeam(match.homeTeamId);
          const awayTeam = await this.getTeam(match.awayTeamId);
          const competition = await this.getCompetition(match.competitionId);
          return { ...match, homeTeam, awayTeam, competition };
        })
      );

      const allStandings = await db!.select().from(standings)
        .where(inArray(standings.teamId, teamIds));
      
      standingsData = await Promise.all(
        allStandings.map(async (standing) => {
          const team = await this.getTeam(standing.teamId);
          const competition = await this.getCompetition(standing.competitionId);
          return { ...standing, team, competition };
        })
      );
    }

    const activeCompetitions = await this.getActiveCompetitions();
    const totalTokens = userTeams.reduce((sum, t) => sum + t.practiceTokens, 0);

    return {
      teams: teamsWithMembers,
      upcomingMatches,
      standings: standingsData,
      totalTokens,
      activeCompetitions,
    };
  }

  // Admin Data
  async getAdminData(): Promise<any> {
    if (!db) throw new Error("Database not initialized");
    const allCompetitions = await this.getAllCompetitions();
    const allQuestions = await this.getAllQuestions();
    
    const allMatches = await db!.select().from(matches).orderBy(desc(matches.scheduledAt)).limit(50);
    const matchesWithDetails = await Promise.all(
      allMatches.map(async (match) => {
        const homeTeam = await this.getTeam(match.homeTeamId);
        const awayTeam = await this.getTeam(match.awayTeamId);
        const competition = await this.getCompetition(match.competitionId);
        return { ...match, homeTeam, awayTeam, competition };
      })
    );

    const allPayments = await db!.select().from(payments).orderBy(desc(payments.createdAt)).limit(50);
    const paymentsWithTeams = await Promise.all(
      allPayments.map(async (payment) => {
        const team = payment.teamId ? await this.getTeam(payment.teamId) : undefined;
        return { ...payment, team };
      })
    );

    const [userCount] = await db!.select({ count: sql<number>`count(*)` }).from(users);
    const [teamCount] = await db!.select({ count: sql<number>`count(*)` }).from(teams);
    const [revenueResult] = await db!.select({ 
      total: sql<number>`COALESCE(SUM(amount), 0)` 
    }).from(payments).where(eq(payments.status, "completed"));

    return {
      competitions: allCompetitions,
      questions: allQuestions,
      matches: matchesWithDetails,
      payments: paymentsWithTeams,
      stats: {
        totalUsers: Number(userCount.count) || 0,
        totalTeams: Number(teamCount.count) || 0,
        totalRevenue: Number(revenueResult.total) || 0,
        activeCompetitions: allCompetitions.filter(c => c.isActive).length,
      },
    };
  }
}

export const storage: IStorage = db ? new DatabaseStorage() : new LocalStorageAdapter();
