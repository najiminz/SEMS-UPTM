const fs = require('fs');
const path = require('path');
const backend = 'C:/Users/najim/Documents/SEMS-UPTM/backend';
require(path.join(backend, 'node_modules/dotenv')).config({ path: path.join(backend, '.env'), quiet: true });
const pool = require(path.join(backend, 'src/config/db'));
const [gUser, gDomain] = process.env.GMAIL_USER.split('@');

(async () => {
  try {
    const [users] = await pool.query(
      "SELECT id, email FROM users WHERE email LIKE '%@sems-test.test' OR email IN (?, ?) OR username LIKE 'zz\\_%'",
      [`${gUser}+zzreg@${gDomain}`, `${gUser}+zzpw@${gDomain}`]
    );
    const ids = users.map((u) => u.id);
    if (ids.length) {
      const [props] = await pool.query('SELECT id FROM proposals WHERE submitted_by IN (?)', [ids]);
      const pids = props.map((p) => p.id);
      if (pids.length) {
        const [docs] = await pool.query('SELECT stored_name FROM proposal_documents WHERE proposal_id IN (?)', [pids]);
        await pool.query("DELETE FROM audit_logs WHERE target_type = 'proposal' AND target_id IN (?)", [pids]);
        await pool.query('DELETE FROM proposals WHERE id IN (?)', [pids]);
        docs.forEach((d) => { const f = path.join(backend, 'uploads', path.basename(d.stored_name)); if (fs.existsSync(f)) fs.unlinkSync(f); });
        console.log('proposals removed:', pids.length, '| files removed:', docs.length);
      }
      await pool.query('UPDATE proposals SET reviewed_by = NULL WHERE reviewed_by IN (?)', [ids]);
      await pool.query('UPDATE proposals SET signoff_by = NULL WHERE signoff_by IN (?)', [ids]);
      await pool.query('UPDATE proposals SET cancelled_by = NULL WHERE cancelled_by IN (?)', [ids]);
      await pool.query('DELETE FROM proposal_remarks WHERE hepa_officer_id IN (?)', [ids]);
      await pool.query('DELETE FROM post_event_reports WHERE submitted_by IN (?)', [ids]);
      await pool.query("DELETE FROM audit_logs WHERE user_id IN (?) OR (target_type = 'user' AND target_id IN (?))", [ids, ids]);
      await pool.query('DELETE FROM otp_codes WHERE user_id IN (?) OR email IN (?)', [ids, users.map((u) => u.email)]);
      await pool.query('DELETE FROM users WHERE id IN (?)', [ids]);
    }
    await pool.query("DELETE FROM otp_codes WHERE email LIKE '%@sems-test.test' OR email LIKE ?", [`${gUser}+zz%@${gDomain}`]);
    const [clubs] = await pool.query("SELECT id FROM clubs WHERE name LIKE 'ZZ Test Club%'");
    if (clubs.length) {
      await pool.query("DELETE FROM audit_logs WHERE target_type = 'club' AND target_id IN (?)", [clubs.map((c) => c.id)]);
      await pool.query("DELETE FROM clubs WHERE name LIKE 'ZZ Test Club%'");
    }
    console.log('users removed:', ids.length, '| clubs removed:', clubs.length);
    const [left] = await pool.query('SELECT id, name, email, role FROM users ORDER BY id');
    console.table(left);
    const [[p]] = await pool.query('SELECT COUNT(*) AS n FROM proposals');
    const [c] = await pool.query('SELECT name FROM clubs');
    console.log('proposals left:', p.n, '| clubs:', c.map((x) => x.name).join(', '));
  } catch (e) {
    console.log('ERR', e.message);
  } finally {
    await pool.end();
  }
})();
