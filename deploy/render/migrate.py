"""Render pre-deploy task: fail on any migration; never seed demo identities."""
import os
import subprocess
from entrypoint import configure

configure()
subprocess.run(['node', 'scripts/migrate-dashboard.mjs'], cwd='/app', check=True)
telemetry_env = {**os.environ, 'PostgresConnectionString': os.environ['TELEMETRY_DATABASE_CONNECTION']}
subprocess.run(['dotnet', '/services/telemetry/TelemetryService.dll', '--migrate'], env=telemetry_env, check=True)
device_env = {**os.environ, 'ConnectionStrings__DefaultConnection': os.environ['DEVICE_DATABASE_CONNECTION'], 'MIGRATION_ONLY': 'true', 'APPLY_DATABASE_MIGRATIONS': 'true'}
subprocess.run(['dotnet', '/services/device/DeviceService.dll'], env=device_env, check=True)
