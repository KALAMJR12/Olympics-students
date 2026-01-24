# Admin Panel Implementation Guide

## Overview
This guide provides step-by-step instructions for implementing the AI-Tutor Admin Panel, which is critical for system testing and management.

---

## Phase: Admin Panel MVP (Testing & System Management)

### Objectives
1. Create admin authentication and role management
2. Build admin dashboard with system overview
3. Implement question management (upload, edit, delete, review)
4. Implement competition management (create, edit, monitor)
5. Build user and team management
6. Create basic analytics dashboard
7. Enable easy test data generation

---

## Implementation Roadmap

### Step 1: Admin Authentication & Authorization

#### 1.1 Add Admin Role to User Model
**Files to modify:**
- `shared/schema.ts` - Add `isAdmin` boolean field

```typescript
// Add to users table
isAdmin: boolean().default(false),
```

#### 1.2 Create Admin Middleware
**New file:** `server/middleware/admin.ts`

```typescript
import { Request, Response, NextFunction } from "express";

export function adminOnly(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  if (!user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }
  
  next();
}
```

#### 1.3 Create Admin Routes
**New file:** `server/admin-routes.ts`

```typescript
import { Router } from "express";
import { adminOnly } from "./middleware/admin.ts";
import { storage } from "./storage.ts";

const router = Router();

// All routes protected with adminOnly middleware
router.use(adminOnly);

// Questions
router.get("/questions", async (req, res) => {
  const questions = await storage.getAllQuestions();
  res.json(questions);
});

router.post("/questions", async (req, res) => {
  // Question creation logic
});

router.put("/questions/:id", async (req, res) => {
  // Question update logic
});

router.delete("/questions/:id", async (req, res) => {
  // Question deletion logic
});

// Competitions
router.get("/competitions", async (req, res) => {
  const competitions = await storage.getAllCompetitions();
  res.json(competitions);
});

router.post("/competitions", async (req, res) => {
  // Competition creation logic
});

// Users
router.get("/users", async (req, res) => {
  // Get all users
});

// Dashboard
router.get("/dashboard", async (req, res) => {
  // Get admin analytics
});

export default router;
```

---

### Step 2: Admin Dashboard

#### 2.1 Create Admin Layout Component
**New file:** `client/src/components/AdminLayout.tsx`

```typescript
import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Button } from "./ui/button";

export function AdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className={`w-64 bg-sidebar border-r ${sidebarOpen ? "" : "hidden"}`}>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-foreground">Admin Panel</h2>
        </div>
        <nav className="space-y-2 px-4">
          <a href="/admin/dashboard" className="block p-3 rounded hover:bg-sidebar-accent">
            Dashboard
          </a>
          <a href="/admin/questions" className="block p-3 rounded hover:bg-sidebar-accent">
            Questions
          </a>
          <a href="/admin/competitions" className="block p-3 rounded hover:bg-sidebar-accent">
            Competitions
          </a>
          <a href="/admin/users" className="block p-3 rounded hover:bg-sidebar-accent">
            Users
          </a>
          <a href="/admin/analytics" className="block p-3 rounded hover:bg-sidebar-accent">
            Analytics
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-card border-b p-4">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              ☰ Menu
            </Button>
            <a href="/" className="text-sm text-primary hover:underline">
              ← Back to App
            </a>
          </div>
        </header>
        
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

#### 2.2 Create Dashboard Page
**New file:** `client/src/pages/admin/Dashboard.tsx`

```typescript
import { useQuery } from "@tanstack/react-query";

