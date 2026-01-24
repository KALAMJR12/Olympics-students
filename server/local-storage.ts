import { 
  type User, type InsertUser, type Team, type InsertTeam, 
  type TeamMember, type InsertTeamMember, type Competition, type InsertCompetition,
  type CompetitionRegistration, type InsertCompetitionRegistration,
  type Match, type InsertMatch, type Question, type InsertQuestion,
  type PlayerAnswer, type InsertPlayerAnswer, type Standing, type InsertStanding,
  type TokenTransaction, type InsertTokenTransaction, type Payment, type InsertPayment,
  type PracticeSession, type InsertPracticeSession, type TeamInvitation, type InsertTeamInvitation
} from "@shared/schema";
import { type IStorage } from "./storage";

// Generate UUID-like string
function generateId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

interface LocalData {
  users: Record<string, User>;
  teams: Record<string, Team>;
  teamMembers: Record<string, TeamMember>;
  competitions: Record<string, Competition>;
  competitionRegistrations: Record<string, CompetitionRegistration>;
  matches: Record<string, Match>;
  questions: Record<string, Question>;
  playerAnswers: Record<string, PlayerAnswer>;
  standings: Record<string, Standing>;
  tokenTransactions: Record<string, TokenTransaction>;
  payments: Record<string, Payment>;
  practiceSessions: Record<string, PracticeSession>;
  teamInvitations: Record<string, TeamInvitation>;
}

