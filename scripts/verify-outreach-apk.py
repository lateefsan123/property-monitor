"""Check the startup assets Expo needs before delivering the outreach APK."""
import json
import sys
import zipfile

with zipfile.ZipFile(sys.argv[1]) as apk:
    manifest = json.loads(apk.read('assets/app.manifest'))
    assets = manifest['assets']
    assert 'assets/index.android.bundle' in apk.namelist(), 'Missing JS bundle'
    assert any(a['type'] == 'ttf' and 'ionicons' in a['name'].lower() for a in assets), 'Missing Ionicons in embedded asset manifest; startup font loading will fail'
    assert any(a['name'] == 'skyline-line' for a in assets), 'Missing login artwork'
    assert any(a['name'] == 'google-logo' for a in assets), 'Missing Google sign-in logo'
    assert any(n.endswith('.ttf') for n in apk.namelist()), 'Missing packaged font'
    print(f'PASS: {len(assets)} registered assets, including startup font and login artwork')
