"""Phase 1: configuration is safe by default and tunnel-ready."""
import importlib
import os
import subprocess
import sys

import pytest
from django.core.exceptions import ImproperlyConfigured


def load_settings(**env):
    """Import config.settings in a clean subprocess with the given environment."""
    code = (
        "import sys, json\n"
        "sys.argv = ['manage.py', 'check']\n"   # not 'test', so TESTING is False
        "import config.settings as s\n"
        "print(json.dumps({'DEBUG': s.DEBUG, 'HOSTS': s.ALLOWED_HOSTS, 'CORS_ALL': s.CORS_ALLOW_ALL_ORIGINS,"
        " 'CORS': s.CORS_ALLOWED_ORIGINS, 'PROXIES': s.REST_FRAMEWORK['NUM_PROXIES']}))\n"
    )
    # Explicit values for every variable, so a developer's own .env.local (which
    # load_dotenv would otherwise fill in) cannot change the outcome.
    base = dict(os.environ)
    base.update({'DJANGO_SETTINGS_MODULE': 'config.settings', 'PYTHONPATH': os.getcwd(),
                 'SECRET_KEY': '', 'DEBUG': 'False', 'ALLOWED_HOSTS': '',
                 'CORS_ALLOWED_ORIGINS': '', 'NUM_PROXIES': '0'})
    base.update(env)
    return subprocess.run([sys.executable, '-c', code], env=base, capture_output=True, text=True,
                          cwd=os.getcwd())


def test_missing_secret_key_refuses_to_start_outside_debug():
    r = load_settings()
    assert r.returncode != 0
    assert 'SECRET_KEY must be set' in r.stderr


def test_defaults_are_locked_down():
    import json
    r = load_settings(SECRET_KEY='x' * 50)
    assert r.returncode == 0, r.stderr
    cfg = json.loads(r.stdout.strip().splitlines()[-1])
    assert cfg['DEBUG'] is False
    assert '*' not in cfg['HOSTS']
    assert cfg['CORS_ALL'] is False
    assert cfg['PROXIES'] == 0


def test_debug_mode_allows_lan_access_without_extra_setup():
    import json
    r = load_settings(DEBUG='True')
    cfg = json.loads(r.stdout.strip().splitlines()[-1])
    assert cfg['HOSTS'] == ['*'] and cfg['CORS_ALL'] is True


def test_explicit_hosts_origins_and_proxy_count_are_honoured():
    import json
    r = load_settings(SECRET_KEY='x' * 50, ALLOWED_HOSTS='a.example, b.example',
                      CORS_ALLOWED_ORIGINS='https://a.example', NUM_PROXIES='1')
    cfg = json.loads(r.stdout.strip().splitlines()[-1])
    assert cfg['HOSTS'] == ['a.example', 'b.example']
    assert cfg['CORS'] == ['https://a.example'] and cfg['CORS_ALL'] is False
    assert cfg['PROXIES'] == 1
