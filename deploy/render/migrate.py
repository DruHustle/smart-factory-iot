"""Optional Render pre-deploy task; startup also migrates on free-tier services."""
from entrypoint import configure, migrate_databases

_, role = configure()
migrate_databases(role)
