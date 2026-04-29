# ⚒ Forge — University Project Showcase Platform

A web platform for university students to submit, discover, and build on top of each other's projects — permanently, with full credit.

Built as part of the BCA CTIS curriculum at **ITM University Raipur**, guided by **Mr. Amar Sinha** (Assistant Professor).

---

## What is Forge?

At most universities, student projects disappear after the semester ends. Forge fixes that.

Students submit their projects with full documentation. Those projects stay visible permanently. Future students can discover them, get inspired, and even build on top of previous work — with credit given to the original creators through a "Build-on" system.

---

## Features

- **Projects** — Submit projects with title, description, thumbnail, repo link, live demo, tags, and team members
- **Build-ons** — Link your project as a continuation of a previous student's work, forming a project lineage tree
- **Teams** — Create teams, invite members by username, manage workspaces
- **Assignments** — Upload and share academic assignments publicly or keep them private
- **Stars & Saves** — Star projects you love, save ones you want to revisit
- **Reports** — Report inappropriate content
- **Admin Panel** — Approve/reject submitted content
- **Profile** — Avatar, bio, roll number, graduation year, saved projects
- **Authentication** — Secure signup/login with session persistence

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, TypeScript) |
| Styling | Tailwind CSS v4 + CSS Variables |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Font | Geist (Google Fonts) |

---

## Design

Dark theme inspired by Replit. Accent color: **Amber (`#f59e0b`)**. All colors via CSS variables for consistent theming.

---

## Project Structure

```
forge/
├── app/
│   ├── (auth)/          # Login, Signup pages
│   ├── (main)/          # Main app — Projects, Teams, Assignments, Profile
│   └── admin/           # Admin panel
├── components/
│   ├── layout/          # Sidebar
│   ├── projects/        # ProjectCard, ProjectActions, BuildOnSelector
│   └── ui/              # Toast
├── lib/
│   ├── supabase/        # Client, server, middleware helpers
│   └── types/           # TypeScript type definitions
└── public/              # Static assets
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)

### Setup

1. Clone the repository
   ```bash
   git clone https://github.com/ImForge/Itm-showcase-forge-.git
   cd Itm-showcase-forge-
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the root with your Supabase credentials
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

---

## Database

Built on Supabase PostgreSQL with the following tables:

`profiles` · `projects` · `tags` · `project_tags` · `project_members` · `build_ons` · `teams` · `team_members` · `team_invitations` · `assignments` · `stars` · `saves` · `reports`

Full Row Level Security (RLS) policies on all tables.

---

## Roadmap

- [x] Auth (signup, login, session)
- [x] Projects (submit, browse, detail, edit)
- [x] Teams (create, invite, workspace)
- [x] Assignments (upload, public/private)
- [x] Stars, Saves, Reports
- [x] Profile & Settings
- [x] Admin panel
- [ ] Mobile responsiveness
- [ ] Markdown rendering for project descriptions
- [x] Global search (Cmd+K)
- [ ] Email notifications
- [ ] GitHub auto-import
- [ ] Build-on graph visualization

---

## Academic Context

**Student:** Shivam Tiwari
**Course:** BCA CTIS, 2nd Semester
**University:** ITM University Raipur
**Guide:** Mr. Amar Sinha, Assistant Professor
