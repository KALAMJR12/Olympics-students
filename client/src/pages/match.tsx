import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Clock, 
  Users, 
  Trophy,
  CheckCircle,
  XCircle,
  Wifi,
  WifiOff,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { Match, Team, Question, User } from "@shared/schema";

interface MatchData {
  match: Match & { 
    homeTeam: Team & { members: { user: User }[] }; 
    awayTeam: Team & { members: { user: User }[] };
  };
  questions: Question[];
  userTeamId: string;
  playerScores: Record<string, number>;
}

interface MatchState {
  currentQuestionIndex: number;
  timeRemaining: number;
  selectedAnswer: string | null;
  hasAnswered: boolean;
  homeScore: number;
  awayScore: number;
  status: "waiting" | "live" | "completed";
}

function MatchHeader({ 
  match, 
  state,
  isConnected,
  onLeave 
}: { 
  match: MatchData["match"]; 
  state: MatchState;
  isConnected: boolean;
  onLeave: () => void;
}) {
  return (
    <div className="sticky top-0 z-50 bg-background border-b">
      <div className="flex items-center justify-between gap-4 p-4">
        <Button variant="ghost" size="sm" onClick={onLeave} data-testid="button-leave-match">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Leave
        </Button>
        
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge variant="outline" className="text-green-600">
              <Wifi className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          ) : (
            <Badge variant="destructive">
              <WifiOff className="h-3 w-3 mr-1" />
              Disconnected
            </Badge>
          )}
          <Badge variant={state.status === "live" ? "default" : "secondary"}>
            {state.status.toUpperCase()}
          </Badge>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 px-4 pb-4">
        <div className="flex-1 text-right">
          <p className="font-bold text-lg">{match.homeTeam.name}</p>
          <p className="text-sm text-muted-foreground">Home</p>
        </div>
        
        <div className="flex flex-col items-center px-6">
          <div className="text-3xl font-mono font-bold" data-testid="text-match-score">
            {state.homeScore} - {state.awayScore}
          </div>
          {state.status === "live" && (
            <div className={`text-lg font-mono font-bold mt-1 ${state.timeRemaining <= 10 ? "text-destructive animate-pulse" : ""}`}>
              {state.timeRemaining}s
            </div>
          )}
        </div>
        
        <div className="flex-1 text-left">
          <p className="font-bold text-lg">{match.awayTeam.name}</p>
          <p className="text-sm text-muted-foreground">Away</p>
        </div>
      </div>
    </div>
  );
}

