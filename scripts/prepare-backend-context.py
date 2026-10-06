"""Copy only source/build/migration files; never package local settings or keys."""
import argparse
from pathlib import Path
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('backend')
parser.add_argument('output')
args = parser.parse_args()
source = Path(args.backend).resolve()
target = Path(args.output).resolve()
if target.exists():
    raise SystemExit('Output must be a new directory')
for directory in ('src', 'deploy/migrations'):
    for file in (source / directory).rglob('*'):
        if not file.is_file() or any(part in ('bin', 'obj', '.git', 'TestResults') for part in file.parts): continue
        if file.suffix not in ('.cs', '.csproj', '.sln', '.props', '.targets', '.sql'): continue
        destination = target / file.relative_to(source)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(file, destination)
