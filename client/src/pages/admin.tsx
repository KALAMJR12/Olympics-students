import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  Trophy, 
  FileQuestion,
  Calendar,
  CreditCard,
  Plus,
  Upload,
  Play,
  Users,
  BarChart3
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Competition, Question, Match, Payment, Team } from "@shared/schema";

const createCompetitionSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters"),
  description: z.string().optional(),
  registrationFee: z.string().regex(/^\d+(\.\d{2})?$/, "Invalid price format"),
  maxTeams: z.string().regex(/^\d+$/, "Must be a number"),
  startDate: z.string().min(1, "Required"),
  endDate: z.string().min(1, "Required"),
  registrationDeadline: z.string().min(1, "Required"),
});

const createQuestionSchema = z.object({
  questionText: z.string().min(10, "Question must be at least 10 characters"),
  optionA: z.string().min(1, "Required"),
  optionB: z.string().min(1, "Required"),
  optionC: z.string().min(1, "Required"),
  optionD: z.string().min(1, "Required"),
  correctAnswer: z.enum(["A", "B", "C", "D"]),
  subject: z.string().min(1, "Required"),
  difficulty: z.enum(["easy", "medium", "hard"]),
  mode: z.enum(["competition", "practice"]),
  competitionId: z.string().optional(),
});

type CreateCompetitionFormData = z.infer<typeof createCompetitionSchema>;
type CreateQuestionFormData = z.infer<typeof createQuestionSchema>;

interface AdminData {
  competitions: Competition[];
  questions: Question[];
  matches: (Match & { homeTeam: Team; awayTeam: Team; competition: Competition })[];
  payments: (Payment & { team?: Team })[];
  stats: {
    totalTeams: number;
    totalUsers: number;
    totalRevenue: number;
    activeCompetitions: number;
  };
}

function CreateCompetitionDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  
  const form = useForm<CreateCompetitionFormData>({
    resolver: zodResolver(createCompetitionSchema),
    defaultValues: {
      name: "",
      description: "",
      registrationFee: "10.00",
      maxTeams: "20",
      startDate: "",
      endDate: "",
      registrationDeadline: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateCompetitionFormData) => {
      const res = await apiRequest("POST", "/api/admin/competitions", {
        ...data,
        registrationFee: parseFloat(data.registrationFee),
        maxTeams: parseInt(data.maxTeams),
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        registrationDeadline: new Date(data.registrationDeadline).toISOString(),
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Competition created!", description: "Teams can now register." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create competition", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Competition</DialogTitle>
          <DialogDescription>
            Set up a new quiz league competition for teams to join.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Competition Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Quiz League Season 1" data-testid="input-competition-name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Competition details..." data-testid="input-competition-description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="registrationFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Registration Fee ($)</FormLabel>
                    <FormControl>
                      <Input placeholder="10.00" data-testid="input-registration-fee" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="maxTeams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Teams</FormLabel>
                    <FormControl>
                      <Input placeholder="20" data-testid="input-max-teams" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" data-testid="input-start-date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" data-testid="input-end-date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="registrationDeadline"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Registration Deadline</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" data-testid="input-registration-deadline" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-competition-submit">
                {createMutation.isPending ? "Creating..." : "Create Competition"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function CreateQuestionDialog({
  open,
  onOpenChange,
  competitions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competitions: Competition[];
}) {
  const { toast } = useToast();
  
  const form = useForm<CreateQuestionFormData>({
    resolver: zodResolver(createQuestionSchema),
    defaultValues: {
      questionText: "",
      optionA: "",
      optionB: "",
      optionC: "",
      optionD: "",
      correctAnswer: "A",
      subject: "",
      difficulty: "medium",
      mode: "competition",
      competitionId: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateQuestionFormData) => {
      const res = await apiRequest("POST", "/api/admin/questions", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Question added!", description: "The question is now in the pool." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to add question", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Question</DialogTitle>
          <DialogDescription>
            Add a new question to the question pool.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="questionText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Question</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter the question..." data-testid="input-question-text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="optionA"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option A</FormLabel>
                    <FormControl>
                      <Input placeholder="Option A" data-testid="input-option-a" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="optionB"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option B</FormLabel>
                    <FormControl>
                      <Input placeholder="Option B" data-testid="input-option-b" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="optionC"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option C</FormLabel>
                    <FormControl>
                      <Input placeholder="Option C" data-testid="input-option-c" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="optionD"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Option D</FormLabel>
                    <FormControl>
                      <Input placeholder="Option D" data-testid="input-option-d" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <FormField
                control={form.control}
                name="correctAnswer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Correct Answer</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-correct-answer">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <FormControl>
                      <Input placeholder="Math, Science..." data-testid="input-subject" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-difficulty">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="mode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-mode">
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="competition">Competition</SelectItem>
                        <SelectItem value="practice">Practice</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            {form.watch("mode") === "competition" && (
              <FormField
                control={form.control}
                name="competitionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Competition (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-competition">
                          <SelectValue placeholder="Select competition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {competitions.map((comp) => (
                          <SelectItem key={comp.id} value={comp.id}>
                            {comp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-question-submit">
                {createMutation.isPending ? "Adding..." : "Add Question"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminPage() {
  const [createCompetitionOpen, setCreateCompetitionOpen] = useState(false);
  const [createQuestionOpen, setCreateQuestionOpen] = useState(false);
  const { toast } = useToast();

  const { data: adminData, isLoading } = useQuery<AdminData>({
    queryKey: ["/api/admin"],
  });

  const startMatchMutation = useMutation({
    mutationFn: async (matchId: string) => {
      const res = await apiRequest("POST", `/api/admin/matches/${matchId}/start`, {});
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Match started!", description: "Players can now join." });
      queryClient.invalidateQueries({ queryKey: ["/api/admin"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to start match", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage competitions, questions, and matches</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{adminData?.stats.totalUsers || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{adminData?.stats.totalTeams || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Competitions</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{adminData?.stats.activeCompetitions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">${(adminData?.stats.totalRevenue || 0).toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="competitions">
        <TabsList>
          <TabsTrigger value="competitions" data-testid="admin-tab-competitions">
            <Trophy className="h-4 w-4 mr-2" />
            Competitions
          </TabsTrigger>
          <TabsTrigger value="questions" data-testid="admin-tab-questions">
            <FileQuestion className="h-4 w-4 mr-2" />
            Questions
          </TabsTrigger>
          <TabsTrigger value="matches" data-testid="admin-tab-matches">
            <Calendar className="h-4 w-4 mr-2" />
            Matches
          </TabsTrigger>
          <TabsTrigger value="payments" data-testid="admin-tab-payments">
            <CreditCard className="h-4 w-4 mr-2" />
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="competitions" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Competitions</CardTitle>
                <CardDescription>Manage quiz league competitions</CardDescription>
              </div>
              <Button onClick={() => setCreateCompetitionOpen(true)} data-testid="button-create-competition">
                <Plus className="h-4 w-4 mr-2" />
                Create Competition
              </Button>
            </CardHeader>
            <CardContent>
              {adminData?.competitions && adminData.competitions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Teams</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Start Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminData.competitions.map((comp) => (
                      <TableRow key={comp.id}>
                        <TableCell className="font-medium">{comp.name}</TableCell>
                        <TableCell>{comp.maxTeams}</TableCell>
                        <TableCell className="font-mono">${Number(comp.registrationFee).toFixed(2)}</TableCell>
                        <TableCell>{new Date(comp.startDate).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={comp.isActive ? "default" : "secondary"}>
                            {comp.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No competitions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Question Bank</CardTitle>
                <CardDescription>Manage quiz questions</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" data-testid="button-upload-questions">
                  <Upload className="h-4 w-4 mr-2" />
                  Bulk Upload
                </Button>
                <Button onClick={() => setCreateQuestionOpen(true)} data-testid="button-add-question">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {adminData?.questions && adminData.questions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Question</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Difficulty</TableHead>
                      <TableHead>Mode</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminData.questions.slice(0, 10).map((q) => (
                      <TableRow key={q.id}>
                        <TableCell className="max-w-md truncate">{q.questionText}</TableCell>
                        <TableCell>{q.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{q.difficulty}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={q.mode === "competition" ? "default" : "secondary"} className="capitalize">
                            {q.mode}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileQuestion className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No questions yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Match Schedule</CardTitle>
              <CardDescription>View and manage scheduled matches</CardDescription>
            </CardHeader>
            <CardContent>
              {adminData?.matches && adminData.matches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Competition</TableHead>
                      <TableHead>Match</TableHead>
                      <TableHead>Round</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminData.matches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>{match.competition.name}</TableCell>
                        <TableCell className="font-medium">
                          {match.homeTeam.name} vs {match.awayTeam.name}
                        </TableCell>
                        <TableCell>Round {match.round}</TableCell>
                        <TableCell>{new Date(match.scheduledAt).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge variant={match.status === "live" ? "default" : match.status === "completed" ? "secondary" : "outline"}>
                            {match.status.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {match.status === "waiting" && (
                            <Button 
                              size="sm" 
                              onClick={() => startMatchMutation.mutate(match.id)}
                              disabled={startMatchMutation.isPending}
                              data-testid={`button-start-match-${match.id}`}
                            >
                              <Play className="h-3 w-3 mr-1" />
                              Start
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No matches scheduled</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>All platform transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {adminData?.payments && adminData.payments.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Team</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adminData.payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.createdAt).toLocaleDateString()}</TableCell>
                        <TableCell className="capitalize">{payment.type}</TableCell>
                        <TableCell>{payment.team?.name || "-"}</TableCell>
                        <TableCell className="text-right font-mono">${Number(payment.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={payment.status === "completed" ? "default" : "secondary"}>
                            {payment.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No payments yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateCompetitionDialog open={createCompetitionOpen} onOpenChange={setCreateCompetitionOpen} />
      <CreateQuestionDialog 
        open={createQuestionOpen} 
        onOpenChange={setCreateQuestionOpen} 
        competitions={adminData?.competitions || []}
      />
    </div>
  );
}
