#!/usr/bin/env bash
# Integration tests for setup.sh.
# Uses PATH-level mocking — no external dependencies required.

SETUP_SH="$(cd "$(dirname "$0")/.." && pwd)/setup.sh"
PASS=0
FAIL=0

green='\033[0;32m'
red='\033[0;31m'
reset='\033[0m'

pass() { echo -e "  ${green}PASS${reset}  $1"; (( PASS++ )); }
fail() { echo -e "  ${red}FAIL${reset}  $1"; (( FAIL++ )); }

assert_contains() {
  local label="$1" needle="$2" haystack="$3"
  if echo "$haystack" | grep -qF "$needle"; then
    pass "$label"
  else
    fail "$label — expected: '$needle'"
    echo "       output was:"
    echo "$haystack" | sed 's/^/         /'
  fi
}

assert_not_contains() {
  local label="$1" needle="$2" haystack="$3"
  if ! echo "$haystack" | grep -qF "$needle"; then
    pass "$label"
  else
    fail "$label — unexpected: '$needle'"
  fi
}

assert_exit() {
  local label="$1" expected="$2" actual="$3"
  if [ "$actual" -eq "$expected" ]; then
    pass "$label"
  else
    fail "$label — expected exit $expected, got $actual"
  fi
}

# ── mock helpers ───────────────────────────────────────────────────────────────

make_mock_dir() {
  mktemp -d
}

# Write a mock executable to a directory.
# Usage: add_mock <dir> <name> <exit_code> [stdout]
add_mock() {
  local dir="$1" name="$2" exit_code="$3" stdout="${4:-}"
  printf '#!/usr/bin/env bash\necho "%s"\nexit %s\n' "$stdout" "$exit_code" > "$dir/$name"
  chmod +x "$dir/$name"
}

# Standard npm mock: succeeds for all installs, returns /fake/prefix for prefix.
add_npm_mock() {
  local dir="$1"
  cat > "$dir/npm" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  --version) echo "10.0.0"; exit 0 ;;
  prefix)    echo "/fake/prefix"; exit 0 ;;
  install)   exit 0 ;;
  *)         exit 0 ;;
esac
EOF
  chmod +x "$dir/npm"
}

# Standard uv mock: succeeds for all calls (blocks the real uv on host).
add_uv_mock() {
  local dir="$1"
  cat > "$dir/uv" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
  chmod +x "$dir/uv"
}

# Standard pip3 mock: succeeds for all calls.
add_pip3_mock() {
  local dir="$1"
  cat > "$dir/pip3" <<'EOF'
#!/usr/bin/env bash
echo "Python 3.11.0"
exit 0
EOF
  chmod +x "$dir/pip3"
}

# Build the "everything available + uv preferred" mock set (uv wins over pip3).
mock_all_available_uv() {
  local dir
  dir=$(make_mock_dir)
  add_mock "$dir" "node"    0 "v20.11.0"
  add_mock "$dir" "python3" 0 "Python 3.11.0"
  add_npm_mock "$dir"
  add_uv_mock  "$dir"   # uv takes priority; blocks host uv
  echo "$dir"
}

# Build the "node + pip3 (no uv)" mock set.
# No uv in the mock dir; hermetic PATH means command -v uv returns 1.
mock_all_available_pip3() {
  local dir
  dir=$(make_mock_dir)
  add_mock "$dir" "node"    0 "v20.11.0"
  add_mock "$dir" "python3" 0 "Python 3.11.0"
  add_npm_mock  "$dir"
  add_pip3_mock "$dir"
  echo "$dir"
}

strip_ansi() {
  sed 's/\x1B\[[0-9;]*[a-zA-Z]//g'
}

run_setup() {
  local mock_dir="$1" extra_path="${2-/usr/bin:/bin}"
  # Hermetic PATH: mock dir + system dirs.
  # Prevents real node/npm/uv/pip3 on the host from leaking into tests.
  # Use ${2-default} (single dash) so passing "" gives a truly empty suffix.
  PATH="$mock_dir:$extra_path" bash "$SETUP_SH" 2>&1 | strip_ansi
}

run_setup_exit() {
  local mock_dir="$1" extra_path="${2-/usr/bin:/bin}"
  PATH="$mock_dir:$extra_path" bash "$SETUP_SH" > /dev/null 2>&1
  echo $?
}

# Build a minimal mock dir that only contains the non-platform tools setup.sh
# needs (sed, cut) — used for the "no deps" scenario where we want no Python
# or Node visible, even if macOS ships /usr/bin/pip3 or /usr/bin/python3.
mock_no_deps() {
  local dir
  dir=$(make_mock_dir)
  ln -s /usr/bin/sed "$dir/sed"
  ln -s /usr/bin/cut "$dir/cut"
  echo "$dir"
}

# ── tests ──────────────────────────────────────────────────────────────────────

echo ""
echo "setup.sh integration tests"
echo "────────────────────────────"

# ── test: uv preferred over pip3 ──────────────────────────────────────────────
echo ""
echo "scenario: all deps available, uv preferred"

mock=$(mock_all_available_uv)
out=$(run_setup "$mock")
exit_code=$(run_setup_exit "$mock")
rm -rf "$mock"

