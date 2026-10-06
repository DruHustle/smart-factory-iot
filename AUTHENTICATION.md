# Authentication and Authorization

The Node API verifies bcrypt password hashes and issues an eight-hour HS256 JWT in an HttpOnly cookie. Browser JavaScript cannot read the token; it is not stored in localStorage or sessionStorage. Protected requests reload the user's current database role. Unsafe requests with an Origin header must match the request origin or an exact ALLOWED_ORIGIN value. Dashboard login currently uses this local account flow; `AAS_OIDC_*` credentials authenticate backend services to the AAS repository and do not provide Entra user SSO.

| Role | Permissions |
|---|---|
| Viewer | Read dashboard, device/asset summaries, alerts, analytics, and telemetry |
| Operator | Viewer permissions plus operational readings and alert acknowledgement |
| Engineer | Operator permissions plus alert assignment/downtime resolution, asset/device registration, AAS details, lifecycle, mappings, thresholds, and read-only firmware inventory/history. OTA delivery is disabled until a verified updater is integrated. |
| Admin | Engineer permissions plus user and administrative device management |

Development registration creates viewers. Production public registration is disabled. Administrators create accounts and assign roles through User access; the first admin is created through the private bootstrap task in the deployment guide. UI visibility is not an authorization check; server procedures enforce policy.

New passwords require at least 12 characters and cannot exceed bcrypt's 72-byte UTF-8 limit. Login attempts are rate-limited per client IP and email using PostgreSQL. Verify trusted proxy attribution through Vercel/Render and enforce an ingress/WAF limit as well.

## Development demo accounts

Set ENABLE_DEMO_ACCOUNTS=true only in non-production. The API provides Demo Viewer (demo@dev.local), Demo Operator (operator@dev.local), Demo Engineer (tech@dev.local), and Demo Admin (admin@dev.local). The local-only password is password123. When the flag is false, the UI shortcuts disappear and the API rejects reserved demo identities even if older database rows remain. Production suppresses and rejects demo identities regardless of the flag.

Login attempt limits are stored as hashed identifiers in PostgreSQL and are shared between app replicas. Set an ingress/WAF rate limit as well. Leave `TRUST_PROXY` unset unless the service is behind a reverse proxy; then trust only that proxy's known IP/CIDR range or a fixed hop count.

ENABLE_DEMO_DATA separately seeds visibly simulated PostgreSQL assets. Password reset remains a UI placeholder; an email recovery flow is not implemented. Production requires TLS, a random JWT_SECRET of at least 32 bytes, exact allowed origins, and managed secrets for database, telemetry, and AAS credentials. See [deployment](RENDER_DEPLOYMENT.md), [login troubleshooting](LOGIN_TROUBLESHOOTING.md), and [the Entra AAS service credential guide](docs/authorization-and-aas.md#entra-id-for-aas-service-credentials).
