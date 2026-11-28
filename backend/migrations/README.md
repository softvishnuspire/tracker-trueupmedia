# Database migrations (source of truth)

`schema.sql` in the backend root is a **non-runnable reference export** (enum
columns show as `USER-DEFINED`, foreign keys are out of order, some columns are
missing). Do not run it. To build a database from scratch, apply the files below
**in order** against the target Postgres/Supabase database.

## Apply order

1. `../local_init.sql` — base schema: extensions, enums, all tables, indexes.
2. The feature migrations, oldest first (already reflected in `local_init.sql`,
   but kept for history):
   - `add_batch_type.sql`
   - `add_writer_employee.sql`
   - `add_freelancer_fields.sql`
   - `add_emergency_columns.sql`
   - `create_freelancer_tasks.sql`
   - `add_notification_rls.sql`
   - `001_add_performance_indexes.sql`
3. `100_production_hardening.sql` — **required for production**: enables Row
   Level Security on every table (blocks anonymous access, allows authenticated
   users, backend uses the service-role key which bypasses RLS), drops the
   `exec_sql`/`run_sql` helper functions, and clears plaintext passwords.

4. `101_fix_user_role_enum.sql` — adds the role names the app writes
   (`GM`, `TEAM LEAD`, `POSTING TEAM`, `PRODUCTION HEAD`, `CONTENT HEAD`, …).
   Without it "Add Team Member" fails for most roles.
5. `102_add_missing_columns.sql` — `reschedule_history` (content_items,
   freelancer_tasks), `original_scheduled_datetime` (freelancer_tasks) and
   POC-note edit history columns. Without it rescheduling and editing POC notes fail.

`local_init.sql` already contains the cumulative schema (including 101/102),
so a fresh setup only needs step 1 then step 3. An existing database that was
built before these were added needs 101 and 102 applied.

## Applying with psql

```
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f local_init.sql
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f migrations/100_production_hardening.sql
```

`DATABASE_URL` is the project's **Session pooler** connection string
(Supabase dashboard → Connect → Session pooler), with the database password.

## Security notes

- Passwords are owned by Supabase Auth (`auth.users`). `public.users.password_hash`
  is no longer required or read for login; the backend only ever stores a bcrypt
  hash there, never plaintext.
- RLS policies are permissive for authenticated users (full access to
  operational tables, own-row read for `users`) because the frontend and mobile
  app query these tables directly with the signed-in user's session. Per-role
  row restrictions are still enforced by the backend API, not by RLS. Tightening
  RLS to per-role policies is a future hardening step.
