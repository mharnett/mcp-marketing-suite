#!/usr/bin/env bash
set -e

# MCP Marketing Suite installer
# Installs all six MCPs and prints a Claude config snippet.

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
RESET='\033[0m'

ok()   { echo -e "${GREEN}✓${RESET} $1"; }
warn() { echo -e "${YELLOW}⚠${RESET}  $1"; }
fail() { echo -e "${RED}✗${RESET} $1"; }
hdr()  { echo -e "\n${BOLD}$1${RESET}"; }

# ── dependency checks ──────────────────────────────────────────────────────────

hdr "Checking dependencies"

HAS_NODE=false
HAS_NPM=false
HAS_PYTHON=false
HAS_PIP=false

if command -v node &>/dev/null; then
  NODE_VERSION=$(node --version | sed 's/v//')
  NODE_MAJOR=$(echo "$NODE_VERSION" | cut -d. -f1)
  if [ "$NODE_MAJOR" -ge 18 ]; then
    ok "Node.js $NODE_VERSION"
    HAS_NODE=true
  else
    warn "Node.js $NODE_VERSION found but ≥18 is required"
  fi
else
  warn "Node.js not found — skipping npm MCPs (Google Ads, Bing Ads, LinkedIn, GA4, GSC)"
fi

if command -v npm &>/dev/null; then
  HAS_NPM=true
fi

# Prefer uv → pip3 → pip for Python
PIP_CMD=""
if command -v uv &>/dev/null; then
  PIP_CMD="uv pip install"
  PYTHON_VER=$(python3 --version 2>/dev/null || echo "unknown")
  ok "uv found ($PYTHON_VER)"
  HAS_PYTHON=true
  HAS_PIP=true
elif command -v pip3 &>/dev/null; then
  PIP_CMD="pip3 install"
  PYTHON_VER=$(python3 --version 2>/dev/null || echo "unknown")
  ok "Python $PYTHON_VER (pip3)"
  HAS_PYTHON=true
  HAS_PIP=true
elif command -v pip &>/dev/null; then
  PIP_CMD="pip install"
  PYTHON_VER=$(python --version 2>/dev/null || echo "unknown")
  ok "Python $PYTHON_VER (pip)"
  HAS_PYTHON=true
  HAS_PIP=true
else
  warn "Python/pip not found — skipping Meta Ads MCP"
fi

if [ "$HAS_NODE" = false ] && [ "$HAS_PYTHON" = false ]; then
  fail "Neither Node.js nor Python found. Install at least one and re-run."
  exit 1
fi

# ── install npm MCPs ───────────────────────────────────────────────────────────

NPM_INSTALLED=()
NPM_FAILED=()

if [ "$HAS_NODE" = true ] && [ "$HAS_NPM" = true ]; then
  hdr "Installing npm MCPs"

  for pkg in mcp-google-ads mcp-bing-ads mcp-linkedin-ads mcp-ga4 mcp-google-gsc; do
    if npm install -g "$pkg" &>/dev/null; then
      ok "$pkg"
      NPM_INSTALLED+=("$pkg")
    else
      fail "$pkg (install failed)"
      NPM_FAILED+=("$pkg")
    fi
  done
fi

# ── install Python MCPs ────────────────────────────────────────────────────────

PIP_INSTALLED=()
PIP_FAILED=()

if [ "$HAS_PIP" = true ]; then
  hdr "Installing Python MCPs"

  if $PIP_CMD meta-ads-mcp &>/dev/null; then
    ok "meta-ads-mcp"
    PIP_INSTALLED+=("meta-ads-mcp")
  else
    fail "meta-ads-mcp (install failed)"
    PIP_FAILED+=("meta-ads-mcp")
  fi
fi

# ── locate installed binaries ──────────────────────────────────────────────────

NODE_MODULES_BIN=""
if [ "$HAS_NODE" = true ]; then
  # Prefer global node_modules
  NPM_PREFIX=$(npm prefix -g 2>/dev/null || echo "")
  if [ -n "$NPM_PREFIX" ]; then
    NODE_MODULES_BIN="$NPM_PREFIX/lib/node_modules"
  fi
fi

PYTHON_BIN=$(command -v python3 2>/dev/null || command -v python 2>/dev/null || echo "python3")

# ── print Claude config snippet ────────────────────────────────────────────────

hdr "Claude config snippet"
echo ""
echo "Add the following to ~/.claude/settings.json (Claude Code)"
echo "or ~/Library/Application Support/Claude/claude_desktop_config.json (Claude Desktop):"
echo ""
echo '```json'

ENTRIES=()

