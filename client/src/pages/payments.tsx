import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  CreditCard, 
  Coins, 
  Trophy, 
  Check,
  Clock,
  XCircle,
  Plus,
  Minus,
  ArrowRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Team, Payment } from "@shared/schema";

interface PaymentWithDetails extends Payment {
  team?: Team;
}

const TOKEN_PRICE = 2.00;
const TOKEN_PACKAGES = [
  { amount: 5, price: 10.00, savings: 0 },
  { amount: 10, price: 18.00, savings: 10 },
  { amount: 25, price: 40.00, savings: 20 },
  { amount: 50, price: 75.00, savings: 25 },
];

function PaymentStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <Badge variant="default" className="bg-green-600"><Check className="h-3 w-3 mr-1" />Completed</Badge>;
    case "pending":
      return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
    case "failed":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function BuyTokensDialog({
  open,
  onOpenChange,
  teams,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teams: Team[];
}) {
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [tokenAmount, setTokenAmount] = useState<number>(10);
  const [customAmount, setCustomAmount] = useState<string>("");
  const { toast } = useToast();

  const selectedPackage = TOKEN_PACKAGES.find(p => p.amount === tokenAmount);
  const price = selectedPackage 
    ? selectedPackage.price 
    : tokenAmount * TOKEN_PRICE;

  const buyTokensMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payments/tokens", {
        teamId: selectedTeam,
        amount: tokenAmount,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Tokens purchased!", description: `${tokenAmount} tokens added to your team.` });
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/practice"] });
      setSelectedTeam("");
      setTokenAmount(10);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Purchase failed", description: error.message, variant: "destructive" });
    },
  });

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    const num = parseInt(value);
    if (!isNaN(num) && num > 0) {
      setTokenAmount(num);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Buy Practice Tokens</DialogTitle>
          <DialogDescription>
            Purchase tokens for your team to access practice mode.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Select Team</Label>
            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
              <SelectTrigger data-testid="select-payment-team">
                <SelectValue placeholder="Choose a team to add tokens to" />
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

          <div className="space-y-2">
            <Label>Token Packages</Label>
            <div className="grid grid-cols-2 gap-3">
              {TOKEN_PACKAGES.map((pkg) => (
                <button
                  key={pkg.amount}
                  onClick={() => { setTokenAmount(pkg.amount); setCustomAmount(""); }}
                  className={`p-4 rounded-md border text-left transition-colors ${
                    tokenAmount === pkg.amount && !customAmount
                      ? "border-primary bg-primary/10"
                      : "hover-elevate"
                  }`}
                  data-testid={`token-package-${pkg.amount}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-bold">{pkg.amount} tokens</span>
                    {pkg.savings > 0 && (
                      <Badge variant="secondary" size="sm">Save {pkg.savings}%</Badge>
                    )}
                  </div>
                  <span className="text-lg font-mono font-bold">${pkg.price.toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Or enter custom amount</Label>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setTokenAmount(Math.max(1, tokenAmount - 1))}
                data-testid="button-decrease-tokens"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min="1"
                value={customAmount || tokenAmount}
                onChange={(e) => handleCustomAmount(e.target.value)}
                className="text-center font-mono"
                data-testid="input-custom-tokens"
              />
              <Button 
                variant="outline" 
                size="icon"
                onClick={() => setTokenAmount(tokenAmount + 1)}
                data-testid="button-increase-tokens"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-md bg-muted">
            <div className="flex items-center justify-between gap-4 mb-2">
              <span className="text-muted-foreground">Tokens</span>
              <span className="font-mono">{tokenAmount}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-lg">
              <span className="font-medium">Total</span>
              <span className="font-mono font-bold">${price.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => buyTokensMutation.mutate()} 
              disabled={!selectedTeam || buyTokensMutation.isPending}
              data-testid="button-confirm-purchase"
            >
              {buyTokensMutation.isPending ? "Processing..." : `Pay $${price.toFixed(2)}`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PaymentHistoryTable({ payments }: { payments: PaymentWithDetails[] }) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No transactions yet</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
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
          {payments.map((payment) => (
            <TableRow key={payment.id} data-testid={`payment-row-${payment.id}`}>
              <TableCell className="text-sm">
                {new Date(payment.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {payment.type === "tokens" ? (
                    <Coins className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Trophy className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="capitalize">{payment.type === "tokens" ? "Practice Tokens" : "Registration"}</span>
                </div>
              </TableCell>
              <TableCell>{payment.team?.name || "-"}</TableCell>
              <TableCell className="text-right font-mono">
                ${Number(payment.amount).toFixed(2)}
              </TableCell>
              <TableCell>
                <PaymentStatusBadge status={payment.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function PaymentsPage() {
  const [buyTokensOpen, setBuyTokensOpen] = useState(false);

  const { data: paymentData, isLoading } = useQuery<{
    payments: PaymentWithDetails[];
    teams: Team[];
    totalSpent: number;
  }>({
    queryKey: ["/api/payments"],
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Payments</h1>
          <p className="text-muted-foreground">Manage tokens and view transaction history</p>
        </div>
        <Button onClick={() => setBuyTokensOpen(true)} data-testid="button-buy-tokens">
          <Coins className="h-4 w-4 mr-2" />
          Buy Tokens
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
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
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">${(paymentData?.totalSpent || 0).toFixed(2)}</div>
                <p className="text-xs text-muted-foreground">Lifetime payments</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Transactions</CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{paymentData?.payments.length || 0}</div>
                <p className="text-xs text-muted-foreground">Total payments made</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Teams</CardTitle>
                <Coins className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-mono">{paymentData?.teams.length || 0}</div>
                <p className="text-xs text-muted-foreground">Teams you can fund</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Team Token Balances</CardTitle>
              <CardDescription>Current token balances for your teams</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentData?.teams && paymentData.teams.length > 0 ? (
                <div className="space-y-3">
                  {paymentData.teams.map((team) => (
                    <div 
                      key={team.id} 
                      className="flex items-center justify-between gap-4 p-3 rounded-md bg-muted/50"
                      data-testid={`team-balance-${team.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                          <Coins className="h-5 w-5 text-primary" />
                        </div>
                        <span className="font-medium">{team.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-mono font-bold">{team.practiceTokens} tokens</span>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => setBuyTokensOpen(true)}
                          data-testid={`button-add-tokens-${team.id}`}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>You're not a member of any teams yet</p>
                  <Button variant="outline" asChild className="mt-4">
                    <Link href="/teams">
                      Create or Join a Team
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>All your payments and purchases</CardDescription>
            </CardHeader>
            <CardContent>
              <PaymentHistoryTable payments={paymentData?.payments || []} />
            </CardContent>
          </Card>
        </>
      )}

      <BuyTokensDialog
        open={buyTokensOpen}
        onOpenChange={setBuyTokensOpen}
        teams={paymentData?.teams || []}
      />
    </div>
  );
}
