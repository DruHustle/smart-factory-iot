#!/usr/bin/env python3
"""Acceptance checks for the real six-process image with disposable dependencies."""
from pathlib import Path
from http.cookiejar import CookieJar
import json, os, subprocess, time, urllib.request, urllib.error, urllib.parse

ROOT = Path(__file__).resolve().parents[1]
COMPOSE = ['docker', 'compose', '--env-file', '/dev/null', '-p', 'smart-factory-bundle-test', '-f', str(ROOT / 'docker-compose.bundle-test.yml')]
BASE = 'http://127.0.0.1:3110'
def run(args, capture=False):
    return subprocess.run(args, cwd=ROOT, check=True, text=True, stdout=subprocess.PIPE if capture else None).stdout
def sql(value):
    return run(COMPOSE + ['exec', '-T', 'database', 'psql', '-U', 'postgres', '-d', 'dashboard', '-qAtc', value], True).strip()
def http(opener, path, value=None):
    request = urllib.request.Request(BASE + path, data=json.dumps({'json': value}).encode() if value is not None else None,
        headers={'Content-Type': 'application/json'})
    try: response = opener.open(request, timeout=25)
    except urllib.error.HTTPError as error: response = error
    raw = response.read()
    return response.status, json.loads(raw) if raw else None
def trpc(opener, procedure, value=None, query=False):
    path = '/api/trpc/' + procedure
    if query: path += '?input=' + urllib.parse.quote(json.dumps({'json': value}))
    status, data = http(opener, path, None if query else value)
    if status != 200: raise AssertionError(f'{procedure}: {status}: {data}')
    return data['result']['data']['json']
def wait(check, timeout=90):
    deadline=time.monotonic()+timeout
    while time.monotonic()<deadline:
        try:
            if check(): return
        except (OSError, AssertionError): pass
        time.sleep(1)
    raise AssertionError('Acceptance condition timed out')

