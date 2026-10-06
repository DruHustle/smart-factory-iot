"""Deploy the reviewed digest through Render's API and await that deploy becoming live."""
import json, os, re, time, urllib.request, urllib.error

def main():
    required = ['RENDER_API_KEY', 'RENDER_SERVICE_ID', 'RENDER_API_ORIGIN', 'RELEASE_IMAGE']
    if any(not os.environ.get(key) for key in required):
        raise ValueError('Missing Render release configuration')
    service = os.environ['RENDER_SERVICE_ID']
    if not re.fullmatch(r'srv-[a-z0-9]+', service): raise ValueError('Invalid Render service ID')
    image = os.environ['RELEASE_IMAGE']
    if not re.fullmatch(r'ghcr.io/[a-z0-9._/-]+@sha256:[a-f0-9]{64}', image): raise ValueError('Release image must be pinned by digest')
    origin = os.environ['RENDER_API_ORIGIN'].rstrip('/')
    if not re.fullmatch(r'https://[a-zA-Z0-9.-]+(?::443)?', origin): raise ValueError('Render origin must use HTTPS')
    endpoint = 'https://api.render.com/v1/services/' + service + '/deploys'
    def api(url, body=None):
        request = urllib.request.Request(url, data=json.dumps(body).encode() if body else None,
          headers={
              'Accept': 'application/json',
              'Authorization': 'Bearer ' + os.environ['RENDER_API_KEY'],
              'Content-Type': 'application/json',
          })
        try:
            with urllib.request.urlopen(request, timeout=30) as response: return json.load(response)
        except urllib.error.HTTPError as error:
            # Render returns the actionable validation reason in the response
            # body. Keep it visible in CI while limiting untrusted output size.
            detail = error.read(4096).decode('utf-8', errors='replace').strip()
            try:
                payload = json.loads(detail)
                detail = payload.get('message') or payload.get('error') or detail
            except (json.JSONDecodeError, AttributeError):
                pass
            suffix = ': ' + str(detail).replace('\r', ' ').replace('\n', ' ') if detail else ''
            raise RuntimeError('Render API HTTP ' + str(error.code) + suffix) from None
        except Exception: raise RuntimeError('Render API request failed') from None
    deploy = api(endpoint, {'imageUrl': image})
    identifier = deploy.get('id')
    if not identifier or not re.fullmatch(r'dep-[a-z0-9]+', identifier): raise RuntimeError('Render did not return a deploy ID')
    deadline = time.monotonic() + 1800
    previous = None
    while time.monotonic() < deadline:
        status = api(endpoint + '/' + identifier).get('status')
        if status != previous: print('Render deployment status: ' + str(status), flush=True); previous = status
        if status == 'live':
            with urllib.request.urlopen(origin + '/health/ready', timeout=20) as response:
                if response.status != 200: raise RuntimeError('Render readiness check failed')
            print('Reviewed backend digest is live and ready.')
            return
        if status in ('build_failed', 'update_failed', 'pre_deploy_failed', 'canceled', 'deactivated'):
            raise RuntimeError('Render release failed: ' + status)
        time.sleep(10)
    raise TimeoutError('Render release did not become live within 30 minutes')

if __name__ == '__main__':
    try: main()
    except Exception as error: raise SystemExit(str(error)) from None
