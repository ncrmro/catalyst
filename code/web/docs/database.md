# Database Setup

This project uses [Drizzle ORM](https://orm.drizzle.team/) with PostgreSQL.

## Quick Start

1. **Start the database**:

   ```bash
   docker-compose up -d db
   ```

2. **Copy environment variables**:

   ```bash
   cp .env.example .env.local
   ```

3. **Run migrations**:
   ```bash
   npm run db:migrate
   ```

## Available Commands

- `npm run db:generate` - Generate migration files from schema changes
- `npm run db:migrate` - Apply migrations to the database
- `npm run db:push` - Push schema changes directly (development only)
- `npm run db:studio` - Open Drizzle Studio for database inspection

## Database Schema

The current schema includes:

- **users** - User accounts from GitHub OAuth
- **repositories** - GitHub repositories

## Environment Variables

Required environment variables (add to `.env.local`):

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/catalyst
```

## Development

The database runs in Docker with PostgreSQL 17 Alpine. Data is persisted in a named volume `postgres_data`.

To reset the database:

```bash
docker-compose down -v
docker-compose up -d db
npm run db:migrate
```
