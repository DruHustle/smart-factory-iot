# Login Troubleshooting

## Demo buttons are missing

Demo shortcuts come from the API, not frontend constants. Check that NODE_ENV is not production, ENABLE_DEMO_ACCOUNTS=true, and PostgreSQL is reachable. When the flag is false, the API hides shortcuts and rejects these demo identities even if old rows remain in PostgreSQL. Restart the API after configuration changes. For a separately hosted frontend, verify VITE_API_URL and the exact ALLOWED_ORIGIN value. Buttons are Demo Viewer, Demo Operator, Demo Engineer, and Demo Admin. The local password is password123. Production intentionally suppresses these identities.

## Login works but refresh signs out

Enable browser cookies. For separate client and API origins, serve both over HTTPS and add the exact frontend origin to ALLOWED_ORIGIN. Prefer same-origin hosting because browser third-party cookie controls can block cross-site sessions.

## Password reset

Forgot Password is a UI placeholder. No reset email or token workflow is implemented.

## Verify the system

Run pnpm check and pnpm test. Run pnpm e2e with Docker available to exercise migrations, database-backed login and authorization, the telemetry bridge, and Chromium flows using a disposable PostgreSQL container. It does not use the developer .env.local database.

See [authentication](AUTHENTICATION.md) and [deployment troubleshooting](RENDER_DEPLOYMENT.md#troubleshooting).
