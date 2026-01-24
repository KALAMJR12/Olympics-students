import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { 
  Users, 
  Plus, 
  Mail, 
  Coins, 
  Trophy,
  UserPlus,
  Crown,
  MoreHorizontal,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import type { Team, User } from "@shared/schema";

const createTeamSchema = z.object({
  name: z.string().min(3, "Team name must be at least 3 characters").max(50),
  description: z.string().max(200).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type CreateTeamFormData = z.infer<typeof createTeamSchema>;
type InviteMemberFormData = z.infer<typeof inviteMemberSchema>;

interface TeamWithMembers extends Team {
  members: { user: User }[];
  competitions: { id: string; name: string }[];
}

function CreateTeamDialog({ 
  open, 
  onOpenChange 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  
  const form = useForm<CreateTeamFormData>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: { name: "", description: "" },
  });

  const createTeamMutation = useMutation({
    mutationFn: async (data: CreateTeamFormData) => {
      const res = await apiRequest("POST", "/api/teams", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Team created!", description: "Your team is ready. Invite members to complete your roster." });
      queryClient.invalidateQueries({ queryKey: ["/api/teams"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create team", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create a New Team</DialogTitle>
          <DialogDescription>
            Create a team to compete in quiz leagues. You'll need exactly 5 members to participate.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => createTeamMutation.mutate(data))} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter team name" data-testid="input-team-name" {...field} />
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell others about your team" 
                      data-testid="input-team-description"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createTeamMutation.isPending} data-testid="button-create-team-submit">
                {createTeamMutation.isPending ? "Creating..." : "Create Team"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function InviteMemberDialog({ 
  team,
  open, 
  onOpenChange 
}: { 
  team: TeamWithMembers;
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  
  const form = useForm<InviteMemberFormData>({
    resolver: zodResolver(inviteMemberSchema),
    defaultValues: { email: "" },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: InviteMemberFormData) => {
      const res = await apiRequest("POST", `/api/teams/${team.id}/invite`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Invitation sent!", description: "An email invitation has been sent." });
      form.reset();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send invitation", description: error.message, variant: "destructive" });
    },
  });

  const isFull = team.members.length >= 5;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
          <DialogDescription>
            Send an invitation to join {team.name}. {isFull ? "Your team is already full." : `${5 - team.members.length} spots remaining.`}
          </DialogDescription>
        </DialogHeader>
        {!isFull ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit((data) => inviteMutation.mutate(data))} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="teammate@example.com" 
                        data-testid="input-invite-email"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={inviteMutation.isPending} data-testid="button-send-invite">
                  {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </Form>
        ) : (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Your team already has 5 members.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function TeamCard({ team }: { team: TeamWithMembers }) {
  const { user } = useAuth();
  const [inviteOpen, setInviteOpen] = useState(false);
  const isCreator = team.createdBy === user?.id;

  return (
    <>
      <Card data-testid={`team-card-${team.id}`}>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{team.name}</CardTitle>
              <CardDescription className="flex items-center gap-2">
                {team.members.length}/5 members
                {isCreator && <Badge variant="secondary" size="sm"><Crown className="h-3 w-3 mr-1" />Creator</Badge>}
              </CardDescription>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-team-menu-${team.id}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/teams/${team.id}`}>View Details</Link>
              </DropdownMenuItem>
              {isCreator && (
                <DropdownMenuItem className="text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Team
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </CardHeader>
        <CardContent className="space-y-4">
          {team.description && (
            <p className="text-sm text-muted-foreground">{team.description}</p>
          )}

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-mono">{team.practiceTokens} tokens</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{team.competitions.length} competitions</span>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">Team Members</p>
            <div className="flex items-center gap-2 flex-wrap">
              {team.members.map((member) => (
                <div key={member.user.id} className="flex items-center gap-2 bg-muted rounded-md px-2 py-1">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {member.user.username.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{member.user.username}</span>
                </div>
              ))}
              {team.members.length < 5 && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setInviteOpen(true)}
                  data-testid={`button-invite-member-${team.id}`}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  Invite
                </Button>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <Button className="flex-1" asChild data-testid={`button-view-team-${team.id}`}>
              <Link href={`/teams/${team.id}`}>View Team</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <InviteMemberDialog team={team} open={inviteOpen} onOpenChange={setInviteOpen} />
    </>
  );
}

export default function TeamsPage() {
  const [createOpen, setCreateOpen] = useState(false);
  
  const { data: teams, isLoading } = useQuery<TeamWithMembers[]>({
    queryKey: ["/api/teams"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">My Teams</h1>
          <p className="text-muted-foreground">Manage your teams and invite members</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} data-testid="button-create-team">
          <Plus className="h-4 w-4 mr-2" />
          Create Team
        </Button>
      </div>

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
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : teams && teams.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <TeamCard key={team.id} team={team} />
          ))}
        </div>
      ) : (
        <Card className="max-w-md mx-auto">
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first team to start competing in quiz leagues
            </p>
            <Button onClick={() => setCreateOpen(true)} data-testid="button-create-first-team">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Team
            </Button>
          </CardContent>
        </Card>
      )}

      <CreateTeamDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
