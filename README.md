# Job Tracker

A modern job application tracking system built with Next.js, designed to help you manage your job search effectively.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL with Prisma ORM
- **Authentication:** Clerk
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Testing:** Vitest + Playwright
- **File Storage:** Uploadthing
- **Container:** Docker (PostgreSQL)

## Features

- Track job applications through different stages (Wishlist → Applied → Interview → Offer → Accepted/Rejected)
- Kanban board and table views
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
├── prisma/            # Database schema and migrations
│   └── schema.prisma  # Database models
├── e2e/               # End-to-end tests
├── public/            # Static assets
└── docker-compose.yml # PostgreSQL configuration
```

## Database Schema

### Job

- Company name, job title, location
- Application URL and job posting
- Status tracking
- Resume & cover letter uploads
- Personal notes
- Timestamps

### JobHistory

- Automatic audit trail for status changes
- Field change tracking

## Development Workflow

1. Start Docker: `docker compose up -d`
2. Run dev server: `npm run dev`
3. Make changes
4. Run tests: `npm test`
5. Format code: `npm run format`
6. Commit changes

## License

MIT
