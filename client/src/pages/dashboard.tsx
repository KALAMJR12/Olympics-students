import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Trophy, 
  Users, 
  Target, 
  Calendar,
  ArrowRight,
  Play,
  Coins,
  TrendingUp,
  Clock
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import type { Team, Competition, Match, Standing } from "@shared/schema";

interface DashboardData {
  teams: (Team & { memberCount: number })[];
  upcomingMatches: (Match & { homeTeam: Team; awayTeam: Team; competition: Competition })[];
  standings: (Standing & { team: Team; competition: Competition })[];
  totalTokens: number;
  activeCompetitions: Competition[];
}

function StatsCard({ 
  title, 
  value, 
  description, 
  icon: Icon,
  trend
}: { 
  title: string; 
  value: string | number; 
  description: string; 
  icon: React.ElementType;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-mono">{value}</div>
        <p className="text-xs text-muted-foreground mt-1">
          {trend && (
            <span className={trend.positive ? "text-green-600" : "text-red-600"}>
              {trend.positive ? "+" : ""}{trend.value}%{" "}
            </span>
          )}
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

function MatchCard({ 
  match 
}: { 
  match: Match & { homeTeam: Team; awayTeam: Team; competition: Competition } 
}) {
  const isLive = match.status === "live";
  const isCompleted = match.status === "completed";
  const scheduledDate = new Date(match.scheduledAt);

  return (
    <Card className="overflow-visible">
      <CardContent className="p-4">
        <div className="flex items-center justify-between gap-4 mb-3">
          <Badge variant={isLive ? "default" : isCompleted ? "secondary" : "outline"} size="sm">
            {isLive ? "LIVE" : isCompleted ? "Completed" : "Upcoming"}
          </Badge>
          <span className="text-xs text-muted-foreground">{match.competition.name}</span>
        </div>
        
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 text-right">
            <p className="font-medium truncate" data-testid={`text-team-home-${match.id}`}>
              {match.homeTeam.name}
            </p>
          </div>
          
          <div className="flex items-center gap-2 px-3">
            {isCompleted || isLive ? (
              <span className="font-mono font-bold text-lg" data-testid={`text-score-${match.id}`}>
                {match.homeScore} - {match.awayScore}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">vs</span>
            )}
          </div>
          
          <div className="flex-1 text-left">
            <p className="font-medium truncate" data-testid={`text-team-away-${match.id}`}>
              {match.awayTeam.name}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mt-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>
              {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          
          {isLive && (
            <Button size="sm" asChild data-testid={`button-join-match-${match.id}`}>
              <Link href={`/match/${match.id}`}>
                <Play className="h-3 w-3 mr-1" />
                Join Match
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function LeagueTablePreview({ 
  standings 
}: { 
  standings: (Standing & { team: Team; competition: Competition })[] 
}) {
  if (standings.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No league standings yet</p>
      </div>
    );
  }

  const sortedStandings = [...standings].sort((a, b) => b.leaguePoints - a.leaguePoints);
  const topStandings = sortedStandings.slice(0, 5);

  return (
    <div className="space-y-2">
      {topStandings.map((standing, index) => (
        <div 
          key={standing.id} 
          className="flex items-center gap-3 p-2 rounded-md hover-elevate"
          data-testid={`standing-row-${index}`}
        >
          <span className="w-6 text-center font-mono font-bold text-sm">{index + 1}</span>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate text-sm">{standing.team.name}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
            <span title="Played">{standing.played}</span>
            <span title="Goal Difference" className={standing.goalDifference >= 0 ? "text-green-600" : "text-red-600"}>
              {standing.goalDifference >= 0 ? "+" : ""}{standing.goalDifference}
            </span>
            <span className="font-bold text-foreground">{standing.leaguePoints} pts</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TeamsList({ 
  teams 
}: { 
  teams: (Team & { memberCount: number })[] 
}) {
  if (teams.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
        <p className="text-muted-foreground mb-4">You haven't joined any teams yet</p>
        <Button asChild data-testid="button-create-first-team">
          <Link href="/teams">Create a Team</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {teams.map((team) => (
        <Link 
          key={team.id} 
          href={`/teams/${team.id}`}
          className="flex items-center gap-3 p-3 rounded-md hover-elevate cursor-pointer"
          data-testid={`team-card-${team.id}`}
        >
          <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{team.name}</p>
            <p className="text-xs text-muted-foreground">{team.memberCount}/5 members</p>
          </div>
          <div className="flex items-center gap-2">
            <Coins className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm">{team.practiceTokens}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-48 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const dashboardData = data || {
    teams: [],
    upcomingMatches: [],
    standings: [],
    totalTokens: 0,
    activeCompetitions: [],
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Welcome back, {user?.username}</h1>
          <p className="text-muted-foreground">Here's your quiz league overview</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild data-testid="button-view-competitions">
            <Link href="/competitions">
              <Trophy className="h-4 w-4 mr-2" />
              Competitions
            </Link>
          </Button>
          <Button asChild data-testid="button-start-practice">
            <Link href="/practice">
              <Target className="h-4 w-4 mr-2" />
              Practice
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard 
          title="My Teams" 
          value={dashboardData.teams.length} 
          description="Teams you're a member of"
          icon={Users}
        />
        <StatsCard 
          title="Upcoming Matches" 
          value={dashboardData.upcomingMatches.filter(m => m.status === "waiting").length} 
          description="Scheduled matches"
          icon={Calendar}
        />
        <StatsCard 
          title="Practice Tokens" 
          value={dashboardData.totalTokens} 
          description="Available across all teams"
          icon={Coins}
        />
        <StatsCard 
          title="Active Competitions" 
          value={dashboardData.activeCompetitions.length} 
          description="Currently running"
          icon={TrendingUp}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>Upcoming Matches</CardTitle>
                <CardDescription>Your scheduled matches across all competitions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/competitions" data-testid="link-view-all-matches">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {dashboardData.upcomingMatches.length > 0 ? (
                <div className="space-y-4">
                  {dashboardData.upcomingMatches.slice(0, 3).map((match) => (
                    <MatchCard key={match.id} match={match} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No upcoming matches</p>
                  <p className="text-sm">Join a competition to start playing!</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <div>
                <CardTitle>League Standings</CardTitle>
                <CardDescription>Top teams in your competitions</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/competitions" data-testid="link-view-full-table">
                  Full Table <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <LeagueTablePreview standings={dashboardData.standings} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle>My Teams</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/teams" data-testid="link-view-all-teams">
                  View All <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <TeamsList teams={dashboardData.teams} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Practice Mode</CardTitle>
              <CardDescription>Sharpen your skills before matches</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm text-muted-foreground">Available Tokens</span>
                <span className="font-mono font-bold">{dashboardData.totalTokens}</span>
              </div>
              <Progress value={Math.min(dashboardData.totalTokens * 10, 100)} className="h-2" />
              <div className="flex gap-2">
                <Button className="flex-1" asChild data-testid="button-practice-now">
                  <Link href="/practice">
                    <Target className="h-4 w-4 mr-2" />
                    Practice Now
                  </Link>
                </Button>
                <Button variant="outline" asChild data-testid="button-buy-tokens">
                  <Link href="/payments">
                    <Coins className="h-4 w-4 mr-2" />
                    Buy Tokens
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
