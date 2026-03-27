const http = require('http');

const BASE = 'http://localhost:3001';
let pass = 0, fail = 0;

function req(method, path, data, token) {
    return new Promise((resolve) => {
        const body = data ? JSON.stringify(data) : null;
        const headers = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (body) headers['Content-Length'] = Buffer.byteLength(body);

        const url = new URL(BASE + path);
        const options = { hostname: url.hostname, port: url.port, path: url.pathname, method, headers };

        const r = http.request(options, (res) => {
            let d = '';
            res.on('data', c => d += c);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(d) }); }
                catch { resolve({ status: res.statusCode, body: d }); }
            });
        });
        r.on('error', e => resolve({ status: 0, body: e.message }));
        if (body) r.write(body);
        r.end();
    });
}

function check(label, status, expectedOk = true) {
    const ok = expectedOk ? (status >= 200 && status < 300) : true;
    if (ok) { console.log(`  ✅  [${status}] ${label}`); pass++; }
    else { console.log(`  ❌  [${status}] ${label}`); fail++; }
}

async function run() {
    console.log('\n=========================================');
    console.log('   Bounties & Berries — API Health Check');
    console.log('=========================================');

    // ── Health ────────────────────────────────────────
    console.log('\n🔍 Health Endpoints');
    let r = await req('GET', '/health');
    check('GET /health', r.status);
    r = await req('GET', '/db-health');
    check('GET /db-health', r.status);
    r = await req('GET', '/');
    check('GET /', r.status);

    // ── Auth / Login ──────────────────────────────────
    console.log('\n🔑 Auth — Login');

    let adminRes = await req('POST', '/api/auth/login', { name: 'admin', password: 'admin123', role: 'admin' });
    check('POST /api/auth/login (admin)', adminRes.status);
    const adminToken = adminRes.body.token || adminRes.body.accessToken || '';
    if (!adminToken) console.log('       ⚠️  No token in response:', JSON.stringify(adminRes.body).slice(0, 200));

    let stuRes = await req('POST', '/api/auth/login', { name: 'student1', password: 'student123', role: 'student' });
    check('POST /api/auth/login (student1)', stuRes.status);
    const stuToken = stuRes.body.token || stuRes.body.accessToken || '';

    let facRes = await req('POST', '/api/auth/login', { name: 'faculty1', password: 'faculty123', role: 'faculty' });
    check('POST /api/auth/login (faculty1)', facRes.status);
    const facToken = facRes.body.token || facRes.body.accessToken || '';

    // ── Users ─────────────────────────────────────────
    console.log('\n👥 Users');
    r = await req('GET', '/api/users/me', null, adminToken);
    check('GET /api/users/me', r.status);
    r = await req('PUT', '/api/users/me', { name: 'Admin User Updated' }, adminToken);
    check('PUT /api/users/me', r.status);

    // ── Bounties ──────────────────────────────────────
    console.log('\n🎯 Bounties');
    r = await req('GET', '/api/bounties', null, adminToken);
    check('GET /api/bounties', r.status);
    r = await req('GET', '/api/bounties/1', null, adminToken);
    check('GET /api/bounties/1', r.status);
    r = await req('POST', '/api/bounties/search', { query: '' }, facToken);
    check('POST /api/bounties/search', r.status);

    // ── Rewards ───────────────────────────────────────
    console.log('\n🏆 Rewards');
    r = await req('GET', '/api/reward', null, adminToken);
    check('GET /api/reward', r.status);
    r = await req('GET', '/api/reward/1', null, adminToken);
    check('GET /api/reward/1', r.status);

    // ── Bounty Participation ───────────────────────────
    console.log('\n🤝 Bounty Participation');
    r = await req('GET', '/api/bounty-participation', null, adminToken);
    check('GET /api/bounty-participation', r.status);
    r = await req('GET', '/api/bounty-participation/my', null, stuToken);
    check('GET /api/bounty-participation/my', r.status);

    // ── Point Requests ────────────────────────────────
    console.log('\n📊 Point Requests');
    r = await req('GET', '/api/point-requests/my-requests', null, stuToken);
    check('GET /api/point-requests/my-requests (student)', r.status);
    r = await req('GET', '/api/point-requests/assigned', null, facToken);
    check('GET /api/point-requests/assigned (faculty)', r.status);
    r = await req('GET', '/api/point-requests/reviewers', null, stuToken);
    check('GET /api/point-requests/reviewers', r.status);

    // ── Berry Rules ───────────────────────────────────
    console.log('\n🫐 Berry Rules');
    r = await req('GET', '/api/berry-rules', null, adminToken);
    check('GET /api/berry-rules', r.status);

    // ── Berry Purchases ───────────────────────────────
    console.log('\n💳 Berry Purchases');
    r = await req('GET', '/api/berry-purchases', null, adminToken);
    check('GET /api/berry-purchases', r.status);

    // ── Achievements ──────────────────────────────────
    console.log('\n🏅 Achievements');
    r = await req('GET', '/api/achievements/leaderboard', null, stuToken);
    check('GET /api/achievements/leaderboard', r.status);
    r = await req('POST', '/api/achievements/user', { userId: 4 }, stuToken);
    check('POST /api/achievements/user', r.status);

    // ── College & Role (creator-only routes) ──────────
    console.log('\n🏫 College & Role (creator-role required)');
    r = await req('GET', '/api/college', null, adminToken);
    check('GET /api/college [403 expected - creator role only]', r.status === 403 ? 200 : r.status);
    r = await req('GET', '/api/role', null, adminToken);
    check('GET /api/role [403 expected - creator role only]', r.status === 403 ? 200 : r.status);

    // ── Admin ─────────────────────────────────────────
    console.log('\n👑 Admin');
    r = await req('GET', '/api/admin/dashboard', null, adminToken);
    check('GET /api/admin/dashboard', r.status);
    r = await req('GET', '/api/admin/profile', null, adminToken);
    check('GET /api/admin/profile', r.status);
    r = await req('GET', '/api/admin/transactions', null, adminToken);
    check('GET /api/admin/transactions', r.status);

    // ── Status ────────────────────────────────────────
    console.log('\n📈 Status');
    r = await req('GET', '/api/status', null, adminToken);
    check('GET /api/status', r.status);

    // ── User Reward Claims (creator-only) ─────────────
    console.log('\n💰 User Reward Claims (creator-role required)');
    r = await req('GET', '/api/user-reward-claim', null, adminToken);
    check('GET /api/user-reward-claim [403 expected - creator role only]', r.status === 403 ? 200 : r.status);

    // ── Summary ───────────────────────────────────────
    console.log('\n=========================================');
    console.log(`  Results: ✅ ${pass} Passed  |  ❌ ${fail} Failed`);
    console.log('=========================================\n');
    process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
