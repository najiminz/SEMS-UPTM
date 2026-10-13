const pool = require('../config/db');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_MONTHS = 36;

const pad = (n) => String(n).padStart(2, '0');
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const round2 = (n) => Math.round(Number(n) * 100) / 100;

function resolveRange(query) {
  const today = new Date();
  const defaultFrom = isoDate(new Date(today.getFullYear(), today.getMonth() - 5, 1));
  const from = DATE_RE.test(query.from || '') ? query.from : defaultFrom;
  const to = DATE_RE.test(query.to || '') ? query.to : isoDate(today);
  if (from > to) return { error: 'The start date must be before the end date.' };

  const months = [];
  const cursor = new Date(`${from.slice(0, 7)}-01T00:00:00`);
  const last = new Date(`${to.slice(0, 7)}-01T00:00:00`);
  while (cursor <= last) {
    months.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}`);
    cursor.setMonth(cursor.getMonth() + 1);
  }
  if (months.length > MAX_MONTHS) return { error: `Please choose a range of ${MAX_MONTHS} months or less.` };
  return { from, to, months };
}

const SUBMITTED_ROWS = `
  SELECT p.id, p.event_type, p.budget_amount,
         COALESCE(s.submitted_at, p.created_at) AS submitted_at
  FROM proposals p
  LEFT JOIN (
    SELECT target_id, MIN(created_at) AS submitted_at FROM audit_logs
    WHERE target_type = 'proposal' AND action = 'PROPOSAL_SUBMITTED' GROUP BY target_id
  ) s ON s.target_id = p.id
  WHERE p.status <> 'draft'`;

async function getAnalytics(req, res) {
  const range = resolveRange(req.query);
  if (range.error) return res.status(400).json({ message: range.error });
  const { from, to, months } = range;
  const bounds = [`${from} 00:00:00`, `${to} 23:59:59`];

  const [submitted] = await pool.query(
    `SELECT DATE_FORMAT(t.submitted_at, '%Y-%m') AS month, COUNT(*) AS proposals,
            COALESCE(SUM(t.budget_amount), 0) AS budget
     FROM (${SUBMITTED_ROWS}) t
     WHERE t.submitted_at BETWEEN ? AND ?
     GROUP BY month`,
    bounds
  );
  const [decisions] = await pool.query(
    `SELECT DATE_FORMAT(created_at, '%Y-%m') AS month,
            SUM(action = 'PROPOSAL_APPROVED') AS approved, SUM(action = 'PROPOSAL_REJECTED') AS rejected
     FROM audit_logs
     WHERE target_type = 'proposal' AND action IN ('PROPOSAL_APPROVED', 'PROPOSAL_REJECTED')
       AND created_at BETWEEN ? AND ?
     GROUP BY month`,
    bounds
  );
  const [categories] = await pool.query(
    `SELECT t.event_type AS type, COUNT(*) AS count
     FROM (${SUBMITTED_ROWS}) t
     WHERE t.submitted_at BETWEEN ? AND ?
     GROUP BY t.event_type ORDER BY count DESC`,
    bounds
  );

  const submittedBy = new Map(submitted.map((r) => [r.month, r]));
  const decidedBy = new Map(decisions.map((r) => [r.month, r]));
  const series = months.map((month) => ({
    month,
    proposals: Number(submittedBy.get(month)?.proposals || 0),
    budget: round2(submittedBy.get(month)?.budget || 0),
    approved: Number(decidedBy.get(month)?.approved || 0),
    rejected: Number(decidedBy.get(month)?.rejected || 0),
  }));

  const sum = (key) => series.reduce((total, m) => total + m[key], 0);
  const approved = sum('approved');
  const rejected = sum('rejected');

  res.json({
    range: { from, to },
    months: series,
    categories: categories.map((c) => ({ type: c.type, count: Number(c.count) })),
    totals: {
      proposals: sum('proposals'),
      budget: round2(sum('budget')),
      approved,
      rejected,
      approvalRate: approved + rejected > 0 ? approved / (approved + rejected) : null,
    },
  });
}

async function listPostEventReports(req, res) {
  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.event_date, p.budget_amount, r.attendance_count, r.actual_spending,
            r.summary, r.created_at AS reported_at, COALESCE(c.name, u.name) AS club_name
     FROM post_event_reports r
     JOIN proposals p ON p.id = r.proposal_id
     JOIN users u ON u.id = p.submitted_by
     LEFT JOIN clubs c ON c.id = COALESCE(p.club_id, u.club_id)
     ORDER BY r.created_at DESC LIMIT 200`
  );
  res.json({ reports: rows });
}

module.exports = { getAnalytics, listPostEventReports };
