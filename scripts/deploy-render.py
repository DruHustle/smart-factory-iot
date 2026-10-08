"""Atomically deploy the reviewed digest to Render, rolling back both services on failure."""
import json, os, re, time, urllib.request, urllib.error

def main():
    required = ['RENDER_API_KEY', 'RENDER_WEB_SERVICE_ID', 'RENDER_WORKER_SERVICE_ID', 'RENDER_WEB_API_ORIGIN', 'RELEASE_IMAGE']
    if any(not os.environ.get(key) for key in required):
        raise ValueError('Missing Render release configuration')
    image = os.environ['RELEASE_IMAGE']
    if not re.fullmatch(r'ghcr.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}', image): raise ValueError('Release image must be pinned by digest')
    origin = os.environ['RENDER_WEB_API_ORIGIN'].rstrip('/')
    if not re.fullmatch(r'https://[a-zA-Z0-9.-]+(?::443)?', origin): raise ValueError('Render origin must use HTTPS')
    def api(url, body=None):
        for attempt in range(5):
            request = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None,
              headers={
                  'Accept': 'application/json',
                  'Authorization': 'Bearer ' + os.environ['RENDER_API_KEY'],
                  'Content-Type': 'application/json',
              })
            try:
                with urllib.request.urlopen(request, timeout=30) as response: return json.load(response)
            except urllib.error.HTTPError as error:
                detail = error.read(4096).decode('utf-8', errors='replace').strip()
                try:
                    payload = json.loads(detail)
                    detail = payload.get('message') or payload.get('error') or detail
                except (json.JSONDecodeError, AttributeError):
                    pass
                if error.code not in (429, 500, 502, 503, 504) or attempt == 4:
                    suffix = ': ' + str(detail).replace('\r', ' ').replace('\n', ' ') if detail else ''
                    raise RuntimeError('Render API HTTP ' + str(error.code) + suffix) from None
            except Exception as error:
                if attempt == 4: raise RuntimeError('Render API request failed: ' + type(error).__name__) from None
            time.sleep(2 ** attempt)
    def service_endpoint(service):
        if not re.fullmatch(r'srv-[a-z0-9]+', service): raise ValueError('Invalid Render service ID')
        return 'https://api.render.com/v1/services/' + service
    def current_live_deploy(service, label):
        listing = api(service_endpoint(service) + '/deploys?limit=20')
        for item in listing:
            deploy = item.get('deploy', item)
            identifier = str(deploy.get('id', ''))
            if deploy.get('status') == 'live' and re.fullmatch(r'dep-[a-z0-9]+', identifier):
                print('Recorded current live ' + label + ' deploy: ' + identifier, flush=True)
                return identifier
        raise RuntimeError('No live ' + label + ' deploy is available as a rollback target')
    def await_readiness(readiness_origin, label):
        deadline = time.monotonic() + 300
        last_detail = 'no response'
        while time.monotonic() < deadline:
            try:
                with urllib.request.urlopen(readiness_origin + '/health/ready', timeout=20) as response:
                    body = response.read(4096).decode('utf-8', errors='replace').strip()
                    if response.status == 200:
                        print('Render ' + label + ' readiness check passed.', flush=True)
                        return
                    last_detail = 'HTTP ' + str(response.status) + (': ' + body if body else '')
            except urllib.error.HTTPError as error:
                body = error.read(4096).decode('utf-8', errors='replace').strip()
                last_detail = 'HTTP ' + str(error.code) + (': ' + body if body else '')
            except Exception as error:
                last_detail = type(error).__name__
            print('Render ' + label + ' is live but not ready yet: ' + last_detail, flush=True)
            time.sleep(10)
        raise RuntimeError('Render ' + label + ' readiness did not recover within 5 minutes: ' + last_detail)
    def await_deploy(service, identifier, label, readiness_origin=None):
        endpoint = service_endpoint(service) + '/deploys'
        deadline = time.monotonic() + 1800
        previous = None
        while time.monotonic() < deadline:
            status = api(endpoint + '/' + identifier).get('status')
            if status != previous: print('Render ' + label + ' deployment status: ' + str(status), flush=True); previous = status
            if status == 'live':
                if readiness_origin:
                    await_readiness(readiness_origin, label)
                print(label.capitalize() + ' deploy is live.', flush=True)
                return
            if status in ('build_failed', 'update_failed', 'pre_deploy_failed', 'canceled', 'deactivated'):
                raise RuntimeError('Render ' + label + ' release failed: ' + status)
            time.sleep(10)
        raise TimeoutError('Render ' + label + ' release did not become live within 30 minutes')
    def trigger_service(service):
        deploy = api(service_endpoint(service) + '/deploys', {'imageUrl': image})
        identifier = deploy.get('id')
        if not identifier or not re.fullmatch(r'dep-[a-z0-9]+', identifier): raise RuntimeError('Render did not return a deploy ID')
        return identifier
    def rollback_service(service, deploy_id, label, readiness_origin=None):
        print('Rolling back ' + label + ' to ' + deploy_id + '.', flush=True)
        rollback = api(service_endpoint(service) + '/rollback', {'deployId': deploy_id})
        identifier = rollback.get('id')
        if not identifier or not re.fullmatch(r'dep-[a-z0-9]+', identifier):
            raise RuntimeError('Render did not return a rollback deploy ID for ' + label)
        await_deploy(service, identifier, label + ' rollback', readiness_origin)

    # Start the durable consumer first; ingestion IDs make the short migration
    # overlap idempotent. Then replace the legacy all-in-one service with web-only.
    worker_service = os.environ['RENDER_WORKER_SERVICE_ID']
    web_service = os.environ['RENDER_WEB_SERVICE_ID']
    rollback_targets = {
        'worker': current_live_deploy(worker_service, 'worker'),
        'web': current_live_deploy(web_service, 'web'),
    }
    changed = []
    try:
        changed.append(('worker', worker_service, None))
        await_deploy(worker_service, trigger_service(worker_service), 'worker')
        changed.append(('web', web_service, origin))
        await_deploy(web_service, trigger_service(web_service), 'web', origin)
        print('Reviewed worker and web digest are live and ready.', flush=True)
    except Exception as release_error:
        rollback_errors = []
        for label, service, readiness_origin in reversed(changed):
            try:
                rollback_service(service, rollback_targets[label], label, readiness_origin)
            except Exception as rollback_error:
                rollback_errors.append(label + ': ' + str(rollback_error))
        if rollback_errors:
            raise RuntimeError(str(release_error) + '; rollback failures: ' + '; '.join(rollback_errors)) from None
        raise RuntimeError(str(release_error) + '; all changed Render services were rolled back') from None

if __name__ == '__main__':
    try: main()
    except Exception as error: raise SystemExit(str(error)) from None
