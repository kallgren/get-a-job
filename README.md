# Get a Job

A modern job application tracking system built with Next.js, designed to help you manage your job search effectively.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Clerk
- **Styling:** Tailwind CSS v4 + shadcn/ui (CSS variables)
- **Theme:** next-themes (dark mode support)
- **Testing:** Vitest + Playwright
- **File Storage:** Uploadthing (TODO)
- **Container:** Docker (PostgreSQL)
- **Drag and drop:** dnd-kit

## Features

- Track job applications through different stages (Wishlist → Applied → Interview → Offer → Accepted/Rejected)
- Kanban board and table views
- Dark mode support with system preference detection
- File uploads for resumes and cover letters
- Application history tracking
- Personal notes for each application

## Getting Started

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- npm

### Installation

1. Clone the repository and install dependencies:

```bash
npm install
```

2. Set up environment variables:

```bash
cp .env.example .env.local
```

Then edit `.env.local` and add your:

- Clerk API keys (from https://clerk.com)
- Uploadthing token (from https://uploadthing.com)

3. Start PostgreSQL with Docker:

```bash
docker compose up -d
```

4. Set up the database:

```bash
npm run db:push
npm run db:generate
```

5. Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see your app.

## Available Scripts

### Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server

### Code Quality

- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting

### Testing

- `npm test` - Run unit/integration tests (Vitest)
- `npm run test:ui` - Run tests with UI
- `npm run test:coverage` - Generate test coverage report
- `npm run test:e2e` - Run E2E tests (Playwright)
- `npm run test:e2e:ui` - Run E2E tests with UI

#### E2E Test Setup

E2E tests require a test user in Clerk and specific environment variables:

1. **Create a test user in Clerk Dashboard:**
   - Go to https://dashboard.clerk.com
   - Navigate to Users → Create User
   - Enable "Email address" and "Password" authentication
   - Create a user with email ending in `+clerk_test` (e.g., `yourname+clerk_test@example.com`)
   - Copy the User ID (starts with `user_`)

2. **Add to `.env.local`:**
   ```bash
   TEST_USER_EMAIL=yourname+clerk_test@example.com
   TEST_USER_PASSWORD=your_test_password
   TEST_USER_ID=user_xxxxxxxxxxxxxxxxxxxxx
   ```

3. **Run tests:**
   ```bash
   npm run test:e2e
   ```

**How it works:**
- First run: Playwright authenticates once and saves session to `playwright/.auth/user.json`
- Subsequent runs: Tests reuse saved auth state (much faster!)
- Each test: Database is cleaned before running to ensure isolation

**Troubleshooting:**
- If tests fail with auth errors, delete `playwright/.auth/user.json` and re-run
- Auth state expires after some time - regenerate by re-running tests
- Tests automatically run setup before chromium tests (no manual setup needed)

### Database

- `npm run db:generate` - Generate Prisma client
- `npm run db:push` - Push schema changes to database
- `npm run db:migrate` - Create and run migrations
- `npm run db:studio` - Open Prisma Studio (database GUI)

## Project Structure

```
├── app/                # Next.js App Router pages
├── components/         # React components
│   └── ui/            # shadcn/ui components
├── lib/               # Utility functions and configs
│   └── prisma.ts      # Prisma client singleton
│   └── queries/       # Data access layer (database operations)
├── prisma/            # Database schema and migrations
│   └── schema.prisma  # Database models
├── e2e/               # End-to-end tests
├── public/            # Static assets
└── docker-compose.yml # PostgreSQL configuration
```

## Database Schema

### Job

- **ID:** Integer (autoincrement)
- **Core fields:** Company (required), title (optional), location
- **Application:** Job posting URL, job posting text, date applied
- **Status:** Enum (WISHLIST → APPLIED → INTERVIEW → OFFER → ACCEPTED/REJECTED)
- **Files:** Resume & cover letter URLs (Uploadthing)
- **Notes:** Personal notes field, contact person
- **Soft delete:** deletedAt timestamp (deleted jobs remain in database)
- **Ordering:** Order field for drag-drop positioning (future feature)
- **Timestamps:** createdAt, updatedAt
- **Multi-tenancy:** userId field

### JobHistory

- **ID:** Integer (autoincrement)
- **Tracking:** jobId (foreign key), fieldChanged, oldValue, newValue
- **Timestamp:** changedAt
- **Cascade delete:** Removed when parent Job is hard-deleted

## Development Workflow

1. Start Docker: `docker compose up -d`
2. Run dev server: `npm run dev`
3. Make changes
4. Run tests: `npm test`
5. Format code: `npm run format`
6. Commit changes

## License

MIT