export function AdminDashboard() {
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: async () => {
      const res = await fetch("/api/admin/dashboard");
      return res.json();
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-card p-6 rounded border">
          <div className="text-sm text-muted-foreground">Total Users</div>
          <div className="text-3xl font-bold">{dashboardData?.stats?.totalUsers || 0}</div>
        </div>
        
        <div className="bg-card p-6 rounded border">
          <div className="text-sm text-muted-foreground">Total Teams</div>
          <div className="text-3xl font-bold">{dashboardData?.stats?.totalTeams || 0}</div>
        </div>
        
        <div className="bg-card p-6 rounded border">
          <div className="text-sm text-muted-foreground">Active Competitions</div>
          <div className="text-3xl font-bold">{dashboardData?.stats?.activeCompetitions || 0}</div>
        </div>
        
        <div className="bg-card p-6 rounded border">
          <div className="text-sm text-muted-foreground">Total Questions</div>
          <div className="text-3xl font-bold">{dashboardData?.stats?.totalQuestions || 0}</div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-card p-6 rounded border">
          <h3 className="font-semibold mb-4">Recent Users</h3>
          {/* User list */}
        </div>
        
        <div className="bg-card p-6 rounded border">
          <h3 className="font-semibold mb-4">Recent Competitions</h3>
          {/* Competition list */}
        </div>
      </div>
    </div>
  );
}
```

---

### Step 3: Question Management

#### 3.1 Create Question Upload Component
**New file:** `client/src/pages/admin/Questions.tsx`

```typescript
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export function AdminQuestions() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: questions = [] } = useQuery({
    queryKey: ["admin", "questions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/questions");
      return res.json();
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (questionData: any) => {
      const res = await fetch("/api/admin/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(questionData),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "questions"] });
      setShowForm(false);
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Question Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add Question"}
        </Button>
      </div>

      {showForm && (
        <QuestionForm 
          onSubmit={(data) => createQuestionMutation.mutate(data)}
          isLoading={createQuestionMutation.isPending}
        />
      )}

      {/* Questions Table */}
      <div className="bg-card rounded border overflow-hidden">
        <table className="w-full">
          <thead className="bg-sidebar">
            <tr>
              <th className="p-4 text-left">Title</th>
              <th className="p-4 text-left">Category</th>
              <th className="p-4 text-left">Difficulty</th>
              <th className="p-4 text-left">Mode</th>
              <th className="p-4 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {questions.map((q: any) => (
              <tr key={q.id} className="border-t hover:bg-sidebar-accent">
                <td className="p-4">{q.title}</td>
                <td className="p-4">{q.category}</td>
                <td className="p-4">{q.difficulty}</td>
                <td className="p-4">{q.mode}</td>
                <td className="p-4 space-x-2">
                  <Button variant="outline" size="sm">Edit</Button>
                  <Button variant="destructive" size="sm">Delete</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function QuestionForm({ onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    options: ["", "", "", ""],
    correctAnswer: 0,
    difficulty: "medium",
    category: "",
    mode: "practice",
  });

  return (
    <div className="bg-card p-6 rounded border mb-8">
      <form onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded bg-input"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Category</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded bg-input"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </div>
        </div>

        {/* Options */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Options</label>
          <div className="space-y-2">
            {formData.options.map((option, idx) => (
              <input
                key={idx}
                type="text"
                className="w-full px-3 py-2 border rounded bg-input"
                placeholder={`Option ${idx + 1}`}
                value={option}
                onChange={(e) => {
                  const newOptions = [...formData.options];
                  newOptions[idx] = e.target.value;
                  setFormData({ ...formData, options: newOptions });
                }}
                required
              />
            ))}
          </div>
        </div>

        {/* Correct Answer */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Correct Answer</label>
          <select
            className="w-full px-3 py-2 border rounded bg-input"
            value={formData.correctAnswer}
            onChange={(e) => setFormData({ ...formData, correctAnswer: Number(e.target.value) })}
          >
            {formData.options.map((_, idx) => (
              <option key={idx} value={idx}>
                Option {idx + 1}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty and Mode */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Difficulty</label>
            <select
              className="w-full px-3 py-2 border rounded bg-input"
              value={formData.difficulty}
              onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
            >
              <option>easy</option>
              <option>medium</option>
              <option>hard</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Mode</label>
            <select
              className="w-full px-3 py-2 border rounded bg-input"
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
            >
              <option>practice</option>
              <option>competition</option>
            </select>
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Creating..." : "Create Question"}
        </Button>
      </form>
    </div>
  );
}
```

---

### Step 4: Competition Management

#### 4.1 Create Competition Management Page
**New file:** `client/src/pages/admin/Competitions.tsx`

```typescript
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export function AdminCompetitions() {
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();
  
  const { data: competitions = [] } = useQuery({
    queryKey: ["admin", "competitions"],
    queryFn: async () => {
      const res = await fetch("/api/admin/competitions");
      return res.json();
    },
  });

  const createCompetitionMutation = useMutation({
    mutationFn: async (compData: any) => {
      const res = await fetch("/api/admin/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(compData),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "competitions"] });
      setShowForm(false);
    },
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Competition Management</h1>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Create Competition"}
        </Button>
      </div>

      {showForm && (
        <CompetitionForm 
          onSubmit={(data) => createCompetitionMutation.mutate(data)}
          isLoading={createCompetitionMutation.isPending}
        />
      )}

      {/* Competitions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {competitions.map((comp: any) => (
          <div key={comp.id} className="bg-card p-6 rounded border">
            <h3 className="font-bold text-lg mb-2">{comp.name}</h3>
            <p className="text-sm text-muted-foreground mb-4">{comp.description}</p>
            
            <div className="space-y-1 mb-4 text-sm">
              <div><strong>Start:</strong> {new Date(comp.startDate).toLocaleString()}</div>
              <div><strong>Status:</strong> {comp.isActive ? "Active" : "Inactive"}</div>
              <div><strong>Fee:</strong> ${comp.registrationFee}</div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm">Edit</Button>
              <Button variant="outline" size="sm">View Details</Button>
              <Button variant="destructive" size="sm">Delete</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function CompetitionForm({ onSubmit, isLoading }: any) {
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
    registrationFee: 0,
    maxTeams: 100,
  });

  return (
    <div className="bg-card p-6 rounded border mb-8">
      <form onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Name</label>
            <input
              type="text"
              className="w-full px-3 py-2 border rounded bg-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Registration Fee</label>
            <input
              type="number"
              className="w-full px-3 py-2 border rounded bg-input"
              value={formData.registrationFee}
              onChange={(e) => setFormData({ ...formData, registrationFee: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            className="w-full px-3 py-2 border rounded bg-input"
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-2">Start Date</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border rounded bg-input"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input
              type="datetime-local"
              className="w-full px-3 py-2 border rounded bg-input"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              required
            />
          </div>
        </div>

        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? "Creating..." : "Create Competition"}
        </Button>
      </form>
    </div>
  );
}
```

---

### Step 5: Admin Routes Integration

#### 5.1 Update Main Server Routes
**Modify:** `server/routes.ts`

Add admin routes import and middleware:

```typescript
import adminRoutes from "./admin-routes.ts";

// Protected admin routes
app.use("/api/admin", adminRoutes);
```

#### 5.2 Update Frontend Router
**Modify:** `client/src/App.tsx`

Add admin routes:

```typescript
import { AdminLayout } from "./components/AdminLayout";
import { AdminDashboard } from "./pages/admin/Dashboard";
import { AdminQuestions } from "./pages/admin/Questions";
import { AdminCompetitions } from "./pages/admin/Competitions";

// Add to routes array:
{
  path: "/admin",
  element: <AdminLayout />,
  children: [
    { path: "dashboard", element: <AdminDashboard /> },
    { path: "questions", element: <AdminQuestions /> },
    { path: "competitions", element: <AdminCompetitions /> },
    // More admin routes...
  ],
}
```

---

### Step 6: Test Data Seed Script

#### 6.1 Create Seed Data Generator
**New file:** `server/seed-data.ts`

```typescript
import { storage } from "./storage.ts";

export async function seedTestData() {
  console.log("Seeding test data...");

  // Create admin user
  const adminUser = await storage.createUser({
    email: "admin@ai-tutor.com",
    username: "admin",
    password: "admin123", // hashed in actual implementation
    isAdmin: true,
  });

  // Create test questions
  const testQuestions = [
    {
      title: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      correctAnswer: 2,
      difficulty: "easy",
      category: "Geography",
      mode: "practice",
    },
    // More test questions...
  ];

  for (const q of testQuestions) {
    await storage.createQuestion({
      ...q,
      createdBy: adminUser.id,
    });
  }

  // Create test competition
  const competition = await storage.createCompetition({
    name: "Test Competition",
    description: "A test competition",
    startDate: new Date(),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    registrationFee: 0,
    createdBy: adminUser.id,
    isActive: true,
  });

  console.log("✅ Test data seeded successfully");
  console.log(`Admin user: admin@ai-tutor.com / admin123`);
}
```

---

## Implementation Steps (Priority Order)

### Priority 1 (MVP - This Week)
- [ ] Add `isAdmin` field to users table
- [ ] Create admin middleware
- [ ] Create basic admin API routes (/api/admin/dashboard, /api/admin/questions)
- [ ] Create admin layout component
- [ ] Create admin dashboard page with stats
- [ ] Create admin login/access check

### Priority 2 (Week 2)
- [ ] Question management (create, list, edit, delete)
- [ ] Competition management (create, list, edit)
- [ ] Admin questions upload page
- [ ] Admin competitions management page
- [ ] Test data seeding

### Priority 3 (Week 3)
- [ ] User management page
- [ ] Analytics dashboard
- [ ] Bulk question upload (CSV)
- [ ] Export data functionality

### Priority 4 (Week 4+)
- [ ] Live competition monitoring
- [ ] Advanced analytics
- [ ] Admin reports
- [ ] System health dashboard

---

## Quick Start: Making Yourself Admin

### Option 1: Database
```sql
UPDATE users SET is_admin = true WHERE email = 'your-email@example.com';
```

### Option 2: Seed Script
Run seed data script to create test admin account with credentials:
- Email: `admin@ai-tutor.com`
- Password: `admin123`

---

## Testing Checklist

After implementing each component:

- [ ] Admin can log in
- [ ] Admin can see dashboard with correct stats
- [ ] Admin can create questions
- [ ] Admin can edit questions
- [ ] Admin can delete questions
- [ ] Admin can create competitions
- [ ] Admin can view all users
- [ ] Regular users cannot access admin routes
- [ ] Test data seeds successfully

---

## Notes for Implementation

1. **Authentication**: Use existing session system, add `isAdmin` check
2. **Database Abstraction**: All operations go through `storage` interface
3. **Error Handling**: Add try-catch and proper error responses
4. **Validation**: Validate all input data before database operations
5. **Logging**: Log all admin actions for audit trail
6. **Permissions**: Regular users cannot access `/admin/*` routes

---

## Next Steps After Admin Panel

1. Create live competition monitoring
2. Implement match generation and auto-scoring
3. Add WebSocket support for real-time updates
4. Create spectator mode for competitions
5. Build analytics and reporting

---

**Document Created**: January 24, 2026  
**Status**: Ready for Implementation  
**Estimated Time**: 2-3 weeks for MVP
