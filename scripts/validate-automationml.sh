#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: scripts/validate-automationml.sh <plant-layout.aml>" >&2
  exit 2
fi
if ! command -v xmllint >/dev/null 2>&1; then
  echo "xmllint is required (install libxml2 or libxml2-utils)." >&2
  exit 127
fi

schema="$(cd "$(dirname "$0")/.." && pwd)/docs/schemas/CAEX_ClassModel_V.3.0.xsd"
xmllint --nonet --noout --schema "$schema" "$1"
