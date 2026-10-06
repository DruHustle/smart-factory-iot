"""Validate runtime wiring and launch all active backend processes as one user."""
import os
from pathlib import Path
import subprocess
import sys
from urllib.parse import urlparse, unquote

def configure():
    port = int(os.environ.get('PORT', '10000'))
    if not 1024 <= port <= 65535 or port in range(3102, 3107):
        raise ValueError('Render PORT must be unprivileged and distinct from the private service ports')
    os.environ['PORT'] = str(port)
    os.environ['INTERNAL_TELEMETRY_SINK_URL'] = f'http://127.0.0.1:{port}/api/internal/telemetry'
    os.environ['AAS_PROVISIONING_API_URL'] = 'http://127.0.0.1:3102/api/assets'
    required = ['DATABASE_URL', 'DATABASE_CA_CERT', 'REDIS_URL', 'JWT_SECRET',
                'DEVICE_DATABASE_CONNECTION', 'TELEMETRY_DATABASE_CONNECTION',
                'AAS_PROVISIONING_TOKEN', 'INGESTION_API_TOKEN', 'DASHBOARD_SERVICE_TOKEN', 'ALLOWED_ORIGIN',
                'MqttBrokerHost', 'MqttUsername', 'MqttPassword', 'MqttClientId']
    missing = [name for name in required if not os.environ.get(name)]
    if missing:
        raise ValueError('Missing runtime configuration: ' + ', '.join(missing))
    for name in ('JWT_SECRET', 'AAS_PROVISIONING_TOKEN', 'INGESTION_API_TOKEN', 'DASHBOARD_SERVICE_TOKEN'):
        if len(os.environ[name].encode()) < 32:
            raise ValueError(name + ' must contain at least 32 bytes')
    # Npgsql uses a file; Node uses the same provider CA from its environment.
    ca_path = Path('/tmp/smart-factory-aiven-ca.pem')
    ca_path.write_text(os.environ['DATABASE_CA_CERT'].replace('\\n', '\n'))
    ca_path.chmod(0o600)
    for name in ('DEVICE_DATABASE_CONNECTION', 'TELEMETRY_DATABASE_CONNECTION'):
        os.environ[name] = os.environ[name].replace('/run/secrets/aiven-ca.pem', str(ca_path))
    url = urlparse(os.environ['DATABASE_URL'])
    if url.scheme not in ('postgres', 'postgresql') or not url.hostname or not url.path.strip('/'):
        raise ValueError('DATABASE_URL must identify the dashboard PostgreSQL database')
    def quote(value):
        return '"' + str(value).replace('"', '""') + '"'
    settings = {'Host': url.hostname, 'Port': url.port or 5432, 'Database': unquote(url.path.strip('/')),
                'Username': unquote(url.username or ''), 'Password': unquote(url.password or '')}
    production = os.environ.get('DOTNET_ENVIRONMENT', 'Production') == 'Production'
    settings['SSL Mode'] = 'VerifyFull' if production else 'Disable'
    if production:
        settings['Root Certificate'] = str(ca_path)
    os.environ['DASHBOARD_DATABASE_CONNECTION'] = ';'.join(key + '=' + quote(value) for key, value in settings.items())
    # Pass connection strings through the environment, never Supervisor's quoted
    # configuration syntax (passwords may contain quotes, commas or percent signs).
    os.environ['ConnectionStrings__DefaultConnection'] = os.environ['DEVICE_DATABASE_CONNECTION']
    os.environ['PostgresConnectionString'] = os.environ['TELEMETRY_DATABASE_CONNECTION']
    os.environ['MqttUseTls'] = 'true' if os.environ.get('DOTNET_ENVIRONMENT', 'Production') == 'Production' else os.environ.get('MqttUseTls', 'false')
    os.environ['ENABLE_DEMO_ACCOUNTS'] = 'false'
    os.environ['ENABLE_DEMO_DATA'] = 'false'
    return port

def migrate_databases():
    """Apply idempotent migrations before any service begins accepting work."""
    subprocess.run(['node', 'scripts/migrate-dashboard.mjs'], cwd='/app', check=True)
    telemetry_env = {**os.environ, 'PostgresConnectionString': os.environ['TELEMETRY_DATABASE_CONNECTION']}
    subprocess.run(['dotnet', '/services/telemetry/TelemetryService.dll', '--migrate'], env=telemetry_env, check=True)
    device_env = {
        **os.environ,
        'ConnectionStrings__DefaultConnection': os.environ['DEVICE_DATABASE_CONNECTION'],
        'MIGRATION_ONLY': 'true',
        'APPLY_DATABASE_MIGRATIONS': 'true',
    }
    subprocess.run(['dotnet', '/services/device/DeviceService.dll'], env=device_env, check=True)

if __name__ == '__main__':
    try:
        configure()
        migrate_databases()
        os.execvp('supervisord', ['supervisord', '-c', '/app/deploy/render/supervisord.conf'])
    except Exception as error:
        print('Bundle startup failed: ' + str(error), file=sys.stderr)
        sys.exit(1)
