#!/bin/bash
BASE="http://localhost:3001"
PASS=0; FAIL=0

check() {
  local label="$1"
  local method="$2"
  local url="$3"
  local data="$4"
  local auth="$5"

  if [ -n "$auth" ]; then
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $auth" \
      ${data:+-d "$data"})
  else
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X "$method" "$url" \
      -H "Content-Type: application/json" \
      ${data:+-d "$data"})
  fi

  if [[ "$STATUS" == 2* ]]; then
    echo "  ✅  [$STATUS] $label"
    ((PASS++))
  else
    echo "  ❌  [$STATUS] $label"
    ((FAIL++))
  fi
}

echo ""
echo "========================================="
echo "   Bounties & Berries — API Health Check"
echo "========================================="

echo ""
echo "🔍 Health Endpoints"
check "GET /health"        GET "$BASE/health"
check "GET /db-health"     GET "$BASE/db-health"
check "GET /"              GET "$BASE/"

# ── Auth ──────────────────────────────────────────
echo ""
echo "🔑 Auth — Login (Admin)"
ADMIN_RESP=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}')
ADMIN_TOKEN=$(echo "$ADMIN_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)

if [ -z "$ADMIN_TOKEN" ]; then
  echo "  ❌  [---] POST /api/auth/login (admin) — no token returned"
  echo "       Response: $ADMIN_RESP"
  ((FAIL++))
else
  echo "  ✅  [200] POST /api/auth/login (admin) — token acquired"
  ((PASS++))
fi

echo ""
echo "🔑 Auth — Login (Student)"
STU_RESP=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"student1","password":"student123"}')
STU_TOKEN=$(echo "$STU_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)

if [ -z "$STU_TOKEN" ]; then
  echo "  ❌  [---] POST /api/auth/login (student1) — no token returned"
  echo "       Response: $STU_RESP"
  ((FAIL++))
else
  echo "  ✅  [200] POST /api/auth/login (student1) — token acquired"
  ((PASS++))
fi

echo ""
echo "🔑 Auth — Login (Faculty)"
FAC_RESP=$(curl -s -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"faculty1","password":"faculty123"}')
FAC_TOKEN=$(echo "$FAC_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('token',''))" 2>/dev/null)

if [ -z "$FAC_TOKEN" ]; then
  echo "  ❌  [---] POST /api/auth/login (faculty1) — no token"
  ((FAIL++))
else
  echo "  ✅  [200] POST /api/auth/login (faculty1) — token acquired"
  ((PASS++))
fi

# ── Users ─────────────────────────────────────────
echo ""
echo "👥 Users"
check "GET /api/users"              GET  "$BASE/api/users"                ""  "$ADMIN_TOKEN"
check "GET /api/users/me"           GET  "$BASE/api/users/me"             ""  "$ADMIN_TOKEN"
check "GET /api/users/1"            GET  "$BASE/api/users/1"              ""  "$ADMIN_TOKEN"

# ── Bounties ──────────────────────────────────────
echo ""
echo "🎯 Bounties"
check "GET /api/bounties"           GET  "$BASE/api/bounties"             ""  "$ADMIN_TOKEN"
check "GET /api/bounties/1"         GET  "$BASE/api/bounties/1"           ""  "$ADMIN_TOKEN"
check "POST /api/bounties/search"   POST "$BASE/api/bounties/search"      '{"query":""}' "$FAC_TOKEN"

# ── Rewards ───────────────────────────────────────
echo ""
echo "🏆 Rewards"
check "GET /api/reward"             GET  "$BASE/api/reward"               ""  "$ADMIN_TOKEN"
check "GET /api/reward/1"           GET  "$BASE/api/reward/1"             ""  "$ADMIN_TOKEN"

# ── Bounty Participation ───────────────────────────
echo ""
echo "🤝 Bounty Participation"
check "GET /api/bounty-participation"          GET "$BASE/api/bounty-participation"     ""  "$ADMIN_TOKEN"
check "GET /api/bounty-participation/my"       GET "$BASE/api/bounty-participation/my"  ""  "$STU_TOKEN"

# ── Point Requests ────────────────────────────────
echo ""
echo "📊 Point Requests"
check "GET /api/point-requests"     GET  "$BASE/api/point-requests"       ""  "$FAC_TOKEN"
check "GET /api/point-requests/my"  GET  "$BASE/api/point-requests/my"    ""  "$STU_TOKEN"

# ── Berry Rules ───────────────────────────────────
echo ""
echo "🫐 Berry Rules"
check "GET /api/berry-rules"        GET  "$BASE/api/berry-rules"          ""  "$ADMIN_TOKEN"

# ── Berry Purchases ───────────────────────────────
echo ""
echo "💳 Berry Purchases"
check "GET /api/berry-purchases"    GET  "$BASE/api/berry-purchases"      ""  "$ADMIN_TOKEN"

# ── Achievements ──────────────────────────────────
echo ""
echo "🏅 Achievements"
check "GET /api/achievements"       GET  "$BASE/api/achievements"         ""  "$STU_TOKEN"

# ── Colleges & Roles ──────────────────────────────
echo ""
echo "🏫 College & Role"
check "GET /api/college"            GET  "$BASE/api/college"              ""  "$ADMIN_TOKEN"
check "GET /api/role"               GET  "$BASE/api/role"                 ""  "$ADMIN_TOKEN"

# ── Admin ─────────────────────────────────────────
echo ""
echo "👑 Admin"
check "GET /api/admin/dashboard"    GET  "$BASE/api/admin/dashboard"      ""  "$ADMIN_TOKEN"
check "GET /api/admin/users"        GET  "$BASE/api/admin/users"          ""  "$ADMIN_TOKEN"

# ── Status ────────────────────────────────────────
echo ""
echo "📈 Status"
check "GET /api/status"             GET  "$BASE/api/status"               ""  "$ADMIN_TOKEN"

# ── User Reward Claims ────────────────────────────
echo ""
echo "💰 User Reward Claims"
check "GET /api/user-reward-claim"  GET  "$BASE/api/user-reward-claim"    ""  "$ADMIN_TOKEN"

echo ""
echo "========================================="
echo "  Results: ✅ $PASS Passed  |  ❌ $FAIL Failed"
echo "========================================="
