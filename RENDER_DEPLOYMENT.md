# Vercel frontend and single-container Render backend

This is the canonical deployment guide for all three repositories. Production runs the React UI on Vercel and all six backend services in **one non-root Render container**. Kubernetes is unnecessary. Managed databases, messaging, Redis and the company AAS runtime are external; Pi/ESP32/ADA031 equipment stays on the OT network.

## What runs where

| Process | Bind address in the Render container | Purpose |
|---|---|---|
| Node API | `0.0.0.0:$PORT` (10000 default) | Accounts, sessions, role enforcement, assets, incidents, Assistant, dashboard queries and private telemetry ingress |
| DeviceService | `127.0.0.1:3102` | AAS provisioning/import and gateway commands |
| TelemetryService | `127.0.0.1:3103` health only | Persistent MQTT intake, PostgreSQL storage and retryable dashboard/event delivery |
| IdentityService | `127.0.0.1:3104` | Current dashboard profile/role checks; no separate account store or Entra login |
| AnalyticsService | `127.0.0.1:3105` | SQL sample coverage, gaps and null-safe metrics for selected assets |
| NotificationService | `127.0.0.1:3106` | Durable incident inbox delivery through Microsoft Graph |

Supervisor restarts failed processes and forwards shutdown signals. Public readiness verifies the dashboard database, Redis, and all five .NET services. `/health/live` remains available during dependency outages. Private APIs do not appear as public Render routes. The Node API delegates identity/analytics calls using a separate service token and the authenticated account ID; the services reload the current account from PostgreSQL.

## Local development

