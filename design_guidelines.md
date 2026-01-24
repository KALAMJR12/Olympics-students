# Design Guidelines: Academic Quiz League Platform

## Design Approach

**Selected System**: Material Design 3 with adaptations for educational/competitive contexts

**Rationale**: Information-dense application requiring clear data hierarchy, real-time updates, and dashboard-heavy interfaces. Material Design provides excellent patterns for complex data displays, tables, and competitive scoring systems.

**Key Principles**:
- Clarity over decoration - prioritize legibility of scores, standings, and match data
- Scannable hierarchies - users need to quickly parse league tables, team rosters, and match schedules
- Responsive feedback - real-time match updates must be immediately visible
- Trust through structure - payment flows and competition registration require clear, confident UI

---

## Typography

**Font Family**: 
- Primary: Inter or Roboto (via Google Fonts CDN)
- Monospace: JetBrains Mono (for scores, timers, and numeric data)

**Hierarchy**:
- Display (Headings): Bold (700), 2.5rem to 3.5rem
- Titles (Dashboard sections): Semibold (600), 1.5rem to 2rem
- Body (Primary content): Regular (400), 1rem, line-height 1.6
- Captions (Meta info, timestamps): Regular (400), 0.875rem
- Data/Numbers (Scores, standings): Medium (500), tabular-nums for alignment

---

## Layout System

**Spacing Units**: Tailwind units of 2, 4, 6, 8, 12, 16 (p-2, m-4, gap-6, py-8, etc.)

**Grid Structure**:
- Dashboard: 12-column responsive grid
- Main content: max-w-7xl container with px-4 md:px-6 lg:px-8
- Sidebar navigation: Fixed 16rem width on desktop, slide-over on mobile
- Cards/panels: p-6 standard, p-4 for compact variants

**Responsive Breakpoints**:
- Mobile: Base styles (single column)
- Tablet: md: (2-column layouts for team cards, match cards)
- Desktop: lg: (full dashboard with sidebar, 3-4 column grids)

---

## Component Library

### Navigation
**Primary Navigation** (Dashboard):
- Fixed left sidebar (desktop) with icon + label navigation items
- Mobile: Bottom tab bar or hamburger menu
- Sections: Dashboard, Teams, Competitions, Practice, Payments, Profile
- Admin nav: Add Competition Management, Question Bank, Analytics

**Secondary Navigation** (Tabs):
- Use for switching between views (e.g., "My Teams" / "Create Team", "Upcoming Matches" / "Past Matches")
- Underline indicator for active tab

### Data Display

**League Table**:
- Sticky header row with sortable columns
- Columns: Position, Team Name, Played, Won, Drawn, Lost, PF, PA, GD, Points
- Highlight current user's team(s) with subtle treatment
- Alternating row treatment for scannability
- Mobile: Collapse to show Position, Team, Points with expandable rows for details

**Match Card**:
- Display: Team A vs Team B, date/time, competition name
- Show match status (UPCOMING, LIVE with pulsing indicator, COMPLETED)
- For live matches: prominent "Join Match" button
- Include team logos/avatars if available
- Scores visible post-match

**Team Roster Card**:
- Grid of 5 player slots
- Empty slots show "+ Invite Player" state
- Display player avatars, names, online status (for live matches)
- Team stats: Total tokens, competitions joined, win rate

**Standings Widget**:
- Compact version for dashboard showing top 5 teams + user's team
- "View Full Table" link
- Visual indicator for playoff/promotion positions if applicable

### Forms

**Team Creation Form**:
- Single-page form: Team Name (required), optional description
- Player invitation section (email addresses, up to 5)
- Submit triggers team creation + sends invites

**Payment Form**:
- Clear breakdown: Item (Competition Registration / Practice Tokens), Price, Quantity
- Payment provider integration area (Paystack/Flutterwave)
- Confirmation screen with transaction ID and email receipt

**Question Bank Upload (Admin)**:
- Bulk CSV upload with drag-and-drop zone
- Format validation preview
- Fields: Question text, options (A-D), correct answer, subject, difficulty, mode (competition/practice)

### Interactive Components

**Real-time Match Interface**:
- Full-screen or modal overlay during active match
- Header: Timer (large, prominent), current score
- Question display: Large, centered text with clear option buttons (A/B/C/D)
- Answer feedback: Immediate visual confirmation on selection
- Progress indicator: X/20 questions completed
- Live scoreboard (minimized view): Shows all 5 team members' scores updating in real-time

**Token Balance Display**:
- Prominent card on dashboard showing current token count
- "Buy Tokens" CTA button
- Transaction history (last 5) in dropdown or expandable section

**Competition Registration**:
- Card per available competition showing:
  - Competition name, dates, registration deadline
  - Fee amount
  - "Register Team" button (disabled if already registered or deadline passed)
  - Team selector dropdown if user belongs to multiple teams

### Overlays

**Modal Patterns**:
- Team invite confirmation
- Payment confirmation screens
- Match results summary (post-match)
- Error states for insufficient tokens, payment failures

**Toasts/Notifications**:
- Top-right positioned for system feedback
- Types: Success (payment confirmed, team created), Info (match starting soon), Error (payment failed, insufficient tokens)

---

## Animations

Use sparingly and purposefully:
- Live match countdown: Subtle pulse on timer when < 10 seconds
- Score updates: Brief scale animation when points change
- Match state transitions: Fade between WAITING → LIVE → COMPLETED
- No decorative animations - focus on functional feedback

---

## Images

**Hero Image**: No traditional hero section - this is a dashboard-first application

**Image Usage**:
- Team avatars/logos: User-uploaded or default placeholder (64x64px standard, 128x128px for team pages)
- Competition banners: Optional admin-uploaded images for competition cards (16:9 aspect ratio)
- Empty states: Simple illustrations for "No upcoming matches", "Create your first team", "No practice tokens"
- Admin: Question bank preview might show subject icons (use icon library, not images)

---

## Page-Specific Layouts

### User Dashboard (Primary Landing)
- Top bar: Quick stats (tokens, upcoming matches count, current league position)
- 3-column grid (desktop): 
  - Left: League standings widget + Upcoming matches (3 cards max)
  - Center: Featured competition or active match CTA
  - Right: Teams list + Practice section
- Mobile: Stack vertically with priority order

### Admin Dashboard
- Sidebar navigation + multi-tab content area
- Tabs: Competitions, Questions, Matches, Payments, Analytics
- Heavy use of data tables with filters and search
- Bulk action toolbars above tables

### Live Match Screen
- Fullscreen immersive experience (can be exited via top-left back button)
- Top: Timer + Score bar (team total visible)
- Center: Question + answer options (large touch targets)
- Bottom: Team scoreboard (scrollable if needed), progress indicator

### Competition Page
- Header: Competition name, dates, status
- League table (full)
- Match schedule (grid view: rounds/days)
- Registered teams grid

---

## Accessibility
- All interactive elements keyboard-navigable
- Form inputs with visible labels and error states
- ARIA labels for real-time score updates (screen reader announcements)
- Focus indicators on all controls
- Color is never the only indicator (e.g., match status uses icons + text)
- Minimum touch target: 44x44px for buttons

---

## Platform-Specific Considerations

**Real-time Match**:
- WebSocket connection indicator (subtle dot showing connected/disconnected)
- Graceful handling of disconnections with reconnect UI
- Answer lock-in prevents editing once submitted
- Auto-submit on timeout with clear countdown warning

**Payment Flow**:
- Multi-step progress indicator (Select → Pay → Confirm)
- Non-member payment: Optional "I'm paying for this team" disclaimer
- Transaction history table with sortable columns (date, type, amount, status)