export class LocalStorageAdapter implements IStorage {
  private data: LocalData = {
    users: {},
    teams: {},
    teamMembers: {},
    competitions: {},
    competitionRegistrations: {},
    matches: {},
    questions: {},
    playerAnswers: {},
    standings: {},
    tokenTransactions: {},
    payments: {},
    practiceSessions: {},
    teamInvitations: {},
  };

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.data.users[id];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Object.values(this.data.users).find(user => user.email === email);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Object.values(this.data.users).find(user => user.username === username);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const user: User = {
      ...insertUser,
      id: generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as User;
    this.data.users[user.id] = user;
    return user;
  }

  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    const user = this.data.users[id];
    if (!user) return undefined;
    const updated = { ...user, ...data, updatedAt: new Date() };
    this.data.users[id] = updated;
    return updated;
  }

  // Teams
  async getTeam(id: string): Promise<Team | undefined> {
    return this.data.teams[id];
  }

  async getTeamsByUser(userId: string): Promise<Team[]> {
    const teamIds = Object.values(this.data.teamMembers)
      .filter(m => m.userId === userId)
      .map(m => m.teamId);
    return teamIds.map(id => this.data.teams[id]).filter(Boolean);
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const newTeam: Team = {
      ...team,
      id: generateId(),
      createdAt: new Date(),
      practiceTokens: 0,
    } as unknown as Team;
    this.data.teams[newTeam.id] = newTeam;
    return newTeam;
  }

  async updateTeam(id: string, data: Partial<Team>): Promise<Team | undefined> {
    const team = this.data.teams[id];
    if (!team) return undefined;
    const updated = { ...team, ...data };
    this.data.teams[id] = updated;
    return updated;
  }

  async deleteTeam(id: string): Promise<void> {
    delete this.data.teams[id];
  }

  async getTeamWithMembers(id: string): Promise<(Team & { members: { user: User }[] }) | undefined> {
    const team = this.data.teams[id];
    if (!team) return undefined;

    const members = Object.values(this.data.teamMembers)
      .filter(m => m.teamId === id)
      .map(m => ({ user: this.data.users[m.userId] }))
      .filter(m => m.user);

    return { ...team, members } as any;
  }

  // Team Members
  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const newMember: TeamMember = {
      ...member,
      id: generateId(),
      joinedAt: new Date(),
    } as unknown as TeamMember;
    this.data.teamMembers[newMember.id] = newMember;
    return newMember;
  }

  async removeTeamMember(teamId: string, userId: string): Promise<void> {
    const members = Object.entries(this.data.teamMembers);
    for (const [id, member] of members) {
      if (member.teamId === teamId && member.userId === userId) {
        delete this.data.teamMembers[id];
      }
    }
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return Object.values(this.data.teamMembers).filter(m => m.teamId === teamId);
  }

  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    return Object.values(this.data.teamMembers).some(m => m.teamId === teamId && m.userId === userId);
  }

  // Competitions
  async getCompetition(id: string): Promise<Competition | undefined> {
    return this.data.competitions[id];
  }

  async getAllCompetitions(): Promise<Competition[]> {
    return Object.values(this.data.competitions).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  async getActiveCompetitions(): Promise<Competition[]> {
    return Object.values(this.data.competitions).filter(c => c.isActive);
  }

  async createCompetition(competition: InsertCompetition): Promise<Competition> {
    const newComp: Competition = {
      ...competition,
      id: generateId(),
      createdAt: new Date(),
      isActive: true,
    } as unknown as Competition;
    this.data.competitions[newComp.id] = newComp;
    return newComp;
  }

  async updateCompetition(id: string, data: Partial<Competition>): Promise<Competition | undefined> {
    const comp = this.data.competitions[id];
    if (!comp) return undefined;
    const updated = { ...comp, ...data };
    this.data.competitions[id] = updated;
    return updated;
  }

  // Competition Registrations
  async registerTeam(registration: InsertCompetitionRegistration): Promise<CompetitionRegistration> {
    const newReg: CompetitionRegistration = {
      ...registration,
      id: generateId(),
      registeredAt: new Date(),
    } as unknown as CompetitionRegistration;
    this.data.competitionRegistrations[newReg.id] = newReg;
    return newReg;
  }

  async getRegisteredTeams(competitionId: string): Promise<CompetitionRegistration[]> {
    return Object.values(this.data.competitionRegistrations).filter(r => r.competitionId === competitionId);
  }

  async getTeamRegistrations(teamId: string): Promise<CompetitionRegistration[]> {
    return Object.values(this.data.competitionRegistrations).filter(r => r.teamId === teamId);
  }

  async isTeamRegistered(competitionId: string, teamId: string): Promise<boolean> {
    return Object.values(this.data.competitionRegistrations).some(
      r => r.competitionId === competitionId && r.teamId === teamId
    );
  }

  // Matches
  async getMatch(id: string): Promise<Match | undefined> {
    return this.data.matches[id];
  }

  async getMatchesByCompetition(competitionId: string): Promise<Match[]> {
    return Object.values(this.data.matches).filter(m => m.competitionId === competitionId);
  }

  async getUpcomingMatchesForTeam(teamId: string): Promise<Match[]> {
    return Object.values(this.data.matches)
      .filter(m => (m.homeTeamId === teamId || m.awayTeamId === teamId) && m.status === "waiting")
      .sort((a, b) => (a.scheduledAt?.getTime() || 0) - (b.scheduledAt?.getTime() || 0));
  }

  async createMatch(match: InsertMatch): Promise<Match> {
    const newMatch: Match = {
      ...match,
      id: generateId(),
      homeScore: 0,
      awayScore: 0,
      startedAt: null,
      completedAt: null,
    } as unknown as Match;
    this.data.matches[newMatch.id] = newMatch;
    return newMatch;
  }

  async updateMatch(id: string, data: Partial<Match>): Promise<Match | undefined> {
    const match = this.data.matches[id];
    if (!match) return undefined;
    const updated = { ...match, ...data };
    this.data.matches[id] = updated;
    return updated;
  }

  async getMatchWithTeams(id: string): Promise<(Match & { homeTeam: Team; awayTeam: Team }) | undefined> {
    const match = this.data.matches[id];
    if (!match) return undefined;

    const homeTeam = this.data.teams[match.homeTeamId];
    const awayTeam = this.data.teams[match.awayTeamId];

    if (!homeTeam || !awayTeam) return undefined;

    return { ...match, homeTeam, awayTeam } as any;
  }

  // Questions
  async getQuestion(id: string): Promise<Question | undefined> {
    return this.data.questions[id];
  }

  async getQuestionsByMode(mode: "competition" | "practice", limit = 20): Promise<Question[]> {
    const filtered = Object.values(this.data.questions).filter(q => q.mode === mode);
    return filtered.sort(() => Math.random() - 0.5).slice(0, limit);
  }

  async getQuestionsByCompetition(competitionId: string): Promise<Question[]> {
    return Object.values(this.data.questions).filter(q => q.competitionId === competitionId);
  }

  async createQuestion(question: InsertQuestion): Promise<Question> {
    const newQuestion: Question = {
      ...question,
      id: generateId(),
      createdAt: new Date(),
    } as unknown as Question;
    this.data.questions[newQuestion.id] = newQuestion;
    return newQuestion;
  }

  async getAllQuestions(): Promise<Question[]> {
    return Object.values(this.data.questions).sort(
      (a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0)
    );
  }

  // Player Answers
  async submitAnswer(answer: InsertPlayerAnswer): Promise<PlayerAnswer> {
    const newAnswer: PlayerAnswer = {
      ...answer,
      id: generateId(),
      answeredAt: new Date(),
    } as unknown as PlayerAnswer;
    this.data.playerAnswers[newAnswer.id] = newAnswer;
    return newAnswer;
  }

  async getAnswersByMatch(matchId: string): Promise<PlayerAnswer[]> {
    return Object.values(this.data.playerAnswers).filter(a => a.matchId === matchId);
  }

  async getPlayerScoresByMatch(matchId: string): Promise<Record<string, number>> {
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
    return Object.values(this.data.standings)
      .filter(s => s.competitionId === competitionId)
      .sort((a, b) => {
        const pointDiff = (b.leaguePoints || 0) - (a.leaguePoints || 0);
        if (pointDiff !== 0) return pointDiff;
        return (b.goalDifference || 0) - (a.goalDifference || 0);
      });
  }

  async updateStanding(id: string, data: Partial<Standing>): Promise<Standing | undefined> {
    const standing = this.data.standings[id];
    if (!standing) return undefined;
    const updated = { ...standing, ...data };
    this.data.standings[id] = updated;
    return updated;
  }

  async createStanding(standing: InsertStanding): Promise<Standing> {
    const newStanding: Standing = {
      ...standing,
      id: generateId(),
    } as unknown as Standing;
    this.data.standings[newStanding.id] = newStanding;
    return newStanding;
  }

  async getStandingForTeam(competitionId: string, teamId: string): Promise<Standing | undefined> {
    return Object.values(this.data.standings).find(
      s => s.competitionId === competitionId && s.teamId === teamId
    );
  }

  // Token Transactions
  async createTokenTransaction(transaction: InsertTokenTransaction): Promise<TokenTransaction> {
    const newTransaction: TokenTransaction = {
      ...transaction,
      id: generateId(),
      createdAt: new Date(),
    } as unknown as TokenTransaction;
    this.data.tokenTransactions[newTransaction.id] = newTransaction;
    return newTransaction;
  }

  async getTransactionsByTeam(teamId: string): Promise<TokenTransaction[]> {
    return Object.values(this.data.tokenTransactions)
      .filter(t => t.teamId === teamId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Payments
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const newPayment: Payment = {
      ...payment,
      id: generateId(),
      createdAt: new Date(),
      completedAt: null,
    } as unknown as Payment;
    this.data.payments[newPayment.id] = newPayment;
    return newPayment;
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    return this.data.payments[id];
  }

  async getPaymentsByUser(userId: string): Promise<Payment[]> {
    return Object.values(this.data.payments)
      .filter(p => p.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async updatePayment(id: string, data: Partial<Payment>): Promise<Payment | undefined> {
    const payment = this.data.payments[id];
    if (!payment) return undefined;
    const updated = { ...payment, ...data };
    this.data.payments[id] = updated;
    return updated;
  }

  // Practice Sessions
  async createPracticeSession(session: InsertPracticeSession): Promise<PracticeSession> {
    const newSession: PracticeSession = {
      ...session,
      id: generateId(),
      startedAt: new Date(),
      completedAt: null,
      score: 0,
      totalQuestions: 0,
    } as unknown as PracticeSession;
    this.data.practiceSessions[newSession.id] = newSession;
    return newSession;
  }

  async getPracticeSession(id: string): Promise<PracticeSession | undefined> {
    return this.data.practiceSessions[id];
  }

  async updatePracticeSession(id: string, data: Partial<PracticeSession>): Promise<PracticeSession | undefined> {
    const session = this.data.practiceSessions[id];
    if (!session) return undefined;
    const updated = { ...session, ...data };
    this.data.practiceSessions[id] = updated;
    return updated;
  }

  async getRecentSessionsByUser(userId: string, limit = 10): Promise<PracticeSession[]> {
    return Object.values(this.data.practiceSessions)
      .filter(s => s.userId === userId)
      .sort((a, b) => (b.startedAt?.getTime() || 0) - (a.startedAt?.getTime() || 0))
      .slice(0, limit);
  }

  // Team Invitations
  async createInvitation(invitation: InsertTeamInvitation): Promise<TeamInvitation> {
    const newInvitation: TeamInvitation = {
      ...invitation,
      id: generateId(),
      createdAt: new Date(),
      status: "pending",
    } as unknown as TeamInvitation;
    this.data.teamInvitations[newInvitation.id] = newInvitation;
    return newInvitation;
  }

  async getInvitationsByEmail(email: string): Promise<TeamInvitation[]> {
    return Object.values(this.data.teamInvitations).filter(
      i => i.email === email && i.status === "pending"
    );
  }

  async getInvitationsByTeam(teamId: string): Promise<TeamInvitation[]> {
    return Object.values(this.data.teamInvitations).filter(i => i.teamId === teamId);
  }

  async updateInvitation(id: string, data: Partial<TeamInvitation>): Promise<TeamInvitation | undefined> {
    const invitation = this.data.teamInvitations[id];
    if (!invitation) return undefined;
    const updated = { ...invitation, ...data };
    this.data.teamInvitations[id] = updated;
    return updated;
  }

  // Dashboard Data
  async getDashboardData(userId: string): Promise<any> {
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
      const allMatches = Object.values(this.data.matches)
        .filter(m => (teamIds.includes(m.homeTeamId) || teamIds.includes(m.awayTeamId)) && m.status === "waiting")
        .sort((a, b) => (a.scheduledAt?.getTime() || 0) - (b.scheduledAt?.getTime() || 0))
        .slice(0, 10);

      upcomingMatches = await Promise.all(
        allMatches.map(async (match) => {
          const homeTeam = await this.getTeam(match.homeTeamId);
          const awayTeam = await this.getTeam(match.awayTeamId);
          const competition = await this.getCompetition(match.competitionId);
          return { ...match, homeTeam, awayTeam, competition };
        })
      );

      const allStandings = Object.values(this.data.standings).filter(s => teamIds.includes(s.teamId));

      standingsData = await Promise.all(
        allStandings.map(async (standing) => {
          const team = await this.getTeam(standing.teamId);
          const competition = await this.getCompetition(standing.competitionId);
          return { ...standing, team, competition };
        })
      );
    }

    const activeCompetitions = await this.getActiveCompetitions();
    const totalTokens = userTeams.reduce((sum, t) => sum + (t.practiceTokens || 0), 0);

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
    const allCompetitions = await this.getAllCompetitions();
    const allQuestions = await this.getAllQuestions();

    const allMatches = Object.values(this.data.matches)
      .sort((a, b) => (b.scheduledAt?.getTime() || 0) - (a.scheduledAt?.getTime() || 0))
      .slice(0, 50);

    const matchesWithDetails = await Promise.all(
      allMatches.map(async (match) => {
        const homeTeam = await this.getTeam(match.homeTeamId);
        const awayTeam = await this.getTeam(match.awayTeamId);
        const competition = await this.getCompetition(match.competitionId);
        return { ...match, homeTeam, awayTeam, competition };
      })
    );

    const allPayments = Object.values(this.data.payments)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, 50);

    const paymentsWithTeams = await Promise.all(
      allPayments.map(async (payment) => {
        const team = payment.teamId ? await this.getTeam(payment.teamId) : undefined;
        return { ...payment, team };
      })
    );

    const userCount = Object.keys(this.data.users).length;
    const teamCount = Object.keys(this.data.teams).length;
    const totalRevenue = Object.values(this.data.payments)
      .filter(p => p.status === "completed")
      .reduce((sum, p) => sum + (typeof p.amount === 'string' ? parseFloat(p.amount) : p.amount || 0), 0);

    return {
      competitions: allCompetitions,
      questions: allQuestions,
      matches: matchesWithDetails,
      payments: paymentsWithTeams,
      stats: {
        totalUsers: userCount,
        totalTeams: teamCount,
        totalRevenue,
        activeCompetitions: allCompetitions.filter(c => c.isActive).length,
      },
    };
  }
}
