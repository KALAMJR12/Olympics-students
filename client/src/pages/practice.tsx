import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Target, 
  Users, 
  User, 
  Coins,
  Play,
  Clock,
  CheckCircle,
  Trophy,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Team, PracticeSession, Question } from "@shared/schema";

interface TeamWithTokens extends Team {
  memberCount: number;
}

interface PracticeQuestion extends Question {
  userAnswer?: string;
}

interface ActivePractice {
  session: PracticeSession;
  questions: PracticeQuestion[];
  currentIndex: number;
  timeRemaining: number;
}

function PracticeTypeCard({
  title,
  description,
  icon: Icon,
  onStart,
  disabled,
  disabledReason,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  onStart: () => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  return (
    <Card className={disabled ? "opacity-60" : ""}>
      <CardContent className="p-6 text-center">
        <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center mb-4">
          <Icon className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4">{description}</p>
        {disabled ? (
          <div className="space-y-2">
            <Button disabled className="w-full">Start Practice</Button>
            {disabledReason && (
              <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {disabledReason}
              </p>
            )}
          </div>
        ) : (
          <Button onClick={onStart} className="w-full" data-testid={`button-start-${title.toLowerCase().replace(/\s+/g, '-')}`}>
            <Play className="h-4 w-4 mr-2" />
            Start Practice
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function PracticeSessionCard({ session }: { session: PracticeSession & { team?: Team } }) {
  const completedAt = session.completedAt ? new Date(session.completedAt) : null;
  const accuracy = session.totalQuestions > 0 
    ? Math.round((session.score / session.totalQuestions) * 100) 
    : 0;

  return (
    <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50" data-testid={`session-row-${session.id}`}>
      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${session.type === "individual" ? "bg-blue-100 dark:bg-blue-900" : "bg-green-100 dark:bg-green-900"}`}>
        {session.type === "individual" ? (
          <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        ) : (
          <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium">
          {session.type === "individual" ? "Individual Practice" : "Team Practice"}
        </p>
        <p className="text-sm text-muted-foreground">
          {completedAt?.toLocaleDateString()} at {completedAt?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
      <div className="text-right">
        <p className="font-mono font-bold">{session.score}/{session.totalQuestions}</p>
        <p className="text-sm text-muted-foreground">{accuracy}% accuracy</p>
      </div>
    </div>
  );
}

function StartPracticeDialog({
  open,
  onOpenChange,
  teams,
  onStart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: TeamWithTokens[];
  onStart: (teamId: string, type: "individual" | "team") => void;
}) {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [practiceType, setPracticeType] = useState<"individual" | "team">("individual");

  const selectedTeamData = teams.find(t => t.id === selectedTeam);
  const hasTokens = selectedTeamData && selectedTeamData.practiceTokens > 0;

  const handleStart = () => {
    if (selectedTeam && hasTokens) {
      onStart(selectedTeam, practiceType);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Start Practice Session</DialogTitle>
          <DialogDescription>
            Choose a team and practice type. This will consume 1 practice token.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Select Team</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger data-testid="select-practice-team">
                <SelectValue placeholder="Choose a team" />
              </SelectTrigger>
              <SelectContent>
                {teams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    <div className="flex items-center gap-2">
                      <span>{team.name}</span>
                      <Badge variant="outline" size="sm">
                        <Coins className="h-3 w-3 mr-1" />
                        {team.practiceTokens}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTeam && (
            <div className="space-y-2">
              <Label>Practice Type</Label>
              <RadioGroup value={practiceType} onValueChange={(v) => setPracticeType(v as "individual" | "team")}>
                <div className="flex items-center space-x-2 p-3 rounded-md border hover-elevate cursor-pointer">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="flex-1 cursor-pointer">
                    <div className="font-medium">Individual Practice</div>
                    <div className="text-sm text-muted-foreground">Practice on your own</div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 rounded-md border hover-elevate cursor-pointer">
                  <RadioGroupItem value="team" id="team" />
                  <Label htmlFor="team" className="flex-1 cursor-pointer">
                    <div className="font-medium">Team Practice</div>
                    <div className="text-sm text-muted-foreground">Practice with your team (same format as competitions)</div>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {selectedTeam && !hasTokens && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">This team has no practice tokens. Buy more to continue.</span>
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleStart} 
              disabled={!selectedTeam || !hasTokens}
              data-testid="button-confirm-start-practice"
            >
              Start Practice
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PracticeQuestion({
  question,
  currentIndex,
  totalQuestions,
  timeRemaining,
  onAnswer,
  selectedAnswer,
}: {
  question: PracticeQuestion;
  currentIndex: number;
  totalQuestions: number;
  timeRemaining: number;
  onAnswer: (answer: string) => void;
  selectedAnswer?: string;
}) {
  const options = [
    { key: "A", value: question.optionA },
    { key: "B", value: question.optionB },
    { key: "C", value: question.optionC },
    { key: "D", value: question.optionD },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Badge variant="outline">Question {currentIndex + 1}/{totalQuestions}</Badge>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className={`font-mono font-bold ${timeRemaining <= 10 ? "text-destructive" : ""}`}>
            {timeRemaining}s
          </span>
        </div>
      </div>

      <Progress value={(currentIndex / totalQuestions) * 100} className="h-2" />

      <Card>
        <CardContent className="p-6">
          <p className="text-lg font-medium mb-6">{question.questionText}</p>
          
          <div className="space-y-3">
            {options.map((option) => (
              <button
                key={option.key}
                onClick={() => onAnswer(option.key)}
                className={`w-full p-4 rounded-md border text-left transition-colors ${
                  selectedAnswer === option.key
                    ? "border-primary bg-primary/10"
                    : "hover-elevate"
                }`}
                data-testid={`option-${option.key}`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    selectedAnswer === option.key
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}>
                    {option.key}
                  </span>
                  <span>{option.value}</span>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PracticePage() {
  const [practiceDialogOpen, setPracticeDialogOpen] = useState(false);
  const [activePractice, setActivePractice] = useState<ActivePractice | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | undefined>();
  const { toast } = useToast();

  const { data: practiceData, isLoading } = useQuery<{
    teams: TeamWithTokens[];
    recentSessions: (PracticeSession & { team?: Team })[];
    totalTokens: number;
  }>({
    queryKey: ["/api/practice"],
  });

  const startPracticeMutation = useMutation({
    mutationFn: async ({ teamId, type }: { teamId: string; type: "individual" | "team" }) => {
      const res = await apiRequest("POST", "/api/practice/start", { teamId, type });
      return res.json();
    },
    onSuccess: (data) => {
      setActivePractice({
        session: data.session,
        questions: data.questions,
        currentIndex: 0,
        timeRemaining: data.questions[0]?.timeLimit || 30,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/practice"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start practice", description: error.message, variant: "destructive" });
    },
  });

  const submitAnswerMutation = useMutation({
    mutationFn: async ({ questionId, answer }: { questionId: string; answer: string }) => {
      const res = await apiRequest("POST", "/api/practice/answer", {
        sessionId: activePractice?.session.id,
        questionId,
        answer,
      });
      return res.json();
    },
    onSuccess: () => {
      if (activePractice) {
        const nextIndex = activePractice.currentIndex + 1;
        if (nextIndex < activePractice.questions.length) {
          setActivePractice({
            ...activePractice,
            currentIndex: nextIndex,
            timeRemaining: activePractice.questions[nextIndex].timeLimit || 30,
          });
          setSelectedAnswer(undefined);
        } else {
          toast({ title: "Practice complete!", description: "Great job! Check your results." });
          setActivePractice(null);
          setSelectedAnswer(undefined);
          queryClient.invalidateQueries({ queryKey: ["/api/practice"] });
        }
      }
    },
    onError: (error: Error) => {
      toast({ title: "Failed to submit answer", description: error.message, variant: "destructive" });
    },
  });

  const handleStartPractice = (teamId: string, type: "individual" | "team") => {
    startPracticeMutation.mutate({ teamId, type });
  };

  const handleAnswer = (answer: string) => {
    setSelectedAnswer(answer);
    if (activePractice) {
      const currentQuestion = activePractice.questions[activePractice.currentIndex];
      submitAnswerMutation.mutate({ questionId: currentQuestion.id, answer });
    }
  };

  if (activePractice) {
    const currentQuestion = activePractice.questions[activePractice.currentIndex];
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <PracticeQuestion
          question={currentQuestion}
          currentIndex={activePractice.currentIndex}
          totalQuestions={activePractice.questions.length}
          timeRemaining={activePractice.timeRemaining}
          onAnswer={handleAnswer}
          selectedAnswer={selectedAnswer}
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Practice Mode</h1>
          <p className="text-muted-foreground">Sharpen your skills with practice questions</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-muted rounded-md px-3 py-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono font-bold">{practiceData?.totalTokens || 0}</span>
            <span className="text-sm text-muted-foreground">tokens</span>
          </div>
          <Button variant="outline" asChild data-testid="button-buy-tokens">
            <Link href="/payments">Buy Tokens</Link>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6 text-center">
                  <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
                  <Skeleton className="h-6 w-32 mx-auto mb-2" />
                  <Skeleton className="h-4 w-48 mx-auto mb-4" />
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            <PracticeTypeCard
              title="Individual Practice"
              description="Practice on your own with questions from the practice pool"
              icon={User}
              onStart={() => setPracticeDialogOpen(true)}
              disabled={!practiceData?.teams.some(t => t.practiceTokens > 0)}
              disabledReason={!practiceData?.teams.some(t => t.practiceTokens > 0) ? "No tokens available" : undefined}
            />
            <PracticeTypeCard
              title="Team Practice"
              description="Practice with your team in competition format"
              icon={Users}
              onStart={() => setPracticeDialogOpen(true)}
              disabled={!practiceData?.teams.some(t => t.practiceTokens > 0)}
              disabledReason={!practiceData?.teams.some(t => t.practiceTokens > 0) ? "No tokens available" : undefined}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Practice Sessions</CardTitle>
              <CardDescription>Your practice history and performance</CardDescription>
            </CardHeader>
            <CardContent>
              {practiceData?.recentSessions && practiceData.recentSessions.length > 0 ? (
                <div className="space-y-3">
                  {practiceData.recentSessions.map((session) => (
                    <PracticeSessionCard key={session.id} session={session} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No practice sessions yet</p>
                  <p className="text-sm">Start practicing to improve your performance!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <StartPracticeDialog
        open={practiceDialogOpen}
        onOpenChange={setPracticeDialogOpen}
        teams={practiceData?.teams || []}
        onStart={handleStartPractice}
      />
    </div>
  );
}
