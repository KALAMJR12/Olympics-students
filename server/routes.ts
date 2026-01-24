import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import session from "express-session";
import MemoryStore from "memorystore";
import pgSession from "connect-pg-simple";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { pool } from "./db";
import { 
  insertUserSchema, insertTeamSchema, insertCompetitionSchema, 
  insertQuestionSchema, loginSchema 
} from "@shared/schema";
import { z } from "zod";

declare module "express-session" {
  interface SessionData {
    userId?: string;
  }
}

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};

const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const user = await storage.getUser(req.session.userId);
  if (!user || user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }
  next();
};

const matchRooms = new Map<string, Set<WebSocket>>();
const matchStates = new Map<string, {
  status: "waiting" | "live" | "completed";
  currentQuestion: number;
  homeScore: number;
  awayScore: number;
  timeRemaining: number;
}>();

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Use appropriate session store based on database availability
  const sessionStore = pool 
    ? new pgSession({ pool })
    : new (MemoryStore(session))({ checkPeriod: 86400000 });

  app.use(session({
    store: sessionStore,
    secret: process.env.SESSION_SECRET || "quiz-league-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }));

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws) => {
    ws.on("message", async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        if (message.type === "join_match") {
          const { matchId, userId } = message;
          
          if (!matchRooms.has(matchId)) {
            matchRooms.set(matchId, new Set());
          }
          matchRooms.get(matchId)!.add(ws);
          
          const state = matchStates.get(matchId) || {
            status: "waiting",
            currentQuestion: 0,
            homeScore: 0,
            awayScore: 0,
            timeRemaining: 30,
          };
          
          ws.send(JSON.stringify({ type: "match_state", ...state }));
        }
        
        if (message.type === "submit_answer") {
          const { matchId, userId, questionId, answer, teamId } = message;
          
          const question = await storage.getQuestion(questionId);
          const match = await storage.getMatch(matchId);
          
          if (question && match) {
            const isCorrect = answer === question.correctAnswer;
            await storage.submitAnswer({
              matchId,
              questionId,
              userId,
              teamId,
              answer,
              isCorrect,
              timeTaken: message.timeTaken,
            });
            
            ws.send(JSON.stringify({ type: "answer_result", isCorrect }));
            
            // Calculate team scores from answers
            const answers = await storage.getAnswersByMatch(matchId);
            let homeScore = 0;
            let awayScore = 0;
            
            for (const ans of answers) {
              if (ans.isCorrect) {
                if (ans.teamId === match.homeTeamId) homeScore++;
                else if (ans.teamId === match.awayTeamId) awayScore++;
              }
            }
            
            // Update match scores in database
            await storage.updateMatch(matchId, { homeScore, awayScore });
            
            // Update in-memory state
            const state = matchStates.get(matchId);
            if (state) {
              state.homeScore = homeScore;
              state.awayScore = awayScore;
            }
            
            const playerScores = await storage.getPlayerScoresByMatch(matchId);
            broadcastToMatch(matchId, {
              type: "score_update",
              playerScores,
              homeScore,
              awayScore,
            });
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      matchRooms.forEach((clients, matchId) => {
        clients.delete(ws);
        if (clients.size === 0) {
          matchRooms.delete(matchId);
        }
      });
    });
  });

  function broadcastToMatch(matchId: string, message: any) {
    const clients = matchRooms.get(matchId);
    if (clients) {
      const data = JSON.stringify(message);
      clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    }
  }

  // Auth Routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const data = insertUserSchema.parse(req.body);
      
      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }
      
      const existingUsername = await storage.getUserByUsername(data.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already taken" });
      }
      
      const hashedPassword = await bcrypt.hash(data.password, 10);
      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });
      
      req.session.userId = user.id;
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      req.session.userId = user.id;
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = await storage.getUser(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    
    res.json({ user: { ...user, password: undefined } });
  });

  app.patch("/api/auth/profile", requireAuth, async (req, res) => {
    try {
      const { username, email } = req.body;
      const user = await storage.updateUser(req.session.userId!, { username, email });
      res.json({ user: { ...user, password: undefined } });
    } catch (error) {
      res.status(500).json({ message: "Update failed" });
    }
  });

  app.post("/api/auth/change-password", requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const validPassword = await bcrypt.compare(currentPassword, user.password);
      if (!validPassword) {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await storage.updateUser(user.id, { password: hashedPassword });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Password change failed" });
    }
  });

  // Dashboard
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const data = await storage.getDashboardData(req.session.userId!);
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to load dashboard" });
    }
  });

  // Teams
  app.get("/api/teams", requireAuth, async (req, res) => {
    try {
      const userTeams = await storage.getTeamsByUser(req.session.userId!);
      
      const teamsWithDetails = await Promise.all(
        userTeams.map(async (team) => {
          const teamWithMembers = await storage.getTeamWithMembers(team.id);
          const registrations = await storage.getTeamRegistrations(team.id);
          const competitionsData = await Promise.all(
            registrations.map(async (r) => {
              const comp = await storage.getCompetition(r.competitionId);
              return { 
                id: r.competitionId, 
                name: comp?.name || "Unknown",
                registrationId: r.id,
                paidBy: r.paidBy,
                paymentId: r.paymentId,
                registeredAt: r.createdAt,
              };
            })
          );
          return {
            ...team,
            members: teamWithMembers?.members || [],
            competitions: competitionsData,
          };
        })
      );
      
      res.json(teamsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to load teams" });
    }
  });

  app.post("/api/teams", requireAuth, async (req, res) => {
    try {
      const data = insertTeamSchema.parse({
        ...req.body,
        createdBy: req.session.userId,
      });
      
      const team = await storage.createTeam(data);
      
      await storage.addTeamMember({
        teamId: team.id,
        userId: req.session.userId!,
      });
      
      res.json(team);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.post("/api/teams/:id/invite", requireAuth, async (req, res) => {
    try {
      const { email } = req.body;
      const teamId = req.params.id;
      
      const members = await storage.getTeamMembers(teamId);
      if (members.length >= 5) {
        return res.status(400).json({ message: "Team is already full" });
      }
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      const invitation = await storage.createInvitation({
        teamId,
        email,
        invitedBy: req.session.userId!,
        expiresAt,
      });
      
      res.json(invitation);
    } catch (error) {
      res.status(500).json({ message: "Failed to send invitation" });
    }
  });

  // Competitions
  app.get("/api/competitions", requireAuth, async (req, res) => {
    try {
      const competitions = await storage.getAllCompetitions();
      const userTeams = await storage.getTeamsByUser(req.session.userId!);
      
      const competitionsWithDetails = await Promise.all(
        competitions.map(async (comp) => {
          const registrations = await storage.getRegisteredTeams(comp.id);
          const isRegistered = userTeams.some(t => 
            registrations.some(r => r.teamId === t.id)
          );
          const standings = await storage.getStandingsByCompetition(comp.id);
          const standingsWithTeams = await Promise.all(
            standings.map(async (s) => {
              const team = await storage.getTeam(s.teamId);
              return { ...s, team };
            })
          );
          const matchesData = await storage.getMatchesByCompetition(comp.id);
          const matchesWithTeams = await Promise.all(
            matchesData.map(async (m) => {
              const homeTeam = await storage.getTeam(m.homeTeamId);
              const awayTeam = await storage.getTeam(m.awayTeamId);
              return { ...m, homeTeam, awayTeam };
            })
          );
          
          return {
            ...comp,
            registeredTeams: registrations.length,
            isRegistered,
            userTeams,
            standings: standingsWithTeams,
            matches: matchesWithTeams,
          };
        })
      );
      
      res.json(competitionsWithDetails);
    } catch (error) {
      res.status(500).json({ message: "Failed to load competitions" });
    }
  });

  app.post("/api/competitions/:id/register", requireAuth, async (req, res) => {
    try {
      const { teamId } = req.body;
      const competitionId = req.params.id;
      
      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      
      // Check if registration deadline has passed
      if (new Date() > new Date(competition.registrationDeadline)) {
        return res.status(400).json({ message: "Registration deadline has passed" });
      }
      
      const isRegistered = await storage.isTeamRegistered(competitionId, teamId);
      if (isRegistered) {
        return res.status(400).json({ message: "Team already registered" });
      }
      
      // Check if competition is full
      const registrations = await storage.getRegisteredTeams(competitionId);
      if (registrations.length >= competition.maxTeams) {
        return res.status(400).json({ message: "Competition is full" });
      }
      
      // Verify user is a member of the team
      const isMember = await storage.isTeamMember(teamId, req.session.userId!);
      if (!isMember) {
        return res.status(403).json({ message: "You are not a member of this team" });
      }
      
      const payment = await storage.createPayment({
        userId: req.session.userId!,
        teamId,
        competitionId,
        amount: competition.registrationFee,
        type: "registration",
        status: "completed",
        reference: `REG-${Date.now()}`,
      });
      
      const registration = await storage.registerTeam({
        competitionId,
        teamId,
        paidBy: req.session.userId!,
        paymentId: payment.id,
      });
      
      await storage.createStanding({
        competitionId,
        teamId,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        goalDifference: 0,
        leaguePoints: 0,
      });
      
      res.json(registration);
    } catch (error) {
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Matches
  app.get("/api/matches/:id", requireAuth, async (req, res) => {
    try {
      const match = await storage.getMatchWithTeams(req.params.id);
      if (!match) {
        return res.status(404).json({ message: "Match not found" });
      }
      
      const homeTeamWithMembers = await storage.getTeamWithMembers(match.homeTeamId);
      const awayTeamWithMembers = await storage.getTeamWithMembers(match.awayTeamId);
      
      const questions = await storage.getQuestionsByMode("competition", 20);
      const playerScores = await storage.getPlayerScoresByMatch(match.id);
      
      const userTeams = await storage.getTeamsByUser(req.session.userId!);
      const userTeamId = userTeams.find(t => t.id === match.homeTeamId || t.id === match.awayTeamId)?.id;
      
      res.json({
        match: {
          ...match,
          homeTeam: homeTeamWithMembers,
          awayTeam: awayTeamWithMembers,
        },
        questions,
        userTeamId,
        playerScores,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to load match" });
    }
  });

  // Practice
  app.get("/api/practice", requireAuth, async (req, res) => {
    try {
      const userTeams = await storage.getTeamsByUser(req.session.userId!);
      const teamsWithMembers = await Promise.all(
        userTeams.map(async (team) => {
          const members = await storage.getTeamMembers(team.id);
          return { ...team, memberCount: members.length };
        })
      );
      
      const recentSessions = await storage.getRecentSessionsByUser(req.session.userId!);
      const totalTokens = userTeams.reduce((sum, t) => sum + t.practiceTokens, 0);
      
      res.json({
        teams: teamsWithMembers,
        recentSessions,
        totalTokens,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to load practice data" });
    }
  });

  app.post("/api/practice/start", requireAuth, async (req, res) => {
    try {
      const { teamId, type } = req.body;
      
      const team = await storage.getTeam(teamId);
      if (!team || team.practiceTokens < 1) {
        return res.status(400).json({ message: "Insufficient tokens" });
      }
      
      await storage.updateTeam(teamId, { practiceTokens: team.practiceTokens - 1 });
      
      await storage.createTokenTransaction({
        teamId,
        userId: req.session.userId!,
        amount: -1,
        type: "practice",
      });
      
      const questions = await storage.getQuestionsByMode("practice", 10);
      
      const session = await storage.createPracticeSession({
        teamId,
        userId: req.session.userId!,
        type,
        status: "active",
      });
      
      res.json({ session, questions });
    } catch (error) {
      res.status(500).json({ message: "Failed to start practice" });
    }
  });

  app.post("/api/practice/answer", requireAuth, async (req, res) => {
    try {
      const { sessionId, questionId, answer } = req.body;
      
      const question = await storage.getQuestion(questionId);
      if (!question) {
        return res.status(404).json({ message: "Question not found" });
      }
      
      const isCorrect = answer === question.correctAnswer;
      const session = await storage.getPracticeSession(sessionId);
      
      if (session) {
        await storage.updatePracticeSession(sessionId, {
          score: session.score + (isCorrect ? 1 : 0),
          totalQuestions: session.totalQuestions + 1,
        });
      }
      
      res.json({ isCorrect, correctAnswer: question.correctAnswer });
    } catch (error) {
      res.status(500).json({ message: "Failed to submit answer" });
    }
  });

  // Payments
  app.get("/api/payments", requireAuth, async (req, res) => {
    try {
      const payments = await storage.getPaymentsByUser(req.session.userId!);
      const paymentsWithTeams = await Promise.all(
        payments.map(async (payment) => {
          const team = payment.teamId ? await storage.getTeam(payment.teamId) : undefined;
          return { ...payment, team };
        })
      );
      
      const userTeams = await storage.getTeamsByUser(req.session.userId!);
      const totalSpent = payments
        .filter(p => p.status === "completed")
        .reduce((sum, p) => sum + Number(p.amount), 0);
      
      res.json({
        payments: paymentsWithTeams,
        teams: userTeams,
        totalSpent,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to load payments" });
    }
  });

  app.post("/api/payments/tokens", requireAuth, async (req, res) => {
    try {
      const { teamId, amount } = req.body;
      
      const tokenPrice = 2.00;
      const totalPrice = amount * tokenPrice;
      
      const payment = await storage.createPayment({
        userId: req.session.userId!,
        teamId,
        amount: totalPrice.toString(),
        type: "tokens",
        status: "completed",
        reference: `TOK-${Date.now()}`,
      });
      
      const team = await storage.getTeam(teamId);
      if (team) {
        await storage.updateTeam(teamId, {
          practiceTokens: team.practiceTokens + amount,
        });
        
        await storage.createTokenTransaction({
          teamId,
          userId: req.session.userId!,
          amount,
          type: "purchase",
          paymentId: payment.id,
        });
      }
      
      res.json(payment);
    } catch (error) {
      res.status(500).json({ message: "Token purchase failed" });
    }
  });

  // Admin Routes
  app.get("/api/admin", requireAdmin, async (req, res) => {
    try {
      const data = await storage.getAdminData();
      res.json(data);
    } catch (error) {
      res.status(500).json({ message: "Failed to load admin data" });
    }
  });

  app.post("/api/admin/competitions", requireAdmin, async (req, res) => {
    try {
      const data = insertCompetitionSchema.parse(req.body);
      const competition = await storage.createCompetition(data);
      res.json(competition);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to create competition" });
    }
  });

  app.post("/api/admin/questions", requireAdmin, async (req, res) => {
    try {
      const data = insertQuestionSchema.parse(req.body);
      const question = await storage.createQuestion(data);
      res.json(question);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: "Failed to add question" });
    }
  });

  app.post("/api/admin/matches/:id/start", requireAdmin, async (req, res) => {
    try {
      const matchId = req.params.id;
      
      await storage.updateMatch(matchId, {
        status: "live",
        startedAt: new Date(),
      });
      
      matchStates.set(matchId, {
        status: "live",
        currentQuestion: 0,
        homeScore: 0,
        awayScore: 0,
        timeRemaining: 30,
      });
      
      broadcastToMatch(matchId, {
        type: "match_state",
        status: "live",
        currentQuestion: 0,
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to start match" });
    }
  });

  return httpServer;
}
