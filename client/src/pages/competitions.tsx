import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Trophy, 
  Calendar, 
  Users, 
  Clock,
  ArrowRight,
  Check,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Competition, Team, Match, Standing } from "@shared/schema";

interface CompetitionWithDetails extends Competition {
  registeredTeams: number;
  isRegistered: boolean;
  userTeams: Team[];
  standings: (Standing & { team: Team })[];
  matches: (Match & { homeTeam: Team; awayTeam: Team })[];
}

function CompetitionCard({ 
  competition, 
  onRegister 
}: { 
  competition: CompetitionWithDetails;
  onRegister: (competitionId: string) => void;
}) {
  const now = new Date();
  const startDate = new Date(competition.startDate);
  const endDate = new Date(competition.endDate);
  const deadline = new Date(competition.registrationDeadline);
  
  const isActive = now >= startDate && now <= endDate;
  const isUpcoming = now < startDate;
  const registrationOpen = now < deadline;
  const spotsRemaining = competition.maxTeams - competition.registeredTeams;

  return (
    <Card data-testid={`competition-card-${competition.id}`}>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Trophy className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{competition.name}</CardTitle>
              <CardDescription>
                {competition.registeredTeams}/{competition.maxTeams} teams registered
              </CardDescription>
            </div>
          </div>
          <Badge variant={isActive ? "default" : isUpcoming ? "secondary" : "outline"}>
            {isActive ? "Active" : isUpcoming ? "Upcoming" : "Completed"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {competition.description && (
          <p className="text-sm text-muted-foreground">{competition.description}</p>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              {startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>
              {registrationOpen 
                ? `Reg. closes ${deadline.toLocaleDateString()}` 
                : "Registration closed"}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 border-t">
          <div>
            <span className="text-2xl font-bold font-mono">${Number(competition.registrationFee).toFixed(2)}</span>
            <span className="text-sm text-muted-foreground ml-2">per team</span>
          </div>
          
          {competition.isRegistered ? (
            <Button variant="outline" asChild data-testid={`button-view-competition-${competition.id}`}>
              <Link href={`/competitions/${competition.id}`}>
                <Check className="h-4 w-4 mr-2" />
                Registered
              </Link>
            </Button>
          ) : registrationOpen && spotsRemaining > 0 ? (
            <Button onClick={() => onRegister(competition.id)} data-testid={`button-register-competition-${competition.id}`}>
              Register Team
            </Button>
          ) : (
            <Button variant="outline" disabled>
              {spotsRemaining <= 0 ? "Full" : "Closed"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LeagueTable({ standings }: { standings: (Standing & { team: Team })[] }) {
  const sortedStandings = [...standings].sort((a, b) => {
    if (b.leaguePoints !== a.leaguePoints) return b.leaguePoints - a.leaguePoints;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.pointsFor - a.pointsFor;
  });

  if (standings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No standings available yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">#</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-center">P</TableHead>
            <TableHead className="text-center">W</TableHead>
            <TableHead className="text-center">D</TableHead>
            <TableHead className="text-center">L</TableHead>
            <TableHead className="text-center">PF</TableHead>
            <TableHead className="text-center">PA</TableHead>
            <TableHead className="text-center">GD</TableHead>
            <TableHead className="text-center font-bold">Pts</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedStandings.map((standing, index) => (
            <TableRow key={standing.id} data-testid={`table-row-${index}`}>
              <TableCell className="font-mono font-bold">{index + 1}</TableCell>
              <TableCell className="font-medium">{standing.team.name}</TableCell>
              <TableCell className="text-center font-mono">{standing.played}</TableCell>
              <TableCell className="text-center font-mono">{standing.won}</TableCell>
              <TableCell className="text-center font-mono">{standing.drawn}</TableCell>
              <TableCell className="text-center font-mono">{standing.lost}</TableCell>
              <TableCell className="text-center font-mono">{standing.pointsFor}</TableCell>
              <TableCell className="text-center font-mono">{standing.pointsAgainst}</TableCell>
              <TableCell className={`text-center font-mono ${standing.goalDifference >= 0 ? "text-green-600" : "text-red-600"}`}>
                {standing.goalDifference >= 0 ? "+" : ""}{standing.goalDifference}
              </TableCell>
              <TableCell className="text-center font-mono font-bold">{standing.leaguePoints}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function MatchesSchedule({ matches }: { matches: (Match & { homeTeam: Team; awayTeam: Team })[] }) {
  const groupedMatches = matches.reduce((acc, match) => {
    const dateKey = new Date(match.scheduledAt).toLocaleDateString();
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(match);
    return acc;
  }, {} as Record<string, typeof matches>);

  if (matches.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No matches scheduled yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedMatches).map(([date, dayMatches]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-muted-foreground mb-3">{date}</h3>
          <div className="space-y-2">
            {dayMatches.map((match) => (
              <div 
                key={match.id} 
                className="flex items-center gap-4 p-3 rounded-md bg-muted/50"
                data-testid={`match-row-${match.id}`}
              >
                <Badge 
                  variant={match.status === "live" ? "default" : match.status === "completed" ? "secondary" : "outline"}
                  size="sm"
                >
                  {match.status === "live" ? "LIVE" : match.status === "completed" ? "FT" : new Date(match.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Badge>
                <div className="flex-1 flex items-center gap-2">
                  <span className="font-medium">{match.homeTeam.name}</span>
                  {match.status !== "waiting" ? (
                    <span className="font-mono px-2">{match.homeScore} - {match.awayScore}</span>
                  ) : (
                    <span className="text-muted-foreground px-2">vs</span>
                  )}
                  <span className="font-medium">{match.awayTeam.name}</span>
                </div>
                {match.status === "live" && (
                  <Button size="sm" asChild>
                    <Link href={`/match/${match.id}`}>Join</Link>
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RegisterTeamDialog({ 
  competition,
  open, 
  onOpenChange 
}: { 
  competition: CompetitionWithDetails | null;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const { toast } = useToast();

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (!competition || !selectedTeam) throw new Error("Missing data");
      const res = await apiRequest("POST", `/api/competitions/${competition.id}/register`, { teamId: selectedTeam });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Registration successful!", description: "Your team has been registered for the competition." });
      queryClient.invalidateQueries({ queryKey: ["/api/competitions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setSelectedTeam("");
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    },
  });

  const eligibleTeams = competition?.userTeams.filter(t => !competition.isRegistered) || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register for {competition?.name}</DialogTitle>
          <DialogDescription>
            Choose a team to register. Registration fee: ${Number(competition?.registrationFee || 0).toFixed(2)}
          </DialogDescription>
        </DialogHeader>
        
        {eligibleTeams.length > 0 ? (
          <div className="space-y-4">
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger data-testid="select-team">
                <SelectValue placeholder="Select a team" />
              </SelectTrigger>
              <SelectContent>
                {eligibleTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => registerMutation.mutate()} 
                disabled={!selectedTeam || registerMutation.isPending}
                data-testid="button-confirm-register"
              >
                {registerMutation.isPending ? "Registering..." : `Pay $${Number(competition?.registrationFee || 0).toFixed(2)}`}
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">You need to create or join a team first</p>
            <Button asChild>
              <Link href="/teams">Create a Team</Link>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function CompetitionsPage() {
  const [selectedCompetition, setSelectedCompetition] = useState<CompetitionWithDetails | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("competitions");

  const { data: competitions, isLoading } = useQuery<CompetitionWithDetails[]>({
    queryKey: ["/api/competitions"],
  });

  const handleRegister = (competitionId: string) => {
    const competition = competitions?.find(c => c.id === competitionId);
    if (competition) {
      setSelectedCompetition(competition);
      setRegisterOpen(true);
    }
  };

  const activeCompetition = competitions?.find(c => c.isRegistered);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Competitions</h1>
          <p className="text-muted-foreground">Join leagues and compete with other teams</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="competitions" data-testid="tab-competitions">All Competitions</TabsTrigger>
          <TabsTrigger value="standings" data-testid="tab-standings">League Table</TabsTrigger>
          <TabsTrigger value="matches" data-testid="tab-matches">Match Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="competitions" className="mt-6">
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-12 w-12 rounded-md" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-1" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-24 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : competitions && competitions.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {competitions.map((competition) => (
                <CompetitionCard 
                  key={competition.id} 
                  competition={competition} 
                  onRegister={handleRegister}
                />
              ))}
            </div>
          ) : (
            <Card className="max-w-md mx-auto">
              <CardContent className="text-center py-12">
                <Trophy className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No competitions available</h3>
                <p className="text-muted-foreground">
                  Check back later for upcoming quiz league competitions
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="standings" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>League Standings</CardTitle>
              <CardDescription>Current rankings in active competitions</CardDescription>
            </CardHeader>
            <CardContent>
              {activeCompetition ? (
                <LeagueTable standings={activeCompetition.standings} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Register for a competition to see standings</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="matches" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Match Schedule</CardTitle>
              <CardDescription>Upcoming and recent matches</CardDescription>
            </CardHeader>
            <CardContent>
              {activeCompetition ? (
                <MatchesSchedule matches={activeCompetition.matches} />
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Register for a competition to see match schedule</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <RegisterTeamDialog 
        competition={selectedCompetition} 
        open={registerOpen} 
        onOpenChange={setRegisterOpen} 
      />
    </div>
  );
}
