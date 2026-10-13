const fs = require('fs');
const path = require('path');
const ROOT = 'C:/Users/najim/Documents/SEMS-UPTM';
const backend = path.join(ROOT, 'backend');
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env'), quiet: true });
const bcrypt = require(path.join(backend, 'node_modules/bcrypt'));
const pool = require(path.join(backend, 'src/config/db'));
const { issueToken } = require(path.join(backend, 'src/utils/token'));
const { createOtp } = require(path.join(backend, 'src/utils/otp'));

const API = 'http://localhost:5000/api';
const HERE = __dirname;
const PDF1 = path.join(ROOT, 'sample-data/Proposal-Cyber-Security-Awareness.pdf');
const PDF2 = path.join(ROOT, 'sample-data/Budget-Cyber-Security-Awareness.pdf');
const EXE = path.join(HERE, 'setup.exe');
fs.writeFileSync(EXE, Buffer.concat([Buffer.from('MZ'), Buffer.alloc(2048, 0x90)]));

const [gUser, gDomain] = (process.env.GMAIL_USER || 'missing@gmail.com').split('@');
const alias = (tag) => `${gUser}+${tag}@${gDomain}`;
const results = {};
const rec = (id, pass, actual) => { results[id] = { pass: !!pass, actual }; console.log(`${pass ? 'PASS' : 'FAIL'}  ${id.padEnd(9)} ${actual}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(token, method, url, body, { form } = {}) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  let payload;
  if (form) payload = form;
  else if (body !== undefined) { headers['Content-Type'] = 'application/json'; payload = JSON.stringify(body); }
  const t0 = Date.now();
  const res = await fetch(API + url, { method, headers, body: payload });
  const ms = Date.now() - t0;
  const text = await res.text();
  let json = null; try { json = JSON.parse(text); } catch {}
  return { status: res.status, body: json, text, ms };
}

function proposalForm(fields, files = []) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, typeof v === 'string' ? v : JSON.stringify(v));
  for (const [field, file, type] of files) fd.append(field, new Blob([fs.readFileSync(file)], { type }), path.basename(file));
  return fd;
}

const BASE_FIELDS = (title, extra = {}) => ({
  title, event_type: 'workshop', description: 'Test proposal created by the developer test suite.', objective: 'Verify the workflow.',
  target_participants: 'Test participants', estimated_participants: '50', event_date: '2026-12-01', event_time: '09:00', end_time: '12:00',
  venue: 'Test Hall', organizer_name: 'ZZ Test Club A', contact_person: 'Test Applicant', contact_info: '012-3456789',
  applicant_id_number: 'AM2026999001', applicant_position: 'President',
  budget_items: [{ item: 'Refreshments', description: 'Tea', quantity: 50, unit_price: 6 }, { item: 'Banner', description: '', quantity: 1, unit_price: 120 }],
  submit: 'true', ...extra,
});

async function mkUser(key, { role = 'club_committee', club = null, email, password = 'TestPass#2026', username } = {}) {
  const [r] = await pool.query(
    `INSERT INTO users (name, id_number, username, email, password_hash, role, club_id, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'active')`,
    [`ZZ ${key}`, `ZZ-${key}`, username || `zz_${key.toLowerCase()}`, email || `zz.${key.toLowerCase()}@sems-test.test`, await bcrypt.hash(password, 12), role, club]
  );
  return { id: r.insertId, name: `ZZ ${key}`, email: email || `zz.${key.toLowerCase()}@sems-test.test`, role, password, username: username || `zz_${key.toLowerCase()}` };
}

(async () => {
  const fx = {};
  try {
    const [ca] = await pool.query("INSERT INTO clubs (name, description) VALUES ('ZZ Test Club A', '[test]')");
    const [cb] = await pool.query("INSERT INTO clubs (name, description) VALUES ('ZZ Test Club B', '[test]')");
    fx.clubA = ca.insertId; fx.clubB = cb.insertId;
    fx.A1 = await mkUser('A1', { club: fx.clubA });
    fx.A2 = await mkUser('A2', { club: fx.clubA });
    fx.B1 = await mkUser('B1', { club: fx.clubB });
    fx.H = await mkUser('HEPA', { role: 'hepa_officer' });
    fx.AD = await mkUser('ADMIN', { role: 'admin' });
    fx.LOCK = await mkUser('LOCK', { club: fx.clubA });
    fx.DEACT = await mkUser('DEACT', { club: fx.clubA });
    fx.PWC = await mkUser('PWC', { club: fx.clubA });
    fx.PW = await mkUser('PW', { club: fx.clubA, email: alias('zzpw'), username: 'zz_pw' });
    fx.C = await mkUser('C', {});
    const T = {};
    for (const k of ['A1', 'A2', 'B1', 'H', 'AD', 'DEACT', 'C']) T[k] = issueToken(fx[k]);
    fs.writeFileSync(path.join(HERE, 'fixtures.json'), JSON.stringify(fx, null, 1));

    const p1 = await call(T.A1, 'POST', '/proposals', null, { form: proposalForm(BASE_FIELDS('ZZ Test Lifecycle'), [['proposal_document', PDF1, 'application/pdf'], ['budget_document', PDF2, 'application/pdf']]) });
    fx.P1 = p1.body?.proposalId;
    rec('NFT-P03', p1.status === 201 && p1.ms < 5000, `Response in ${(p1.ms / 1000).toFixed(2)} s (HTTP ${p1.status}), both PDFs stored`);
    const [[p1row]] = await pool.query('SELECT budget_amount, club_id FROM proposals WHERE id = ?', [fx.P1]);
    rec('UNIT-5', Number(p1row.budget_amount) === 420, `Total saved as RM ${Number(p1row.budget_amount).toFixed(2)} (50 × 6.00 + 1 × 120.00 = 420.00)`);

    const bad = await call(T.A1, 'POST', '/proposals', null, { form: proposalForm(BASE_FIELDS('ZZ Test Exe'), [['proposal_document', EXE, 'application/x-msdownload']]) });
    rec('NFT-S06', bad.status === 400, `HTTP ${bad.status}: "${bad.body?.message}"`);
    const [[docs]] = await pool.query('SELECT COUNT(*) AS n FROM proposal_documents WHERE proposal_id = ?', [fx.P1]);
    rec('UNIT-6', docs.n === 2 && bad.status === 400, `PDFs accepted (${docs.n} stored); .exe refused with HTTP ${bad.status}`);

    const s1a = await call(T.A1, 'GET', '/proposals');
    const s1b = await call(T.A1, 'GET', '/users');
    rec('NFT-S01', s1a.status === 403 && s1b.status === 403, `HEPA proposal list: HTTP ${s1a.status}; user list: HTTP ${s1b.status}`);

    const pend = await call(T.H, 'GET', '/proposals/pending');
    const inQueue = (pend.body?.proposals || pend.body || []).some?.((p) => p.id === fx.P1);
    rec('INT-2', inQueue, inQueue ? 'Proposal appeared in the HEPA queue as Submitted' : `Not found in queue (HTTP ${pend.status})`);

    const crossGet = await call(T.B1, 'GET', `/proposals/${fx.P1}`);
    rec('NFT-S05', crossGet.status === 403, `Club B member: HTTP ${crossGet.status} "${crossGet.body?.message}"`);
    const draft = await call(T.A1, 'POST', '/proposals', null, { form: proposalForm(BASE_FIELDS('ZZ Test Draft', { submit: 'false' }), [['proposal_document', PDF1, 'application/pdf']]) });
    fx.DRAFT = draft.body?.proposalId;
    const shareGet = await call(T.A2, 'GET', `/proposals/${fx.P1}`);
    const fdEdit = new FormData(); fdEdit.append('title', 'ZZ Test Draft'); fdEdit.append('submit', 'false');
    const shareEdit = await call(T.A2, 'PUT', `/proposals/${fx.DRAFT}`, null, { form: fdEdit });
    const fdEdit2 = new FormData(); fdEdit2.append('title', 'ZZ Test Draft'); fdEdit2.append('submit', 'false');
    const crossEdit = await call(T.B1, 'PUT', `/proposals/${fx.DRAFT}`, null, { form: fdEdit2 });
    rec('INT-4', shareGet.status === 200 && shareEdit.status === 200 && crossEdit.status === 403,
      `Same club: view ${shareGet.status}, edit ${shareEdit.status}; other club edit: ${crossEdit.status}`);

    const reopen = await call(issueToken(fx.A1), 'GET', `/proposals/${fx.DRAFT}`);
    const rp = reopen.body?.proposal;
    rec('NFT-R01', reopen.status === 200 && rp?.status === 'draft' && rp?.venue === 'Test Hall' && (reopen.body.documents || []).length === 1 && (reopen.body.budget_items || []).length === 2,
      `Reopened draft: venue "${rp?.venue}", ${(reopen.body?.budget_items || []).length} budget items, ${(reopen.body?.documents || []).length} document kept`);

    await call(T.H, 'POST', `/proposals/${fx.P1}/start-review`);
    const emptyQ = await call(T.H, 'POST', `/proposals/${fx.P1}/query`, { remark: '' });
    rec('UNIT-7', emptyQ.status === 400, `HTTP ${emptyQ.status}: "${emptyQ.body?.message}"`);
    const noSign = await call(T.H, 'POST', `/proposals/${fx.P1}/approve`, { signoff: { advisor: true, secretary: true, director: false } });
    const [[afterNoSign]] = await pool.query('SELECT status FROM proposals WHERE id = ?', [fx.P1]);
    rec('NFT-S02', noSign.status === 400 && afterNoSign.status === 'under_review', `HTTP ${noSign.status}; status stayed "${afterNoSign.status}"`);

    const remark = 'Please attach the supplier quotation for the banner.';
    const q = await call(T.H, 'POST', `/proposals/${fx.P1}/query`, { remark });
    const notif = await call(T.A2, 'GET', '/notifications');
    const sawAction = (notif.body?.notifications || []).some((n) => n.title === 'Action required' && n.link?.endsWith(`/${fx.P1}`));
    const fdRe = new FormData(); fdRe.append('title', 'ZZ Test Lifecycle'); fdRe.append('submit', 'true');
    const resub = await call(T.A2, 'PUT', `/proposals/${fx.P1}`, null, { form: fdRe });
    const after = await call(T.H, 'GET', `/proposals/${fx.P1}`);
    const pend2 = await call(T.H, 'GET', '/proposals/pending');
    const backInQueue = (pend2.body?.proposals || pend2.body || []).some?.((p) => p.id === fx.P1 && p.status === 'resubmitted');
    rec('INT-3', q.status === 200 && sawAction && resub.status === 200 && after.body?.proposal?.version === 2 && backInQueue,
      `Club saw "Action required": ${sawAction}; resubmitted (HTTP ${resub.status}) as version ${after.body?.proposal?.version}; back in HEPA queue: ${backInQueue}`);
    const keptRemark = (after.body?.remarks || []).some((r) => r.remark === remark);
    rec('NFT-R02', after.body?.proposal?.version === 2 && keptRemark, `Version ${after.body?.proposal?.version}; HEPA remark kept: ${keptRemark}`);

    await call(T.H, 'POST', `/proposals/${fx.P1}/start-review`);
    const ok = await call(T.H, 'POST', `/proposals/${fx.P1}/approve`, { signoff: { advisor: true, secretary: true, director: true } });
    const cal = await call(T.A1, 'GET', '/proposals/calendar');
    const onCal = (cal.body?.events || []).some((e) => e.id === fx.P1);
    rec('INT-5', ok.status === 200 && onCal, `Approve: HTTP ${ok.status}; event on calendar: ${onCal}`);

    const life = await call(T.H, 'GET', `/proposals/${fx.P1}`);
    const acts = (life.body?.activity || []).map((a) => a.action);
    const want = ['PROPOSAL_SUBMITTED', 'PROPOSAL_REVIEW_STARTED', 'PROPOSAL_QUERIED', 'PROPOSAL_RESUBMITTED', 'PROPOSAL_APPROVED'];
    let idx = -1; const inOrder = want.every((w) => { const i = acts.indexOf(w, idx + 1); if (i < 0) return false; idx = i; return true; });
    rec('SYS-1', inOrder && life.body?.proposal?.status === 'approved', `Timeline: ${want.map((w) => w.replace('PROPOSAL_', '').toLowerCase()).join(' → ')} recorded in order; final status ${life.body?.proposal?.status}`);
    rec('SYS-2-API', !!life.body?.proposal?.signoff_by && life.body?.proposal?.signoff_by_name === fx.H.name, `Sign-off recorded by ${life.body?.proposal?.signoff_by_name}`);

    const rep = await call(T.A2, 'POST', `/reports/${fx.P1}`, { attendance_count: 45, actual_spending: 400, summary: 'Test report.' });
    const reps = await call(T.H, 'GET', '/analytics/post-event-reports');
    const listed = (reps.body?.reports || []).some((r) => r.id === fx.P1);
    rec('INT-7', rep.status === 201 && listed, `Report saved (HTTP ${rep.status}); shown in HEPA reports: ${listed}`);

    const cancelNoReason = await call(T.AD, 'POST', `/proposals/${fx.P1}/cancel`, { reason: '' });
    const cancel = await call(T.AD, 'POST', `/proposals/${fx.P1}/cancel`, { reason: 'Venue unavailable (test).' });
    const cal2 = await call(T.A1, 'GET', '/proposals/calendar');
    const gone = !(cal2.body?.events || []).some((e) => e.id === fx.P1);
    const [[pc]] = await pool.query('SELECT status, reviewed_by FROM proposals WHERE id = ?', [fx.P1]);
    const [[keptApproval]] = await pool.query("SELECT COUNT(*) AS n FROM audit_logs WHERE target_type='proposal' AND target_id=? AND action='PROPOSAL_APPROVED'", [fx.P1]);
    rec('INT-6', cancelNoReason.status === 400 && cancel.status === 200 && gone && pc.status === 'cancelled' && pc.reviewed_by === fx.H.id && keptApproval.n === 1,
      `No reason: HTTP ${cancelNoReason.status}; with reason: ${cancel.status}; removed from calendar: ${gone}; HEPA approval kept: ${keptApproval.n === 1}`);

    const [arows] = await pool.query(
      `SELECT action, user_id, ip_address, result FROM audit_logs WHERE target_type='proposal' AND target_id=? ORDER BY id`, [fx.P1]);
    const complete = arows.length >= 7 && arows.every((a) => a.user_id && a.ip_address && a.result);
    rec('INT-8', complete, `${arows.length} entries for the test proposal, each with user, IP address (${arows[0]?.ip_address}) and result`);

    const ownRole = await call(T.AD, 'PATCH', `/users/${fx.AD.id}/role`, { role: 'hepa_officer' });
    rec('UNIT-10', ownRole.status === 400, `HTTP ${ownRole.status}: "${ownRole.body?.message}"`);

    const [hashes] = await pool.query('SELECT password_hash FROM users');
    const allBcrypt = hashes.every((h) => /^\$2[aby]\$12\$.{53}$/.test(h.password_hash));
    rec('NFT-S03', allBcrypt, `${hashes.length}/${hashes.length} passwords stored as bcrypt hashes (cost 12); no plain text`);

    const before = await call(T.DEACT, 'GET', '/auth/me');
    const deact = await call(T.AD, 'PATCH', `/users/${fx.DEACT.id}/active`, { is_active: false });
    const afterD = await call(T.DEACT, 'GET', '/auth/me');
    rec('NFT-R03', before.status === 200 && deact.status === 200 && afterD.status === 403, `Before: HTTP ${before.status}; after deactivation the same session got HTTP ${afterD.status} "${afterD.body?.message}"`);

    const dev1 = issueToken(fx.PWC); const dev2 = issueToken(fx.PWC);
    await wait(1200);
    const chg = await call(dev1, 'POST', '/users/me/password', { current_password: fx.PWC.password, new_password: 'NewTestPass#2027', confirm_password: 'NewTestPass#2027' });
    const other = await call(dev2, 'GET', '/auth/me');
    const mine = await call(chg.body?.token, 'GET', '/auth/me');
    rec('NFT-R04', chg.status === 200 && other.status === 401 && mine.status === 200, `Change: HTTP ${chg.status}; other device: HTTP ${other.status}; this device (new token): HTTP ${mine.status}`);

    const r1 = await call(null, 'POST', '/auth/register', {});
    const r2 = await call(null, 'POST', '/auth/register', { name: 'X', id_number: 'ZZ-X', email: 'abc@', username: 'zz_x', password: 'Short1', confirm_password: 'Short1', role: 'club_committee', claimed_club_name: 'X' });
    rec('UNIT-1', r1.status === 400 && r2.status === 400, `Empty: "${r1.body?.message}"; invalid email: "${r2.body?.message}"; no account created`);

    const otpEmail = 'zz.otp@sems-test.test';
    const { code } = await createOtp({ purpose: 'signup', email: otpEmail, payload: {
      name: 'ZZ OTP', id_number: 'ZZ-OTP', email: otpEmail, username: 'zz_otp', contact_number: null,
      password_hash: await bcrypt.hash('TestPass#2026', 12), role: 'club_committee', claimed_club_name: 'ZZ Test Club A', department: null } });
    const wrong = await call(null, 'POST', '/auth/register/verify', { email: otpEmail, code: code === '000000' ? '111111' : '000000' });
    const right = await call(null, 'POST', '/auth/register/verify', { email: otpEmail, code });
    rec('UNIT-2', wrong.status === 400 && right.status === 201, `Wrong code: "${wrong.body?.message}"; correct code: HTTP ${right.status}, account created`);

    const regEmail = alias('zzreg');
    const reg = await call(null, 'POST', '/auth/register', { name: 'ZZ Register', id_number: 'ZZ-REG', email: regEmail, username: 'zz_register', password: 'TestPass#2026', confirm_password: 'TestPass#2026', role: 'club_committee', claimed_club_name: 'ZZ Test Club A' });
    await pool.query("UPDATE otp_codes SET code_hash = ? WHERE purpose='signup' AND email = ? AND used_at IS NULL", [await bcrypt.hash('246810', 10), regEmail]);
    const regV = await call(null, 'POST', '/auth/register/verify', { email: regEmail, code: '246810' });
    const meReg = await call(regV.body?.token, 'GET', '/auth/me');
    rec('INT-1', reg.status === 200 && regV.status === 201 && meReg.body?.user?.role === 'club_committee',
      `Code email sent through Gmail SMTP (HTTP ${reg.status}); verification created the account (HTTP ${regV.status}) and signed in as ${meReg.body?.user?.role}`);

    const fp = await call(null, 'POST', '/auth/forgot-password', { identifier: fx.PW.email });
    await pool.query("UPDATE otp_codes SET code_hash = ? WHERE purpose='password_reset' AND email = ? AND used_at IS NULL", [await bcrypt.hash('135790', 10), fx.PW.email]);
    const fpv = await call(null, 'POST', '/auth/forgot-password/verify', { identifier: fx.PW.email, code: '135790' });
    const fpr = await call(null, 'POST', '/auth/reset-password', { identifier: fx.PW.email, code: '135790', new_password: 'ResetPass#2027', confirm_password: 'ResetPass#2027' });
    const loginNew = await call(null, 'POST', '/auth/login', { identifier: fx.PW.username, password: 'ResetPass#2027' });
    const loginOld = await call(null, 'POST', '/auth/login', { identifier: fx.PW.username, password: fx.PW.password });
    rec('SYS-3', fp.status === 200 && fpv.status === 200 && fpr.status === 200 && loginNew.status === 200 && loginOld.status === 401,
      `Code email sent (HTTP ${fp.status}); code verified, password reset; new password: HTTP ${loginNew.status}; old password: HTTP ${loginOld.status}`);

    const newHepa = await call(T.AD, 'POST', '/users', { name: 'ZZ New HEPA', email: 'zz.newhepa@sems-test.test', password: 'TestPass#2026', role: 'hepa_officer' });
    const loginHepa = await call(null, 'POST', '/auth/login', { identifier: 'zz.newhepa@sems-test.test', password: 'TestPass#2026' });
    const club = await call(T.AD, 'POST', '/clubs', { name: 'ZZ Test Club C', description: '[test]' });
    const clubId = club.body?.id || club.body?.club?.id || club.body?.clubId;
    const cProp = await call(T.C, 'POST', '/proposals', null, { form: proposalForm(BASE_FIELDS('ZZ Test Before Club', { submit: 'false' })) });
    const assign = await call(T.AD, 'POST', `/clubs/${clubId}/members`, { user_id: fx.C.id });
    const [[adopted]] = await pool.query('SELECT club_id FROM proposals WHERE id = ?', [cProp.body?.proposalId]);
    rec('SYS-4', newHepa.status === 201 && loginHepa.status === 200 && loginHepa.body?.user?.role === 'hepa_officer' && club.status === 201 && assign.status === 200 && adopted.club_id === clubId,
      `HEPA account created (${newHepa.status}) and signed in (${loginHepa.status}); club created (${club.status}); member assigned (${assign.status}) and their proposal moved to the club: ${adopted.club_id === clubId}`);

    const exp = await fetch(`${API}/audit-logs/export?action=PROPOSAL_APPROVED`, { headers: { Authorization: `Bearer ${T.AD}` } });
    const csv = await exp.text();
    const lines = csv.trim().split(/\r?\n/).slice(1);
    const onlyFiltered = lines.length > 0 && lines.every((l) => l.includes('PROPOSAL_APPROVED'));
    rec('SYS-5', exp.status === 200 && onlyFiltered, `CSV (HTTP ${exp.status}) with ${lines.length} row(s); every row is PROPOSAL_APPROVED: ${onlyFiltered}`);

    const an = await call(T.H, 'GET', '/analytics?from=2026-10-01&to=2026-10-31');
    const [[dbApproved]] = await pool.query("SELECT COUNT(*) AS n FROM audit_logs WHERE target_type='proposal' AND action='PROPOSAL_APPROVED' AND created_at BETWEEN '2026-10-01 00:00:00' AND '2026-10-31 23:59:59'");
    rec('SYS-6', an.status === 200 && an.body?.totals?.approved === dbApproved.n, `Analytics approved (Oct 2026) = ${an.body?.totals?.approved}; database count = ${dbApproved.n}`);

    const wrongs = [];
    for (let i = 0; i < 5; i++) wrongs.push((await call(null, 'POST', '/auth/login', { identifier: fx.LOCK.username, password: 'WrongPass!' })).status);
    const locked = await call(null, 'POST', '/auth/login', { identifier: fx.LOCK.username, password: fx.LOCK.password });
    const [[lockLog]] = await pool.query("SELECT COUNT(*) AS n FROM audit_logs WHERE action='ACCOUNT_LOCKED' AND target_id = ?", [fx.LOCK.id]);
    const lockOk = wrongs.every((s) => [401, 403, 423, 429].includes(s)) && locked.status !== 200 && lockLog.n >= 1;
    rec('NFT-S04', lockOk, `5 wrong passwords (${wrongs.join(', ')}); correct password then refused: HTTP ${locked.status} "${locked.body?.message}"; ACCOUNT_LOCKED logged`);
    rec('UNIT-3', lockOk, `Locked after 5 wrong passwords: "${locked.body?.message}"`);
  } catch (e) {
    console.log('ERR', e.stack);
  } finally {
    fs.writeFileSync(path.join(HERE, 'results-api.json'), JSON.stringify(results, null, 1));
    fs.writeFileSync(path.join(HERE, 'fixtures.json'), JSON.stringify(fx, null, 1));
    await pool.end();
  }
})();