function QuestionDisplay({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}: {
  question: Question;
  questionNumber: number;
  totalQuestions: number;
  selectedAnswer: string | null;
  hasAnswered: boolean;
  onAnswer: (answer: string) => void;
}) {
  const options = [
    { key: "A", value: question.optionA },
    { key: "B", value: question.optionB },
    { key: "C", value: question.optionC },
    { key: "D", value: question.optionD },
  ];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Badge variant="outline">
          Question {questionNumber}/{totalQuestions}
        </Badge>
        <Badge variant="secondary">{question.subject}</Badge>
      </div>

      <Progress value={(questionNumber / totalQuestions) * 100} className="h-2" />

      <Card>
        <CardContent className="p-6">
          <p className="text-xl font-medium mb-8">{question.questionText}</p>
          
          <div className="grid gap-3 md:grid-cols-2">
            {options.map((option) => {
              const isSelected = selectedAnswer === option.key;
              const showResult = hasAnswered;
              const isCorrect = option.key === question.correctAnswer;
              
              let buttonClass = "w-full p-4 rounded-md border text-left transition-all";
              
              if (showResult) {
                if (isCorrect) {
                  buttonClass += " border-green-500 bg-green-500/10";
                } else if (isSelected && !isCorrect) {
                  buttonClass += " border-red-500 bg-red-500/10";
                } else {
                  buttonClass += " opacity-50";
                }
              } else if (isSelected) {
                buttonClass += " border-primary bg-primary/10";
              } else {
                buttonClass += " hover-elevate";
              }

              return (
                <button
                  key={option.key}
                  onClick={() => !hasAnswered && onAnswer(option.key)}
                  disabled={hasAnswered}
                  className={buttonClass}
                  data-testid={`match-option-${option.key}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                      isSelected || (showResult && isCorrect)
                        ? isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                        : "bg-muted"
                    }`}>
                      {showResult && isCorrect ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : showResult && isSelected && !isCorrect ? (
                        <XCircle className="h-5 w-5" />
                      ) : (
                        option.key
                      )}
                    </span>
                    <span className="text-lg">{option.value}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamScoreboard({
  team,
  playerScores,
  isUserTeam,
}: {
  team: Team & { members: { user: User }[] };
  playerScores: Record<string, number>;
  isUserTeam: boolean;
}) {
  const teamTotal = team.members.reduce((sum, m) => sum + (playerScores[m.user.id] || 0), 0);

  return (
    <Card className={isUserTeam ? "border-primary" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-sm">{team.name}</CardTitle>
          <span className="font-mono font-bold">{teamTotal}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {team.members.map((member) => (
            <div 
              key={member.user.id} 
              className="flex items-center justify-between gap-2"
              data-testid={`player-score-${member.user.id}`}
            >
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {member.user.username.substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm truncate">{member.user.username}</span>
              </div>
              <span className="font-mono text-sm">{playerScores[member.user.id] || 0}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WaitingScreen({ match }: { match: MatchData["match"] }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Clock className="h-10 w-10 text-primary animate-pulse" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Waiting for Match to Start</h2>
      <p className="text-muted-foreground mb-8">
        The match will begin shortly. Make sure all team members are ready.
      </p>
      
      <div className="flex items-center gap-8">
        <div className="text-center">
          <p className="font-bold text-lg mb-1">{match.homeTeam.name}</p>
          <p className="text-sm text-muted-foreground">{match.homeTeam.members.length}/5 ready</p>
        </div>
        <span className="text-2xl font-bold text-muted-foreground">VS</span>
        <div className="text-center">
          <p className="font-bold text-lg mb-1">{match.awayTeam.name}</p>
          <p className="text-sm text-muted-foreground">{match.awayTeam.members.length}/5 ready</p>
        </div>
      </div>
    </div>
  );
}

function MatchResults({ 
  match, 
  state,
  playerScores 
}: { 
  match: MatchData["match"]; 
  state: MatchState;
  playerScores: Record<string, number>;
}) {
  const winner = state.homeScore > state.awayScore 
    ? match.homeTeam.name 
    : state.awayScore > state.homeScore 
      ? match.awayTeam.name 
      : "Draw";

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="text-center">
        <Trophy className="h-16 w-16 mx-auto mb-4 text-yellow-500" />
        <h2 className="text-3xl font-bold mb-2">Match Complete!</h2>
        <p className="text-lg text-muted-foreground">
          {winner === "Draw" ? "It's a draw!" : `${winner} wins!`}
        </p>
      </div>

      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-between gap-8">
            <div className="flex-1 text-center">
              <p className="font-bold text-xl mb-1">{match.homeTeam.name}</p>
              <p className="text-4xl font-mono font-bold">{state.homeScore}</p>
            </div>
            <div className="text-2xl text-muted-foreground">-</div>
            <div className="flex-1 text-center">
              <p className="font-bold text-xl mb-1">{match.awayTeam.name}</p>
              <p className="text-4xl font-mono font-bold">{state.awayScore}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <TeamScoreboard 
          team={match.homeTeam} 
          playerScores={playerScores}
          isUserTeam={false}
        />
        <TeamScoreboard 
          team={match.awayTeam} 
          playerScores={playerScores}
          isUserTeam={false}
        />
      </div>
    </div>
  );
}

export default function MatchPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isConnected, setIsConnected] = useState(false);
  const [matchState, setMatchState] = useState<MatchState>({
    currentQuestionIndex: 0,
    timeRemaining: 30,
    selectedAnswer: null,
    hasAnswered: false,
    homeScore: 0,
    awayScore: 0,
    status: "waiting",
  });

  const { data: matchData, isLoading } = useQuery<MatchData>({
    queryKey: ["/api/matches", id],
    enabled: !!id,
  });

  useEffect(() => {
    if (!id) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setIsConnected(true);
      socket.send(JSON.stringify({ type: "join_match", matchId: id, userId: user?.id }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        
        switch (message.type) {
          case "match_state":
            setMatchState(prev => ({
              ...prev,
              status: message.status,
              currentQuestionIndex: message.currentQuestion || 0,
              homeScore: message.homeScore || 0,
              awayScore: message.awayScore || 0,
            }));
            break;
          case "question_released":
            setMatchState(prev => ({
              ...prev,
              currentQuestionIndex: message.questionIndex,
              timeRemaining: message.timeLimit || 30,
              selectedAnswer: null,
              hasAnswered: false,
            }));
            break;
          case "timer_tick":
            setMatchState(prev => ({ ...prev, timeRemaining: message.remaining }));
            break;
          case "answer_result":
            setMatchState(prev => ({ ...prev, hasAnswered: true }));
            break;
          case "score_update":
            setMatchState(prev => ({
              ...prev,
              homeScore: message.homeScore,
              awayScore: message.awayScore,
            }));
            break;
          case "match_complete":
            setMatchState(prev => ({
              ...prev,
              status: "completed",
              homeScore: message.homeScore,
              awayScore: message.awayScore,
            }));
            break;
        }
      } catch (e) {
        console.error("WebSocket message parse error:", e);
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    socket.onerror = () => {
      setIsConnected(false);
      toast({ 
        title: "Connection error", 
        description: "Failed to connect to match server", 
        variant: "destructive" 
      });
    };

    return () => {
      socket.close();
    };
  }, [id, user?.id, toast]);

  const handleAnswer = useCallback((answer: string) => {
    setMatchState(prev => ({ ...prev, selectedAnswer: answer, hasAnswered: true }));
  }, []);

  const handleLeave = () => {
    setLocation("/dashboard");
  };

  if (isLoading || !matchData) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full max-w-3xl mx-auto" />
      </div>
    );
  }

  const currentQuestion = matchData.questions[matchState.currentQuestionIndex];

  return (
    <div className="min-h-screen bg-background">
      <MatchHeader 
        match={matchData.match} 
        state={matchState}
        isConnected={isConnected}
        onLeave={handleLeave}
      />

      {matchState.status === "waiting" && (
        <WaitingScreen match={matchData.match} />
      )}

      {matchState.status === "live" && currentQuestion && (
        <div className="flex flex-col lg:flex-row gap-6 p-6">
          <div className="flex-1">
            <QuestionDisplay
              question={currentQuestion}
              questionNumber={matchState.currentQuestionIndex + 1}
              totalQuestions={matchData.questions.length}
              selectedAnswer={matchState.selectedAnswer}
              hasAnswered={matchState.hasAnswered}
              onAnswer={handleAnswer}
            />
          </div>
          <div className="lg:w-80 space-y-4">
            <TeamScoreboard 
              team={matchData.match.homeTeam} 
              playerScores={matchData.playerScores}
              isUserTeam={matchData.userTeamId === matchData.match.homeTeamId}
            />
            <TeamScoreboard 
              team={matchData.match.awayTeam} 
              playerScores={matchData.playerScores}
              isUserTeam={matchData.userTeamId === matchData.match.awayTeamId}
            />
          </div>
        </div>
      )}

      {matchState.status === "completed" && (
        <MatchResults 
          match={matchData.match} 
          state={matchState}
          playerScores={matchData.playerScores}
        />
      )}
    </div>
  );
}