1. Keep the three checkouts side by side. Install Docker Compose v2, Node 22/pnpm 10.34.5, Python 3.11 and .NET 8 SDK/runtime (or run .NET checks in its SDK image).
2. Copy the dashboard and backend `.env.local.example` files to ignored `.env.local` files. Replace every placeholder. Share `JWT_SECRET`, `AAS_PROVISIONING_TOKEN`, `INGESTION_API_TOKEN`, `DASHBOARD_SERVICE_TOKEN` and the dashboard Redis password only with their intended callers. Backend database and broker passwords remain separate.
3. Set the backend `DASHBOARD_DATABASE_CONNECTION` to `Host=database;Database=smart_factory_iot;Username=smartfactory_local;Password=<dashboard database password>;SSL Mode=Disable`. Use a valid Npgsql quoted value if the password contains separators. Set the dashboard `BACKEND_DEPLOYMENT_MODE=compose` and `ALLOWED_ORIGIN=http://localhost:3000`.
4. From the dashboard repository start `docker compose --env-file .env.local --profile aas up --build -d --wait`. The dashboard database is on the shared development network. From the backend repository start `docker compose --env-file .env.local up --build -d --wait`. Open `http://localhost:3000` after both are ready. Local Compose migrations run before workers; the default simulated path uses only local services.
5. Follow the edge [workstation gateway profile](https://github.com/DruHustle/smart-factory-iot-edge/blob/master/raspberry-pi/README.md#complete-local-three-repository-test) for simulated telemetry. The physical Pi connects to its configured CloudAMQP broker, while local TelemetryService defaults to Docker RabbitMQ. For a physical Pi-to-local-dashboard check, configure the backend `TELEMETRY_MQTT_*` variables with a separate CloudAMQP read-only subscriber account before starting/recreating TelemetryService. Local ports bind to loopback and plaintext local protocols must stay off public/OT networks.

When running the Node API on the host, use `BACKEND_DEPLOYMENT_MODE=local`, the host PostgreSQL/Redis addresses and `AAS_PROVISIONING_API_URL=http://127.0.0.1:5001/api/assets`. Identity/Analytics/Notification delegation uses their documented host ports 5002/5004/5003. `standalone` disables that delegation for isolated dashboard tests.

For exact Render-image acceptance without cloud credentials, build the bundle below then run `python3 scripts/bundle-smoke.py`. Its databases, broker and Redis are disposable, its UI/API port is 3110, and its synthetic accounts are removed on exit. It deliberately does not run plant equipment or send real email. `pnpm e2e` separately tests the browser at `E2E_PORT=3100`; `pnpm e2e:system` tests real AAS/MQTT/Pi paths with simulated serial equipment and requires the local BaSyx stack.

## Build the single backend image

Run from the dashboard repository using a new output directory:

```bash
python3 scripts/prepare-backend-context.py ../smart-factory-iot-backend /tmp/factory-backend-context
# For a local test on the current architecture:
docker buildx build --load --build-context backend=/tmp/factory-backend-context -f deploy/render/Dockerfile -t smart-factory-render-review:local .
python3 scripts/bundle-smoke.py
```

The context preparer includes only source/project/migration files and excludes local settings, secrets and build artifacts. Production releases use the coordinated workflow below to build `linux/amd64`, test it, and publish that same image by digest. This is the **only production backend image**; it contains the Node API and all five .NET services.

The React frontend is a separate immutable Vercel build artifact, produced with `vercel build --prod` and uploaded with `vercel deploy --prebuilt --prod`. It is not a second Docker image: Vercel serves the static output and proxies `/api/*` to Render. Do not put database, broker, AAS, Graph or Assistant secrets in Vercel build variables.

The runtime uses the supported .NET 8 Ubuntu 24.04 base with OS security updates. Node entries are compiled during build, and the runtime install contains only the API dependency subset selected from the frozen lockfile. npm, Corepack, tsx, esbuild, Vite and drizzle-kit remain in build stages. Committed dashboard migrations run through the Drizzle ORM migrator using the same verified PostgreSQL connection as the API.

## Render service settings

Create **one paid, image-backed web service**, linked to the published GHCR bundle. Its configured image repository must match the release workflow's `ghcr.io/<owner>/smart-factory-backend`. For a private GHCR package configure Render's registry credential with package read permission. Disable Render's independent auto-deploy setting: image-backed services are released by the coordinated GitHub workflow using an exact digest.

| Setting | Value |
|---|---|
| Docker command | Leave empty; the image entrypoint starts Supervisor |
| Pre-deploy command | `python3 /app/deploy/render/migrate.py` |
| Health check path | `/health/ready` |
| Instances | One |
| Persistent disk | At least 1 GB mounted at `/var/data` |
| Runtime | Begin with enough RAM/CPU for all six processes; validate with representative load |

The disk is a **rollout safeguard**, not the application datastore: [Render disks disable overlapping deployments and multi-instance scaling](https://render.com/docs/disks). This is required for the stable persistent MQTT client ID; two simultaneously running consumers would disconnect each other. Render stops the old instance before starting the replacement, so releases cause a brief API/UI data interruption. Pi/ESP32 spool data and the MQTT session queues readings within their configured capacity. This does not imply a machine has stopped, and connectivity loss alone never starts factory downtime.

Do not enable autoscaling or remove the disk without redesigning and testing broker consumer ownership. The [pre-deploy command](https://render.com/docs/deploys) runs separately and cannot access the attached disk. All migrations persist in PostgreSQL. Application data, inboxes and delivery queues survive container replacement.

## Required runtime configuration

Set these values in Render's secret/environment settings, never in Git:

| Variables | Requirement |
|---|---|
| `DATABASE_URL`, `DATABASE_SSL_MODE=verify-full`, `DATABASE_CA_CERT` | Dashboard Aiven URL and trusted provider PEM CA, including hostname verification |
| `DEVICE_DATABASE_CONNECTION`, `TELEMETRY_DATABASE_CONNECTION` | Npgsql strings with `SSL Mode=VerifyFull;Root Certificate=/run/secrets/aiven-ca.pem` and the correct separate databases/users |
| `REDIS_URL` | Authenticated Redis Cloud `rediss://` URL |
| `JWT_SECRET`, `AAS_PROVISIONING_TOKEN`, `INGESTION_API_TOKEN`, `DASHBOARD_SERVICE_TOKEN` | Four distinct random secrets of at least 32 bytes |
| `ALLOWED_ORIGIN` | Exact production Vercel/custom UI origin; explicit trusted preview origins only if needed |
| `TRUST_PROXY` | Verified Render proxy IP/CIDR ranges or a validated fixed hop topology; test client-IP attribution before enabling production login throttling |
| `MqttBrokerHost`, `MqttBrokerPort=8883`, `MqttUsername`, `MqttPassword`, `MqttClientId` | CloudAMQP TLS credentials, scoped telemetry consumption and a stable unique client ID |
| `EDGE_SITE_ID`, `EDGE_LINE_ID` | Match the commissioned gateway command topic scope |
| AAS repository/registry/file-server URLs and OIDC client configuration | Private HTTPS company endpoints; see [AAS configuration](docs/AASX-and-Edge-Configuration.md) |

The entrypoint writes the CA to a private file under `/tmp`, configures verified Npgsql connections for the dashboard-backed services and forces demo accounts/data off. Image defaults are `NODE_ENV=production`, `DOTNET_ENVIRONMENT=Production`, `ASPNETCORE_ENVIRONMENT=Production`, `API_ONLY=true`, `BACKEND_DEPLOYMENT_MODE=render-bundle`. Do not override these in production. It assigns private loopback routes and the dynamic public `PORT`; no hard-coded external backend URL is required for telemetry forwarding.

Identity/Analytics/Notification each cap their database pool at 20 connections. Budget these pools plus Node, EF services, pre-deploy jobs and AAS against provider limits. Restrict provider ingress to approved egress addresses, use scoped database permissions, and monitor queue age/depth and spool capacity. Different read-only credentials for identity/analytics are a future hardening step: the current three services share the dashboard database connection in the bundle.

Public registration is disabled in production. Bootstrap the first admin through the private Render shell/job with temporary `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD` (12–72 UTF-8 bytes) and optional `BOOTSTRAP_ADMIN_NAME`, then run `node scripts/bootstrap-admin.mjs`. This serialized command refuses to run if an admin already exists and never prints passwords. Remove the temporary secrets afterward. Administrators create further accounts in **User access** and provide their credentials through approved private channels. Development registration creates a viewer and cannot choose its role. There is no default production password or demo admin. Keep account promotion audit records outside the application until a full account audit log is implemented.

## Microsoft Graph email

The inbox works without Graph. Enable email by configuring **all** of `GRAPH_TENANT_ID`, `GRAPH_CLIENT_ID`, `GRAPH_CLIENT_SECRET`, `GRAPH_SENDER_USER` and `GRAPH_ALLOWED_RECIPIENT_DOMAINS` (comma-separated). Partial credentials fail startup. Configure an Entra application with administrator-approved application mail permissions, restricted to the intended sender mailbox using Exchange application access controls. This is a mail integration; dashboard login still uses existing accounts.

Emails go only to current engineer/admin dashboard accounts on explicitly allowed domains. The sender is fixed server-side. Incident insertion and assignment/resolution updates enqueue inbox records in the same PostgreSQL transaction via migration 0013. The worker claims jobs with a lease, retries up to eight failed attempts with bounded backoff, and retains failed requests. Authorized owners can retry eligible requests after configuration is corrected. Unconfigured or unauthorized recipients are displayed explicitly.

Graph `202` is recorded as **accepted**, and never as confirmed mailbox delivery, according to [Microsoft's sendMail contract](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0). Email delivery is at least once: a process/database failure after Graph accepts a request can result in a duplicate email. The application notification ID is included in a custom header for correlation. Validate sender restrictions, throttling and a controlled test mailbox in staging before enabling factory notifications.

## Vercel settings

Set the project's Install Command to `pnpm install --frozen-lockfile`, Build Command to `pnpm build`, Output Directory to `dist/public`, and the build variable `VITE_API_URL=/api`. Vercel hosts the static React app only.

Before Vercel reads deployment configuration, run `RENDER_API_ORIGIN=https://<render-service>.onrender.com pnpm vercel:configure`. This replaces the deliberate `.invalid` placeholder in `vercel.json` with the actual HTTPS Render origin. `/api/*` is an external rewrite; SPA routes fall back to `/index.html`. API responses are private/non-cacheable. The browser uses first-party HttpOnly session cookies through the Vercel proxy and never receives service tokens. [External rewrites](https://vercel.com/docs/routing/rewrites) support this proxy; their [120-second timeout](https://vercel.com/docs/limits) also applies to large AASX imports. Test representative uploads through Vercel, not just directly against Render. The UI uses HTTP polling; it does not require Vercel WebSocket hosting.

Disable Vercel's independent Git production deployment for this project. The coordinated workflow configures the Render rewrite, runs `vercel pull`, builds the production artifact, and deploys that exact prebuilt artifact with pinned CLI 62.2.0 only after Render is live and ready. Keeping Vercel's built-in Git deployment enabled would create a second, unordered production path. Verify login, cookie forwarding, logout, multi-user IP attribution and protected mutations on the actual UI custom domain.

## CI/CD and rollback

Each repository has pinned-action quality CI. The dashboard's `.github/workflows/release.yml` is the only production release path. A push to the dashboard repository's protected `main` branch starts the coordinated production release automatically. It resolves the current backend `main` and edge `master` heads to immutable 40-character SHAs, checks out all three revisions, runs dashboard/browser, .NET and gateway tests, compiles ESP32 firmware, validates documentation and deployment configuration, builds the single Linux backend image and runs its acceptance checks. No firmware is flashed by CI.

`workflow_dispatch` remains available for a controlled rerun or rollback. Leave its optional companion SHA fields empty to use backend `main` and edge `master`, or provide full lowercase 40-character backend and edge SHAs. Protect the dashboard/backend `main` branches and the edge `master` branch, require pull-request review and required quality checks, and restrict the GitHub `production` environment so a direct unreviewed push cannot bypass organizational approval policy.

Backend CI and the coordinated release audit all direct/transitive NuGet dependencies and fail on high/critical findings or unavailable audit data. The release scans the exact runtime image with checksum-verified Trivy 0.75.0 before publication. `python3 scripts/audit-container.py` repeats this locally on Linux x86_64 or macOS arm64. This standalone scan disables telemetry, restricts image access to the local Docker daemon and downloads only public vulnerability data; it does not upload source, images or results. High/critical findings, including unfixed ones, fail the gate. The workflow retains the JSON scan evidence; no vulnerabilities are ignored.

Edge CI and the coordinated release also audit the full pinned gateway dependency tree with pip-audit 2.10.1 and `--strict`; known vulnerabilities or incomplete dependency collection fail the gate. The firmware compile uses pinned platform/libraries. These application checks do not scan the installed Pi OS or certify ESP32/vendor firmware security.

The release job downloads and publishes the exact tested image, writes a three-repository source/digest manifest, deploys Render through its API and waits for that specific deployment to become live and ready. Only then does it build and deploy the matching Vercel UI artifact. Missing configuration fails the workflow; it cannot silently report a skipped deployment as success. Production releases are serialized and are not canceled mid-deploy.

GitHub `production` environment secrets: `RENDER_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`. Environment variables: `RENDER_SERVICE_ID`, `RENDER_API_ORIGIN`. If companion repositories are private, add `REPOSITORY_READ_TOKEN` as a repository- or organization-level Actions secret because the verification job reads it before entering the `production` environment; scope it to read only the two companion repositories. `GITHUB_TOKEN` publishes GHCR with package-write permission only in the release job. Runtime database, broker, Graph and Assistant secrets remain exclusively in Render. Configure these values before the first push-triggered release; missing values intentionally fail the release rather than silently skipping a provider.

The pre-deploy task runs committed Drizzle migrations, idempotent telemetry SQL under an advisory lock, and DeviceService EF migrations. It never generates schema changes or seeds demo accounts. Migration 0013 does not email historical incidents. Migration 0014 enforces case-insensitive unique account emails; review and reconcile any pre-existing duplicates before migration rather than merging identities automatically. Take verified backups before applying migrations to an existing production database, and test migration compatibility on a restored copy.

Rollback is a reviewed release of the previous recorded image digest followed by the previous Vercel deployment. Never force-push source branches, automatically reverse schema migrations, or assume deployment rollback undoes schema/data changes. Keep additive migrations compatible with the prior API until rollout is accepted. Restore databases only through the documented provider recovery process and a tested recovery objective. Old Kubernetes, Cloudflare and ACR configurations are historical references, not parallel production release paths.

## Acceptance before plant use

See the [review evidence and remaining release gates](docs/production-readiness-review.md). Live managed-provider TLS/ACLs, Graph mailbox delivery, Vercel proxy behavior, load/capacity, backup restoration, OT commissioning and hardware movement require deployment-specific evidence. Automated OTA remains unavailable in this release; bench firmware flashing and manual Pi deployment are documented in the edge guides. Do not advertise OTA as completed based on a dashboard database record.
