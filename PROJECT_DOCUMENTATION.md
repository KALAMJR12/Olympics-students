# AI-Tutor Project Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [System Design](#system-design)
3. [Feature Specifications](#feature-specifications)
4. [User Flows](#user-flows)
5. [Database Design](#database-design)
6. [API Documentation](#api-documentation)
7. [Security Considerations](#security-considerations)
8. [Performance Metrics](#performance-metrics)

---

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client (React)                       │
│  - UI Components (ShadCN)                                   │
│  - State Management (TanStack Query)                        │
│  - Authentication Context                                   │
│  - Dark/Light Theme                                         │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/WebSocket
                       │
┌──────────────────────┴──────────────────────────────────────┐
│                  Express API Server                          │
│  - Route Handlers                                           │
│  - WebSocket Handlers                                       │
│  - Authentication Middleware                                │
│  - Error Handling                                           │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ├─ Drizzle ORM
                       │
┌──────────────────────┴──────────────────────────────────────┐
│              Storage Layer (Abstraction)                      │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ DatabaseStorage (Production - PostgreSQL)          │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ LocalStorageAdapter (Development - In-Memory)      │   │
│  └─────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

### Technology Rationale

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | React + TypeScript | Type-safe, component-based UI development |
| Bundler | Vite | Fast HMR, optimal build output |
| Styling | Tailwind CSS | Rapid UI development, consistent theming |
| Backend | Express + TypeScript | Lightweight, familiar, type-safe |
| ORM | Drizzle | Type-safe queries, migration support |
| Database | PostgreSQL | ACID compliance, scalable, relational data |
| Auth | Sessions + bcrypt | Secure, session-based authentication |

---

## System Design

### Authentication Flow

```
User Registration:
┌─────────────────┐
│  User provides  │
│  credentials    │
└────────┬────────┘
         │
         ▼
┌──────────────────────┐
│ Hash password with   │
│ bcrypt (rounds: 10)  │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Store in database    │
│ Check uniqueness     │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Create session       │
│ Set session cookie   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Return user object   │
│ + success message    │
└──────────────────────┘
```

### Competition Match Flow

```
Competition Registration:
┌──────────────────┐
│ Team registers   │
│ for competition  │
└────────┬─────────┘
         │
         ▼
┌──────────────────────┐
│ Process payment      │
│ (if applicable)      │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Add to participant   │
│ pool                 │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ On match start:      │
│ - Load questions     │
│ - Create WebSocket   │
│ - Track answers      │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│ Calculate scores     │
│ Update standings     │
│ Notify users         │
└──────────────────────┘
```

---

## Feature Specifications

### 1. User Management

#### User Profile
```typescript
User {
  id: string (UUID)
  email: string (unique, validated)
  username: string (unique, 3-20 chars)
  password: string (hashed with bcrypt)
  avatar?: string (optional profile picture)
  createdAt: timestamp
  updatedAt: timestamp
  isAdmin: boolean
  isPremium: boolean
  totalTokens: number (practice tokens)
}
```

#### Authentication
- Session-based authentication using express-session
- Secure cookie storage (HttpOnly, Secure flags in production)
- Automatic session timeout after 30 days of inactivity
- Logout functionality with session destruction

### 2. Team Management

#### Team Features
- Create teams with custom names and descriptions
- Up to 50 team members
- Team admin can manage members
- Invite system (email-based)
- Team statistics and history
- Collective token pool for team activities

#### Team Roles
- **Team Owner**: Full control, can delete team
- **Team Admin**: Can manage members, but can't delete
- **Team Member**: Can participate in competitions

### 3. Competition System

#### Competition Types
1. **Official Competitions**: Created by admin, scheduled
2. **Friendly Matches**: User-created, one-time
3. **Practice Sessions**: Individual or team-based

#### Competition Lifecycle
- **Draft**: Admin preparing competition
- **Registration Open**: Teams can register
- **In Progress**: Matches are active
- **Completed**: Results finalized, standings locked

#### Scoring System
- Points-based scoring
- Correct answer = +10 points (configurable)
- Time bonus for faster answers
- Leaderboard ranking based on points

### 4. Question Bank

#### Question Structure
```typescript
Question {
  id: string
  title: string
  description?: string
  options: string[] (4 options)
  correctAnswer: number (0-3 index)
  difficulty: "easy" | "medium" | "hard"
  category: string
  mode: "competition" | "practice"
  competitionId?: string
  createdBy: string (admin id)
  createdAt: timestamp
}
```

#### Difficulty Levels
- **Easy**: 5 points
- **Medium**: 10 points
- **Hard**: 15 points

### 5. Match System

#### Match Types
1. **1v1 Matches**: Individual competition
2. **Team Matches**: Aggregate team score
3. **Tournament Brackets**: Multi-round elimination

#### Match Status
- **Waiting**: Scheduled, waiting to start
- **Active**: Currently running
- **Completed**: Results calculated
- **Canceled**: Cancelled by admin

### 6. Payment System

#### Payment Processing
- Stripe integration ready
- Payment for:
  - Premium membership (monthly/yearly)
  - Competition entry fees
  - Premium question packs
  - Team participation

#### Supported Payment Methods
- Credit/Debit cards
- Digital wallets (Apple Pay, Google Pay)
- Bank transfers (for institutional customers)

#### Payment Status
- **Pending**: Awaiting confirmation
- **Completed**: Successfully processed
- **Failed**: Transaction declined
- **Refunded**: Money returned to user

---

## User Flows

### New User Onboarding Flow

```
1. Landing Page
   ├─ Sign Up CTA
   │  └─ Registration Form
   │     └─ Email Verification (optional)
   │        └─ Welcome Dashboard
   │           └─ Explore Practice Questions
   │              └─ Create First Team
   │                 └─ Join Competition
```

### Competition Participation Flow

```
1. Browse Competitions
   ├─ View Details
   │  └─ Check Requirements
   │     ├─ Meets Requirements
   │     │  └─ Register Team
   │     │     └─ Payment (if required)
   │     │        └─ Confirmation
   │     │           └─ Await Match Time
   │     │              └─ Join Live Match
   │     │                 └─ Answer Questions
   │     │                    └─ View Results
   │     └─ Doesn't Meet Requirements
   │        └─ Upgrade/Prepare
   │           └─ Revisit Later
```

### Admin Panel Flow

```
1. Admin Dashboard
   ├─ Question Management
   │  ├─ Upload Questions
   │  ├─ Review/Edit
   │  └─ Categorize
   ├─ Competition Management
   │  ├─ Create Competition
   │  ├─ Set Rules
   │  ├─ Generate Draws
   │  └─ Monitor Progress
   ├─ User Management
   │  ├─ View Users
   │  ├─ Manage Admins
   │  └─ Handle Disputes
   └─ Analytics
      ├─ Revenue
      ├─ User Activity
      └─ Competition Stats
```

---

## Database Design

### Core Tables

#### users
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  username VARCHAR UNIQUE NOT NULL,
  password VARCHAR NOT NULL,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  is_premium BOOLEAN DEFAULT false,
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### teams
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id),
  practice_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### competitions
```sql
CREATE TABLE competitions (
  id UUID PRIMARY KEY,
  name VARCHAR NOT NULL,
  description TEXT,
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP NOT NULL,
  registration_fee DECIMAL DEFAULT 0,
  max_teams INTEGER,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### matches
```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES competitions(id),
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  scheduled_at TIMESTAMP NOT NULL,
  status VARCHAR DEFAULT 'waiting',
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### questions
```sql
CREATE TABLE questions (
  id UUID PRIMARY KEY,
  title VARCHAR NOT NULL,
  description TEXT,
  options JSONB NOT NULL,
  correct_answer INTEGER NOT NULL,
  difficulty VARCHAR,
  category VARCHAR,
  mode VARCHAR NOT NULL,
  competition_id UUID REFERENCES competitions(id),
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### player_answers
```sql
CREATE TABLE player_answers (
  id UUID PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES matches(id),
  user_id UUID NOT NULL REFERENCES users(id),
  question_id UUID NOT NULL REFERENCES questions(id),
  answer_index INTEGER,
  is_correct BOOLEAN,
  time_taken_seconds INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### standings
```sql
CREATE TABLE standings (
  id UUID PRIMARY KEY,
  competition_id UUID NOT NULL REFERENCES competitions(id),
  team_id UUID NOT NULL REFERENCES teams(id),
  matches_played INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  draws INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  league_points INTEGER DEFAULT 0,
  goal_difference INTEGER DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword123"
}

Response (201):
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe",
    "createdAt": "2026-01-24T12:00:00Z"
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response (200):
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "username": "johndoe"
  }
}
```

### Team Endpoints

#### Create Team
```http
POST /api/teams
Authorization: Bearer <session>
Content-Type: application/json

{
  "name": "Quiz Masters",
  "description": "A team of quiz enthusiasts"
}

Response (201):
{
  "id": "uuid",
  "name": "Quiz Masters",
  "owner_id": "user-uuid",
  "created_at": "2026-01-24T12:00:00Z"
}
```

### Competition Endpoints

#### List Competitions
```http
GET /api/competitions
Response (200):
[
  {
    "id": "uuid",
    "name": "Q1 2026 National Championship",
    "description": "...",
    "start_date": "2026-02-01T18:00:00Z",
    "registration_fee": 100,
    "is_active": true
  }
]
```

#### Register for Competition
```http
POST /api/competitions/:id/register
Authorization: Bearer <session>
Content-Type: application/json

{
  "team_id": "team-uuid"
}

Response (200):
{
  "registration_id": "uuid",
  "status": "confirmed",
  "payment_required": true
}
```

---

## Security Considerations

### 1. Authentication & Authorization
- ✅ Passwords hashed with bcrypt (10 rounds)
- ✅ Session-based auth with secure cookies
- ✅ CSRF protection with tokens
- ✅ Rate limiting on auth endpoints
- ✅ Session timeout after 30 days

### 2. Data Protection
- ✅ HTTPS in production
- ✅ SQL injection prevention via Drizzle ORM
- ✅ XSS protection via React
- ✅ Input validation on all endpoints
- ✅ Sanitization of user inputs

### 3. API Security
- ✅ CORS configuration for trusted origins
- ✅ API rate limiting per user
- ✅ Request size limits
- ✅ Authentication required for sensitive endpoints

### 4. Payment Security
- ✅ PCI DSS compliance ready
- ✅ Stripe tokenization (no card storage)
- ✅ Payment verification on server
- ✅ Audit logs for all transactions

### 5. Admin Access
- ✅ Two-factor authentication for admins (future)
- ✅ Admin action logging
- ✅ Role-based access control
- ✅ Audit trail for sensitive operations

---

## Performance Metrics

### Target Metrics
| Metric | Target | Current |
|--------|--------|---------|
| Page Load Time | <2s | ~1.5s |
| API Response Time | <200ms | ~50-100ms |
| Database Query Time | <100ms | ~10-50ms |
| Concurrent Users | 1000+ | Scalable |
| Uptime | 99.9% | - |
| Build Time | <30s | ~15s |

### Optimization Strategies
1. Code splitting for React components
2. Query optimization with database indexes
3. Caching layer (Redis ready)
4. CDN for static assets
5. Compression (gzip/brotli)
6. Database connection pooling

---

## Monitoring & Logging

### Logging
- Server-side logs for all API requests
- Error tracking and alerting
- User activity logging for audits
- Performance metrics collection

### Error Tracking
- Global error handler on server
- Error boundary on frontend
- Sentry integration ready
- User-friendly error messages

---

## Maintenance & Support

### Regular Maintenance Tasks
- Database backup (daily)
- Log rotation (weekly)
- Security updates (as released)
- Performance monitoring (continuous)

### Incident Response
- Automated health checks
- Alert system for critical errors
- Rollback procedures
- Status page for users

---

**Document Version**: 1.0  
**Last Updated**: January 24, 2026  
**Maintained By**: Development Team