if [[ " ${NPM_INSTALLED[*]} " =~ " mcp-google-ads " ]]; then
  ENTRIES+=("$(cat <<'EOF'
    "google-ads": {
      "command": "node",
      "args": ["NMBIN/mcp-google-ads/dist/index.js"],
      "env": {
        "GOOGLE_ADS_DEVELOPER_TOKEN": "YOUR_DEVELOPER_TOKEN",
        "GOOGLE_ADS_CLIENT_ID": "YOUR_CLIENT_ID",
        "GOOGLE_ADS_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "GOOGLE_ADS_REFRESH_TOKEN": "YOUR_REFRESH_TOKEN"
      }
    }
EOF
  )")
fi

if [[ " ${NPM_INSTALLED[*]} " =~ " mcp-bing-ads " ]]; then
  ENTRIES+=("$(cat <<'EOF'
    "bing-ads": {
      "command": "node",
      "args": ["NMBIN/mcp-bing-ads/dist/index.js"],
      "env": {
        "BING_ADS_DEVELOPER_TOKEN": "YOUR_DEVELOPER_TOKEN",
        "BING_ADS_CLIENT_ID": "YOUR_CLIENT_ID",
        "BING_ADS_REFRESH_TOKEN": "YOUR_REFRESH_TOKEN"
      }
    }
EOF
  )")
fi

if [[ " ${NPM_INSTALLED[*]} " =~ " mcp-linkedin-ads " ]]; then
  ENTRIES+=("$(cat <<'EOF'
    "linkedin-ads": {
      "command": "node",
      "args": ["NMBIN/mcp-linkedin-ads/dist/index.js"],
      "env": {
        "LINKEDIN_CLIENT_ID": "YOUR_CLIENT_ID",
        "LINKEDIN_CLIENT_SECRET": "YOUR_CLIENT_SECRET",
        "LINKEDIN_REFRESH_TOKEN": "YOUR_REFRESH_TOKEN"
      }
    }
EOF
  )")
fi

if [[ " ${NPM_INSTALLED[*]} " =~ " mcp-ga4 " ]]; then
  ENTRIES+=("$(cat <<'EOF'
    "ga4": {
      "command": "node",
      "args": ["NMBIN/mcp-ga4/dist/index.js"],
      "env": {
        "GA4_PROPERTY_ID": "YOUR_PROPERTY_ID",
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account.json"
      }
    }
EOF
  )")
fi

if [[ " ${NPM_INSTALLED[*]} " =~ " mcp-google-gsc " ]]; then
  ENTRIES+=("$(cat <<'EOF'
    "gsc": {
      "command": "node",
      "args": ["NMBIN/mcp-google-gsc/dist/index.js"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/path/to/service-account.json"
      }
    }
EOF
  )")
fi

if [[ " ${PIP_INSTALLED[*]} " =~ " meta-ads-mcp " ]]; then
  ENTRIES+=("$(cat <<'EOF'
    "meta-ads": {
      "command": "PYBIN",
      "args": ["-m", "meta_ads_mcp"],
      "env": {
        "META_ACCESS_TOKEN": "YOUR_SYSTEM_USER_TOKEN"
      }
    }
EOF
  )")
fi

# Substitute placeholders
echo "{"
echo "  \"mcpServers\": {"
for i in "${!ENTRIES[@]}"; do
  entry="${ENTRIES[$i]}"
  entry="${entry//NMBIN/$NODE_MODULES_BIN}"
  entry="${entry//PYBIN/$PYTHON_BIN}"
  if [ "$i" -lt $((${#ENTRIES[@]} - 1)) ]; then
    echo "$entry,"
  else
    echo "$entry"
  fi
done
echo "  }"
echo "}"
echo '```'

# ── summary ────────────────────────────────────────────────────────────────────

hdr "Summary"

TOTAL_INSTALLED=$(( ${#NPM_INSTALLED[@]} + ${#PIP_INSTALLED[@]} ))
TOTAL_FAILED=$(( ${#NPM_FAILED[@]} + ${#PIP_FAILED[@]} ))

echo "$TOTAL_INSTALLED of 6 MCPs installed."

if [ $TOTAL_FAILED -gt 0 ]; then
  echo ""
  warn "Failed installs:"
  for pkg in "${NPM_FAILED[@]}" "${PIP_FAILED[@]}"; do
    echo "  - $pkg"
  done
  echo ""
  echo "Run 'npm install $pkg' or 'pip install $pkg' manually and check for errors."
fi

echo ""
echo "Next steps:"
echo "  1. Fill in the credential placeholders in the config snippet above"
echo "  2. See docs/ for per-platform credential setup guides"
echo "  3. Restart Claude Code / Claude Desktop"
echo ""
echo "Docs: https://github.com/mharnett/mcp-marketing-suite"