completed = False
try:
    run(COMPOSE + ['up','-d','--wait','database','backend-database','redis','broker'])
    # Repeated pre-deploy tasks must be idempotent and need no mounted disk.
    for _ in range(2): run(COMPOSE + ['run','--rm','--entrypoint','python3','bundle','/app/deploy/render/migrate.py'])
    run(COMPOSE + ['up','-d','bundle'])
    plain = urllib.request.build_opener()
    wait(lambda: http(plain, '/health/ready')[0] == 200)
    wait(lambda: run(COMPOSE+['exec','-T','bundle','supervisorctl','-c','/app/deploy/render/supervisord.conf','status'], True).count('RUNNING') == 6)
    assert run(COMPOSE+['exec','-T','bundle','id','-u'], True).strip() != '0'
    print('PASS: migrations repeat safely; all six services are running as a non-root user.')
    bootstrap = COMPOSE + ['exec','-T','-e','BOOTSTRAP_ADMIN_EMAIL=bootstrap@example.com',
        '-e','BOOTSTRAP_ADMIN_PASSWORD=Bootstrap-test-Password-123!',
        'bundle','node','scripts/bootstrap-admin.mjs']
    run(bootstrap)
    refused = subprocess.run(bootstrap, cwd=ROOT, capture_output=True, text=True)
    assert refused.returncode != 0 and 'administrator already exists' in refused.stderr
    sql("DELETE FROM users WHERE email='bootstrap@example.com'")
    print('PASS: private first-admin bootstrap works and refuses a second bootstrap.')
    # Seed isolated accounts via the real API and elevate test roles in the disposable DB.
    accounts={}
    for role in ('engineer','viewer','admin'):
        opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(CookieJar()))
        user=trpc(opener,'auth.register',{'email':role+'@example.com','password':'Bundle-test-Password-123!','name':role})['user']
        sql(f"UPDATE users SET role='{role}' WHERE id={user['id']}")
        accounts[role]=(opener,user['id'])
        assert trpc(opener,'auth.me',query=True)['role'] == role
    admin,admin_id=accounts['admin']; engineer,engineer_id=accounts['engineer']; viewer,viewer_id=accounts['viewer']
    # Check the private service boundary, independent of the public Node role guard.
    status=run(COMPOSE+['exec','-T','bundle','curl','-s','-o','/dev/null','-w','%{http_code}','http://127.0.0.1:3104/api/auth/profile'], True)
    assert status == '401'
    print('PASS: IdentityService reads current dashboard roles and rejects anonymous private requests.')
    device=trpc(engineer,'devices.create',{'deviceId':'bundle-gateway','name':'Bundle gateway','type':'gateway'})
    alert=int(sql(f'''INSERT INTO alerts ("deviceId",type,severity,message,"errorCode") VALUES ({device['id']},'system_error','critical','Bundle incident','SF-TEST') RETURNING id'''))
    trpc(engineer,'alerts.assign',{'id':alert,'assignedToId':engineer_id})
    items=trpc(engineer,'notifications.list',query=True)
    assert len([item for item in items if item['alertId']==alert]) == 2
    assert not trpc(viewer,'notifications.list',query=True)
    status,_=http(viewer,'/api/trpc/notifications.markRead',{'id':items[0]['id']}); assert status==404
    trpc(engineer,'notifications.markRead',{'id':items[0]['id']})
    wait(lambda: sql("SELECT count(*) FROM notification_inbox WHERE \"emailStatus\"='unconfigured'") == '4')
    run(COMPOSE+['exec','-T','bundle','supervisorctl','-c','/app/deploy/render/supervisord.conf','restart','notification'])
    assert len(trpc(engineer,'notifications.list',query=True)) == 2
    print('PASS: incidents and assignments create durable inbox entries; ownership is enforced; unconfigured email is explicit after restart.')
    sql(f'''INSERT INTO sensor_readings ("deviceId","assetId",temperature,power,timestamp) VALUES ({device['id']},'urn:bundle:motor',10,NULL,1000),({device['id']},'urn:bundle:motor',NULL,80,2000),({device['id']},'urn:bundle:motor',30,100,5000)''')
    coverage=trpc(engineer,'analytics.getCoverage',{'assetIds':['urn:bundle:motor'],'startTime':1,'endTime':6000,'intervalMs':60000},query=True)['assets'][0]
    assert coverage['samples']==3 and coverage['longestGapMs']==3000
    assert coverage['metrics'][0]['samples']==2 and coverage['metrics'][0]['average']==20
    assert coverage['metrics'][1]['samples']==0 and coverage['metrics'][1]['average'] is None
    print('PASS: AnalyticsService calculates stored sample coverage, gaps and null-safe aggregates.')
    run(COMPOSE+['stop','database'])
    wait(lambda: http(plain,'/health/ready')[0]==503, timeout=30)
    assert http(plain,'/health/live')[0]==200
    run(COMPOSE+['start','database'])
    wait(lambda: http(plain,'/health/ready')[0]==200)
    run(COMPOSE+['exec','-T','bundle','supervisorctl','-c','/app/deploy/render/supervisord.conf','stop','analytics'])
    assert http(plain,'/health/ready')[0]==503
    run(COMPOSE+['exec','-T','bundle','supervisorctl','-c','/app/deploy/render/supervisord.conf','start','analytics'])
    wait(lambda: http(plain,'/health/ready')[0]==200)
    print('PASS: database/service failures produce readiness 503 while liveness stays available, and recover.')
    completed = True
finally:
    try:
        if not completed:
            logfile = Path(os.environ.get('TMPDIR', '/tmp')) / 'smart-factory-bundle-smoke.log'
            logfile.write_text(run(COMPOSE+['logs','--no-color'], True))
            print('Synthetic acceptance-test failure log: ' + str(logfile))
    finally: run(COMPOSE+['down','--volumes','--remove-orphans'])
