---
applyTo: "web/**"
---

# Archtecture

- NextJS App Router
- Drizzle as ORM and Migrations manager
- Playwright for E2E testing.

# Dev Server

Starting the dev server can be done like so.

```
npm run db:migrate
npm run dev
```

The local development server allows loging in with just a password. The password is `password` for a nomral user and the password for an admin user is `admin`.

# Testing

Always attemp to run `npm run lint` and `npm run test:e2e` after making any changes.

#  Development guidelines

- Prefer to use NextJS server components
- Prefer to use actions of API route unless specified.

# Style Guidelines

A theme guide is documented in `src/app/globals.css` always consult it when writing styling, prefer tailwind components.
