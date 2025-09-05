---
applyTo: "web/**"
---

# Archtecture

- NextJS App Router
- Drizzle as ORM and Migrations manager
- Playwright for E2E testing.
- Kind for local cluster testings it should already be configured for use, verfiy with kubectl before using it.

# Dev Server

Starting the dev server can be done like so.

```
npm run db:migrate
npm run dev
```

The local development server allows loging in with just a password. The password is `password` for a nomral user and the password for an admin user is `admin`. 

It has already been started.

# Database / Migrations

When making changes to the database schema:

1. **Edit the schema**: Modify `src/db/schema.ts` to add/modify tables, columns, etc.
2. **Generate migrations**: Run `npm run db:generate` to create migration files from schema changes
3. **Apply migrations**: Run `npm run db:migrate` to apply the migrations to the database

**Important**: Do not manually add migration files to the `drizzle/` folder or edit existing migration files. Always use `npm run db:generate` to create migrations from schema changes.

# Testing

Always run `make ci` before making your final commit. This command runs unit tests, integration tests, linting, and e2e tests to ensure comprehensive validation.

#  Development guidelines

- Prefer to use NextJS server components
- Prefer to use actions over API route unless specified.

# Style Guidelines

A theme guide is documented in `src/app/globals.css` always consult it when writing styling, prefer tailwind components.

# Screenshots

Always attempt to take a screenshot of new or modified pages.

# Spikes

When user requests a spike **ALWAYS CONSULT** the spikes/README.md