assert_exit    "exits 0"                  0 "$exit_code"
assert_contains "detects Node.js"         "Node.js 20.11.0"       "$out"
assert_contains "uses uv"                 "uv found"               "$out"
assert_contains "installs mcp-google-ads" "✓ mcp-google-ads"       "$out"
assert_contains "installs mcp-bing-ads"   "✓ mcp-bing-ads"         "$out"
assert_contains "installs meta-ads-mcp"   "✓ meta-ads-mcp"         "$out"
assert_contains "config snippet present"  '"mcpServers"'            "$out"
assert_contains "google-ads entry"        '"google-ads"'            "$out"
assert_contains "meta-ads entry"          '"meta-ads"'              "$out"
assert_contains "path substituted"        "/fake/prefix"            "$out"
assert_contains "shows 6 of 6 installed"  "6 of 6 MCPs installed"  "$out"

# ── test: pip3 used when uv absent ────────────────────────────────────────────
echo ""
echo "scenario: all deps available, pip3 (no uv)"

mock=$(mock_all_available_pip3)
out=$(run_setup "$mock")
exit_code=$(run_setup_exit "$mock")
rm -rf "$mock"

assert_exit    "exits 0"                  0 "$exit_code"
assert_contains "uses pip3"               "Python 3.11.0 (pip3)"  "$out"
assert_contains "installs meta-ads-mcp"   "✓ meta-ads-mcp"        "$out"
assert_contains "meta-ads entry"          '"meta-ads"'             "$out"
assert_contains "shows 6 of 6 installed"  "6 of 6 MCPs installed" "$out"

# ── test: node not found ───────────────────────────────────────────────────────
echo ""
echo "scenario: Node.js not available"

mock=$(make_mock_dir)
add_uv_mock  "$mock"
add_mock "$mock" "python3" 0 "Python 3.11.0"
out=$(run_setup "$mock")
exit_code=$(run_setup_exit "$mock")
rm -rf "$mock"

assert_exit    "exits 0 (python available)"  0  "$exit_code"
assert_contains "warns node not found"   "Node.js not found"       "$out"
assert_contains "installs meta-ads-mcp"  "✓ meta-ads-mcp"          "$out"
assert_not_contains "no google-ads entry" '"google-ads"'            "$out"
assert_not_contains "no bing-ads entry"   '"bing-ads"'              "$out"
assert_contains "meta-ads entry present"  '"meta-ads"'              "$out"

# ── test: node too old ─────────────────────────────────────────────────────────
echo ""
echo "scenario: Node.js version too old (<18)"

mock=$(make_mock_dir)
add_mock "$mock" "node"    0 "v16.20.0"
add_uv_mock  "$mock"
add_mock "$mock" "python3" 0 "Python 3.11.0"
out=$(run_setup "$mock")
rm -rf "$mock"

assert_contains "warns version too old"   "≥18 is required"     "$out"
assert_not_contains "no google-ads entry" '"google-ads"'         "$out"
assert_contains "meta-ads still installs" "✓ meta-ads-mcp"       "$out"

# ── test: neither node nor python ──────────────────────────────────────────────
echo ""
echo "scenario: neither Node.js nor Python available"

mock=$(mock_no_deps)
# Isolated PATH: mock dir (has sed+cut symlinks) + /bin (has bash, sh, etc.)
# /usr/bin is excluded so macOS's bundled pip3/python3 can't be found.
out=$(run_setup "$mock" "/bin")
exit_code=$(run_setup_exit "$mock" "/bin")
rm -rf "$mock"

assert_exit    "exits non-zero"               1 "$exit_code"
assert_contains "error message shown" "Neither Node.js nor Python found" "$out"

# ── test: one npm package fails to install ─────────────────────────────────────
echo ""
echo "scenario: one npm package install fails (mcp-bing-ads)"

mock=$(make_mock_dir)
add_mock "$mock" "node"    0 "v20.11.0"
add_mock "$mock" "python3" 0 "Python 3.11.0"
add_uv_mock "$mock"
# npm: fail only for mcp-bing-ads
cat > "$mock/npm" <<'EOF'
#!/usr/bin/env bash
case "$1" in
  --version) echo "10.0.0"; exit 0 ;;
  prefix)    echo "/fake/prefix"; exit 0 ;;
  install)
    if [ "$3" = "mcp-bing-ads" ]; then exit 1; fi
    exit 0
    ;;
  *)         exit 0 ;;
esac
EOF
chmod +x "$mock/npm"
out=$(run_setup "$mock")
rm -rf "$mock"

assert_contains "flags failed package"      "mcp-bing-ads (install failed)" "$out"
assert_contains "google-ads still succeeds" '"google-ads"'                   "$out"
assert_not_contains "no bing-ads entry"     '"bing-ads"'                     "$out"
assert_contains "meta-ads still installs"   "✓ meta-ads-mcp"                 "$out"
assert_contains "shows 5 of 6"              "5 of 6 MCPs installed"          "$out"

# ── test: config snippet path substitution ─────────────────────────────────────
echo ""
echo "scenario: config snippet substitutes NMBIN placeholder"

mock=$(mock_all_available_uv)
out=$(run_setup "$mock")
rm -rf "$mock"

assert_not_contains "no raw NMBIN in output" "NMBIN" "$out"
assert_not_contains "no raw PYBIN in output" "PYBIN" "$out"
assert_contains "node_modules path present"  "node_modules" "$out"

# ── summary ────────────────────────────────────────────────────────────────────

echo ""
echo "────────────────────────────"
echo "  $PASS passed  /  $FAIL failed"
echo ""

[ "$FAIL" -eq 0 ]
