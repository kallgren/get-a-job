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

- **AI-Powered Job Extraction:** Paste any job listing URL (cmd+v/ctrl+v) directly on the board to automatically extract company, title, location, and job description using Claude AI
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
- Claude API key (from https://console.anthropic.com) - required for AI job extraction
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
- `npm run deploy:migrate` - Run migrations in production (manual)

### Validation

- `npm run type-check` - TypeScript type checking
- `npm run validate` - Run all checks (type-check, lint, tests, E2E)

## Deployment

This app is deployed using GitHub Actions for CI/CD and Vercel for hosting.

### Prerequisites

- [Vercel](https://vercel.com) account (free Hobby tier)
- [Neon](https://neon.tech) account for PostgreSQL (free tier)
- [Clerk](https://clerk.com) production instance
- GitHub repository

### Initial Setup

#### 1. Database (Neon PostgreSQL)

1. Sign up at https://neon.tech
2. Create a new project (e.g., "get-a-job-production")
3. Copy the **pooled connection string** (important: use pooled, not direct)
4. Save for later use in Vercel environment variables

#### 2. Authentication (Clerk)

1. Create a **production instance** in [Clerk Dashboard](https://dashboard.clerk.com) (separate from development)
2. Enable "Email address" and "Password" authentication
3. Copy production API keys:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (starts with `pk_live_`)
   - `CLERK_SECRET_KEY` (starts with `sk_live_`)
4. Configure allowed domains (see note below):
   - Add wildcard: `https://*.vercel.app`
   - After first deployment, add specific URL: `https://get-a-job.vercel.app` (or whatever Vercel assigns)
5. Create a test user for CI/CD:
   - Email format: `your-email+clerk_test@example.com`
   - Set a password
   - Copy the User ID (starts with `user_`)

**Note on Vercel URL:** You won't know your exact production URL until after deploying to Vercel. Two options:
- **Option A (Recommended):** Start Vercel setup (step 4 below) to preview the URL before deploying, then configure Clerk
- **Option B (Easier):** Use wildcard `https://*.vercel.app` initially, deploy to Vercel, then add the specific production URL to Clerk afterward

#### 3. GitHub Secrets

Add these secrets in GitHub → Settings → Secrets and variables → Actions:

```
CLERK_PUBLISHABLE_KEY_TEST=pk_live_... (production Clerk public key)
CLERK_SECRET_KEY_TEST=sk_live_... (production Clerk secret key)
TEST_USER_EMAIL=your-email+clerk_test@example.com
TEST_USER_PASSWORD=your-test-password
TEST_USER_ID=user_xxxxxxxxxxxxxxxxxxxxx
```

#### 4. Vercel

1. Go to https://vercel.com and sign in with GitHub
2. Click "New Project" and import your GitHub repository
3. Framework Preset: Next.js (auto-detected)
4. Add environment variables for **Production**:
   ```
   DATABASE_URL=postgresql://... (Neon pooled connection string)
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
   CLERK_SECRET_KEY=sk_live_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
   NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/
   ```
5. Set Production Branch: `main`
6. Deploy

#### 5. Initial Database Migration

After first Vercel deployment, run the migration on your production database:

```bash
# Get your Neon connection string from Neon Dashboard
# Then run migration (replace <your-neon-url> with actual pooled connection string)
DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require" npm run deploy:migrate
```

**Important:** Use your **pooled connection string** from Neon (not the direct connection string).

### Continuous Deployment

**Workflow:**
1. Create feature branch and make changes
2. Run `npm run validate` locally
3. Commit and push to GitHub
4. Create Pull Request
5. GitHub Actions runs all checks (type check, lint, tests, E2E)
6. Vercel creates preview deployment
7. After checks pass, merge to `main`
8. Vercel automatically deploys to production

**CI/CD Pipeline:**
- Type checking with TypeScript
- ESLint code quality checks
- Unit tests (Vitest)
- E2E tests (Playwright with PostgreSQL service)
- Automated on every PR and main branch push

### Manual Deployment

If needed, you can deploy manually using Vercel CLI:

```bash
# Deploy to production
vercel --prod

# Run migration after deploy (if schema changed)
DATABASE_URL="<your-neon-url>" npm run deploy:migrate
```

### Troubleshooting

**Build fails on Vercel:**
- Check environment variables are set correctly
- Verify `npm run build` works locally with production env vars
- Check Vercel logs in Dashboard → Deployments → [deployment] → Building

**E2E tests fail in GitHub Actions:**
- Verify all 5 GitHub Secrets are set correctly
- Ensure test user exists in Clerk production instance
- Check test user ID matches Clerk Dashboard

**Authentication fails in production:**
- Verify Clerk allowed domains include your Vercel domain
- Ensure environment variables use production Clerk keys (`pk_live_*`, not `pk_test_*`)
- Add wildcard domain for previews: `https://*.vercel.app`

**Database connection errors:**
- Use Neon's **pooled connection string** (not direct)
- Ensure connection string includes `?sslmode=require`
- Check Neon project is active (free tier auto-suspends after inactivity)

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
