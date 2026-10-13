const pool = require('../config/db');
const {
  MODULE_NAMES, AUDIT_SELECT, AUDIT_JOINS, buildAuditRow, buildAuditFilters,
} = require('../utils/auditQuery');
const { toCsv } = require('../utils/csv');

const EXPORT_LIMIT = 5000;

async function listAuditLogs(req, res) {
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 25, 200);
  const offset = (page - 1) * limit;
  const { whereClause, params } = buildAuditFilters(req.query);

  const [rows] = await pool.query(
    `SELECT ${AUDIT_SELECT} ${AUDIT_JOINS} ${whereClause}
     ORDER BY a.created_at DESC, a.id DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id ${whereClause}`,
    params
  );

  res.json({ logs: rows.map(buildAuditRow), page, limit, total });
}

async function getAuditFacets(req, res) {
  const [users] = await pool.query(
    `SELECT DISTINCT u.id, u.name FROM audit_logs a JOIN users u ON u.id = a.user_id ORDER BY u.name ASC`
  );
  const [actions] = await pool.query('SELECT DISTINCT action FROM audit_logs ORDER BY action ASC');
  res.json({ users, actions: actions.map((a) => a.action), modules: MODULE_NAMES });
}

async function exportAuditLogs(req, res) {
  const { whereClause, params } = buildAuditFilters(req.query);
  const [rows] = await pool.query(
    `SELECT ${AUDIT_SELECT} ${AUDIT_JOINS} ${whereClause}
     ORDER BY a.created_at DESC, a.id DESC LIMIT ?`,
    [...params, EXPORT_LIMIT]
  );

  const csv = toCsv(
    ['Timestamp', 'User', 'Email', 'Role', 'Action', 'Module', 'Target', 'Target detail', 'IP address', 'Result'],
    rows.map(buildAuditRow).map((r) => [
      r.created_at, r.user_name || 'System', r.user_email, r.user_role, r.action, r.module,
      r.target_label, r.target_detail, r.ip_address, r.result,
    ])
  );

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="sems-audit-log-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(`﻿${csv}`);
}

module.exports = { listAuditLogs, getAuditFacets, exportAuditLogs };
