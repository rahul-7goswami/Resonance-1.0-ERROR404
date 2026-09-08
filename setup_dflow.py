"""Interactive helper for Start-D-Flow.bat. No secrets passed on command lines."""
import getpass
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from urllib.error import URLError
from urllib.request import urlopen
import venv
import webbrowser

ROOT = Path(__file__).resolve().parent
SETTINGS = ROOT / '.dflow-settings.json'


def yes(prompt, default=False):
    answer = input(prompt + (' [Y/n]: ' if default else ' [y/N]: ')).strip().lower()
    return answer in {'y', 'yes'} or (not answer and default)


def load_settings():
    if not SETTINGS.exists():
        return {}
    try:
        data = json.loads(SETTINGS.read_text(encoding='utf-8'))
        if not isinstance(data, dict):
            raise ValueError()
        return {k: v for k, v in data.items() if k in {
            'GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_FINANCE_MODEL', 'GEMINI_LIFE_MODEL'
        } and isinstance(v, str)}
    except (ValueError, OSError):
        raise RuntimeError('Cannot read .dflow-settings.json. Correct or rename that file, then retry.') from None


def configure():
    saved = load_settings()
    settings = {k: os.environ.get(k, saved.get(k, '')).strip() for k in (
        'GEMINI_API_KEY', 'GEMINI_MODEL', 'GEMINI_FINANCE_MODEL', 'GEMINI_LIFE_MODEL')}
    print('\nAI configuration (the API key is hidden while you type).')
    if settings['GEMINI_API_KEY'] and yes('Reuse the existing API key?', True):
        pass
    else:
        settings['GEMINI_API_KEY'] = getpass.getpass('Gemini API key (Enter to run without AI): ').strip()
    if settings['GEMINI_API_KEY']:
        print('Use a Gemini model available to your account that supports JSON output and Google Search grounding.')
        current = settings['GEMINI_MODEL']
        while True:
            model = input(f'Gemini model ID{f" [{current}]" if current else ""}: ').strip() or current
            if model and all(c.isalnum() or c in '-_.' for c in model):
                settings['GEMINI_MODEL'] = model
                break
            print('Enter a model ID, for example the exact ID shown in Google AI Studio (not a URL).')
        if yes('Use separate models for Finance or Life?'):
            for domain in ('FINANCE', 'LIFE'):
                name = f'GEMINI_{domain}_MODEL'
                settings[name] = input(f'{domain.title()} model ID (Enter to use the main model): ').strip()
        else:
            settings['GEMINI_FINANCE_MODEL'] = settings['GEMINI_LIFE_MODEL'] = ''
        print('AI research may incur charges on your Google account when you request it.')
        if yes('Save these settings for future launches? The key will be stored as plain text in the Git-ignored .dflow-settings.json'):
            SETTINGS.write_text(json.dumps(settings, indent=2) + '\n', encoding='utf-8')
            print('Saved local settings. Do not share .dflow-settings.json.')
    else:
        print('Starting without AI. Forms and local calculations are available; AI research needs a key.')
    env = os.environ.copy()
    env.update(settings)
    return env


def choose_port():
    while True:
        value = input('\nLocal port [8000]: ').strip() or '8000'
        if not value.isdigit() or not 1024 <= int(value) <= 65535:
            print('Choose a number between 1024 and 65535.'); continue
        try:
            with socket.socket() as probe:
                probe.bind(('127.0.0.1', int(value)))
            return int(value)
        except OSError:
            print(f'Port {value} is unavailable. Choose another (for example 8001), or close the existing server.')


def main():
    os.chdir(ROOT)
    if sys.version_info < (3, 10):
        raise RuntimeError('Python 3.10 or newer is required.')
    for path in ('requirements.txt', 'business/business.py', 'finance/finance.py', 'life/life.py'):
        if not (ROOT / path).is_file():
            raise RuntimeError(f'Missing project file: {path}. Keep the launcher in the complete project folder.')
    environment = ROOT / '.venv'
    python = environment / ('Scripts/python.exe' if os.name == 'nt' else 'bin/python')
    if not python.exists():
        print('Creating the project virtual environment...')
        venv.EnvBuilder(with_pip=True).create(environment)
    print('\nInstalling project requirements (internet access may be needed)...')
    subprocess.run([str(python), '-m', 'pip', 'install', '-r', str(ROOT / 'requirements.txt')], check=True)
    for domain in ('business', 'finance', 'life'):
        (Path(os.environ.get('DFLOW_DATA_DIR', str(ROOT / 'data/inputs'))) / domain).mkdir(parents=True, exist_ok=True)
    env = configure()
    port = choose_port()
    open_browser = yes('Open D-Flow in your browser when ready?', True)
    url = f'http://127.0.0.1:{port}'
    print(f'\nStarting D-Flow at {url}\nKeep this window open. Press Ctrl+C to stop.\n')
    process = subprocess.Popen([str(python), '-m', 'uvicorn', 'business.business:app',
                                '--host', '127.0.0.1', '--port', str(port)], cwd=ROOT, env=env)
    try:
        ready = False
        for _ in range(60):
            if process.poll() is not None:
                raise RuntimeError('The server exited during startup. Review its error above.')
            try:
                with urlopen(url + '/api/finance/status', timeout=1) as response:
                    ready = response.status == 200
                if ready:
                    break
            except (URLError, OSError):
                time.sleep(.5)
        if not ready:
            raise RuntimeError('The server did not become ready. Review its output above.')
        print(f'\nD-Flow is ready: {url}')
        if open_browser:
            webbrowser.open(url)
        if process.wait() != 0:
            raise RuntimeError('The server stopped with an error. Review its output above.')
    except KeyboardInterrupt:
        print('\nStopping D-Flow...')
    finally:
        if process.poll() is None:
            process.terminate()
            try:
                process.wait(timeout=10)
            except subprocess.TimeoutExpired:
                process.kill(); process.wait()


if __name__ == '__main__':
    try:
        main()
    except (KeyboardInterrupt, EOFError):
        print('\nSetup cancelled.')
    except (RuntimeError, OSError, subprocess.CalledProcessError) as error:
        print(f'\nSetup failed: {error}', file=sys.stderr)
        sys.exit(1)
