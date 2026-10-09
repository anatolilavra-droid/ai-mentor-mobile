# Supabase

Database schema, Row Level Security and setup notes for AI Mentor Mobile.
Everything here can be done from the Supabase dashboard in a phone browser.

## 1. Create the project

- Region: **Frankfurt (eu-central-1)** — closest to Kyiv, data stays in the EU.
- Save the database password in a password manager. It is never needed by the app.

## 2. Auth settings

Authentication → Providers → **Email**: enabled.

Authentication → Settings (or Policies → Password):

- Minimum password length: **8**.
- **Confirm email**: keep it **off** while testing. The built-in email service sends only
  a few emails per hour, and the confirmation link has no page to land on yet.
  - On: new users must tap the link in the confirmation email before they can sign in.
    The app shows "Check your email" after sign up.
  - Off: users are signed in right after sign up (convenient while developing).

Authentication → URL Configuration → **Redirect URLs**, add:

```
aimentor://**
exp://**
```

`aimentor://` is the app scheme (APK). `exp://` is Expo Go.

## 3. Password reset email

The app resets passwords with a 6-digit code typed into the app, so no deep link is
needed. Authentication → Email Templates → **Reset Password**: make sure the body
contains the code, for example:

```html
<h2>Reset your password</h2>
<p>Enter this code in AI Mentor:</p>
<p style="font-size: 24px; letter-spacing: 4px;"><strong>{{ .Token }}</strong></p>
<p>If you did not ask to reset your password, ignore this email.</p>
```

The built-in Supabase email service sends only a few emails per hour. That is fine
for development; configure custom SMTP before a public release.

## 4. Apply the migrations

SQL Editor → New query → paste each file from `migrations/` in name order → Run.
Each file should end with `Success`.

| File                                            | What it does                                                                             |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `20261010000000_create_profiles.sql`            | `profiles` table, sign-up trigger, `updated_at` trigger, RLS policies, column privileges |
| `20261010010000_backfill_existing_profiles.sql` | creates profiles for accounts registered before the table existed; safe to run again     |

If you signed up in the app before applying the first migration, the second one
creates your missing profile. Without it the app shows "Your profile could not load".

### Working from a phone

The SQL files are meant to be copied from a phone browser:

1. Open the file on GitHub, tap **Raw**, then select all and copy.
2. In Supabase, turn on **Desktop site** in the browser menu; the SQL Editor is easier to use.
3. Clear the editor completely before pasting.

Known pitfalls:

- **Lost comment dashes.** Some mobile browsers drop `--` when copying, which turns a
  comment into broken SQL (`syntax error at or near "Phase"`). The files use `/* … */`
  comments for this reason. If you write your own SQL on a phone, avoid `--` comments.
- **Extra closing bracket.** The editor may add a `)` at the end of the pasted text
  (`syntax error at or near ")"` on the last line). Delete the stray bracket and run again.
- A failed run applies nothing, so it is safe to fix the text and run it again.

## 5. Check Row Level Security

SQL Editor → paste `tests/rls_profiles.sql` → Run.
Expected result: `RLS profiles: all checks passed`. The script rolls back, so it leaves no data.

Quick check without the full test:

```sql
select
  (select count(*) from pg_policies where tablename = 'profiles') as policies,
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass) as rls_on;
```

Expected: `policies = 2`, `rls_on = true`.

## 6. Keys for the app

Project Settings → API (or API Keys):

| Value                                                     | Where it goes                          |
| --------------------------------------------------------- | -------------------------------------- |
| Project URL                                               | `EXPO_PUBLIC_SUPABASE_URL`             |
| Publishable key (`sb_publishable_…`) or legacy `anon` key | `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` |

Both values are public by design: data is protected by RLS.
**Never** put the `service_role` / secret key in the app, in `.env` files, or in GitHub.
