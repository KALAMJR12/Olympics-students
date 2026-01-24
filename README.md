# AI-Tutor: Online Learning Competition Platform

## Overview

**AI-Tutor** is a modern, full-stack web application designed to revolutionize online learning through competitive gamification. It provides a comprehensive ecosystem for users to practice, compete, and learn from trivia questions and competitions while fostering team-based collaboration and friendly matches.

### Vision
To create the future of online learning by combining:
- 📚 **Interactive Learning** through practice questions and real-time competitions
- 🎮 **Gamification** with token systems, leaderboards, and standings
- 🏆 **Competition** through both official tournaments and friendly matches
- 💰 **Monetization** with freemium models and premium access tiers
- 👥 **Community** through team creation and collaboration features

---

## Current Status ✅

### Live Features
- ✅ User Authentication (Registration & Login)
- ✅ Session Management with secure tokens
- ✅ Dashboard with user statistics
- ✅ Team Management (Create, Join, View)
- ✅ Competition Browsing
- ✅ Practice Questions
- ✅ Match History
- ✅ Payment Tracking
- ✅ Local Storage Fallback (Development)
- ✅ Responsive UI with Dark/Light Mode
- ✅ Tailwind CSS Styling

### Technology Stack

**Frontend:**
- React 18+ with TypeScript
- Vite for fast development
- Tailwind CSS for styling
- ShadCN UI Components
- React Router for navigation
- TanStack Query for data management

**Backend:**
- Express.js with TypeScript
- Drizzle ORM
- PostgreSQL (Production) / Local Storage (Development)
- WebSocket support (Socket.io ready)
- bcrypt for password hashing
- express-session for authentication

**DevOps:**
- Node.js 25+
- Cross-platform support (Windows, Mac, Linux)
- Netlify Neo ready for deployment

---

## Getting Started

### Prerequisites
- Node.js v25 or higher
- npm or yarn package manager

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd AI-Tutor

# Install dependencies
npm install

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

### Environment Variables

Create a `.env` file in the root directory (optional for development):

```env
# Database (optional - uses local storage by default)
DATABASE_URL=postgresql://user:password@localhost:5432/ai_tutor

# Session Secret
SESSION_SECRET=your-secret-key-here

# Port
PORT=5000
```

---

## Project Structure

```
AI-Tutor/
├── client/                 # React Frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Utilities and helpers
│   │   ├── App.tsx
│   │   └── index.css      # Global styles with Tailwind
│   └── index.html
├── server/                 # Express Backend
│   ├── index.ts           # Main server entry point
│   ├── db.ts              # Database configuration
│   ├── storage.ts         # Storage abstraction layer
│   ├── local-storage.ts   # In-memory storage adapter
│   ├── routes.ts          # API routes and WebSocket
│   └── static.ts          # Static file serving
├── shared/                # Shared Types & Schema
│   └── schema.ts          # Drizzle schema definitions
└── package.json
```

---

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user info
- `POST /api/auth/logout` - Logout user

### Users & Teams
- `GET /api/teams` - List user's teams
- `POST /api/teams` - Create new team
- `GET /api/teams/:id` - Get team details
- `POST /api/teams/:id/members` - Add team member
- `DELETE /api/teams/:id` - Delete team

### Competitions
- `GET /api/competitions` - List all competitions
- `GET /api/competitions/:id` - Get competition details
- `POST /api/competitions/:id/register` - Register team for competition

### Matches
- `GET /api/matches` - List upcoming matches
- `GET /api/matches/:id` - Get match details
- `POST /api/matches/:id/questions` - Get match questions
- `POST /api/answers` - Submit player answer

### Dashboard
- `GET /api/dashboard` - Get user dashboard data
- `GET /api/admin/data` - Get admin analytics (admin only)

---

## Key Features Explained

### User Tiers
- **Free Tier**: Limited practice questions, view competitions
- **Premium Tier**: Unlimited questions, team participation, competition entry
- **Admin Tier**: Full control - create questions, competitions, manage matches

### Competition Flow
1. Admin creates competition with dates and rules
2. Teams register for competition (may require fee)
3. System generates match schedule
4. Players answer questions in real-time during matches
5. Scores calculated automatically
6. Leaderboard updated in real-time

### Team System
- Create teams with custom names and descriptions
- Invite other users to join
- Track team statistics and history
- Collective token pool for team activities

### Practice Mode
- Access pool of practice questions
- Different difficulty levels
- Instant feedback on answers
- Track personal statistics

---

## Database Schema

Key tables:
- `users` - User accounts and profiles
- `teams` - Team information
- `team_members` - Team membership mapping
- `competitions` - Competition definitions
- `matches` - Individual match instances
- `questions` - Question bank
- `player_answers` - Match answers and scoring
- `standings` - Competition leaderboards
- `payments` - Payment history
- `practice_sessions` - Practice question records

---

## Development Workflow

### Building
```bash
npm run build
```

### Running Tests (when available)
```bash
npm test
```

### Code Quality
- TypeScript for type safety
- ESLint for code linting
- Prettier for code formatting

---

## Deployment

### Netlify Neo (Recommended)
The application is configured for Netlify Neo deployment:

```bash
# Deploy to Netlify
npm run build
netlify deploy --prod
```

### Docker (Optional)
```bash
docker build -t ai-tutor .
docker run -p 5000:5000 ai-tutor
```

---

## Support & Contributing

For issues, suggestions, or contributions:
1. Check existing issues on GitHub
2. Create detailed bug reports with reproduction steps
3. Follow the code style guidelines
4. Submit pull requests with clear descriptions

---

## Roadmap

See [DEVELOPMENT_ROADMAP.md](./DEVELOPMENT_ROADMAP.md) for:
- Phase 2 features (Premium access, Admin panel)
- Phase 3 improvements (Advanced competition logic)
- Phase 4+ nice-to-have features

---

## License

[Add your license here]

---

## Contact

For questions or feedback:
- Email: [your-email@example.com]
- Discord: [Add your Discord server]

---

**Last Updated**: January 24, 2026  
**Version**: 1.0.0 (MVP)
