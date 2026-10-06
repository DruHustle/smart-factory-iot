# System diagrams

Maintained diagrams live with their explanations in the canonical guides:

- [Architecture](docs/architecture.md): Vercel UI, the six-service Render container, external managed services and factory edge boundaries.
- [API flows](docs/api-flows.md): authentication, asset provisioning/import, telemetry, incidents, notifications and commissioned control.
- [Database schema](docs/database-schema.md): persisted entities, telemetry attribution and durable inbox relationships.

Use the [local and Vercel/Render deployment guide](RENDER_DEPLOYMENT.md) for setup, migrations, coordinated CI/CD, sequential rollout and rollback. Kubernetes manifests are retained historical references outside the supported production release.
