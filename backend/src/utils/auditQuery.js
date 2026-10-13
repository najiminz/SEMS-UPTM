const ROLE_LABEL = {
  club_committee: 'Club Committee',
  hepa_officer: 'HEPA Officer',
  admin: 'Administrator',
};

const MODULES = [
  { name: 'Authentication', like: ['LOGIN_%', 'LOGOUT', 'ACCOUNT_LOCKED', 'PASSWORD_%', 'EMAIL_%', 'REGISTRATION_%'] },
  { name: 'Proposals', like: ['PROPOSAL_%'] },
  { name: 'Reports', like: ['POST_EVENT_%'] },
  { name: 'Users', like: ['USER_%', 'ADMIN_%'] },
  { name: 'Clubs', like: ['CLUB_%'] },
  { name: 'Settings', like: ['SYSTEM_%'] },
];

const toRegExp = (pattern) => new RegExp(`^${pattern.replace(/%/g, '.*')}$`);
const MODULE_TESTS = MODULES.map((m) => ({ name: m.name, tests: m.like.map(toRegExp) }));

function moduleOf(action) {
  return MODULE_TESTS.find((m) => m.tests.some((t) => t.test(action)))?.name || 'System';
}

const MODULE_NAMES = MODULES.map((m) => m.name);

function moduleCondition(moduleName) {
  const mod = MODULES.find((m) => m.name === moduleName);
  if (!mod) return null;
  return {
    sql: `(${mod.like.map(() => 'a.action LIKE ?').join(' OR ')})`,
    params: mod.like,
  };
}

const AUDIT_SELECT = `
  a.id, a.user_id, a.action, a.target_type, a.target_id, a.details, a.ip_address,
  a.user_agent, a.result, a.created_at,
  u.name AS user_name, u.email AS user_email, u.role AS user_role,
  p.title AS proposal_title, p.created_at AS proposal_created_at,
  COALESCE(pc.name, pu.name) AS proposal_club,
  tu.name AS target_user_name, tu.role AS target_user_role,
  cc.name AS target_club_name`;

const AUDIT_JOINS = `
  FROM audit_logs a
  LEFT JOIN users u ON u.id = a.user_id
  LEFT JOIN proposals p ON a.target_type = 'proposal' AND p.id = a.target_id
  LEFT JOIN users pu ON pu.id = p.submitted_by
  LEFT JOIN clubs pc ON pc.id = pu.club_id
  LEFT JOIN users tu ON a.target_type = 'user' AND tu.id = a.target_id
  LEFT JOIN clubs cc ON a.target_type = 'club' AND cc.id = a.target_id`;

function proposalCode(id, createdAt) {
  const year = createdAt ? new Date(createdAt.replace(' ', 'T')).getFullYear() : new Date().getFullYear();
  return `SEMS-${year}-${String(id).padStart(3, '0')}`;
}

function parseDetails(raw) {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function describeTarget(row) {
  const { target_type: type, target_id: id } = row;
  if (!type || id == null) return { label: '—', detail: null };

  if (type === 'proposal') {
    return row.proposal_title
      ? { label: proposalCode(id, row.proposal_created_at), detail: row.proposal_title }
      : { label: `Proposal #${id}`, detail: 'No longer exists' };
  }
  if (type === 'user') {
    return row.target_user_name
      ? { label: row.target_user_name, detail: `User #${id}` }
      : { label: `User #${id}`, detail: 'No longer exists' };
  }
  if (type === 'club') {
    return row.target_club_name
      ? { label: row.target_club_name, detail: `Club #${id}` }
      : { label: `Club #${id}`, detail: 'No longer exists' };
  }
  const pretty = type.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
  return { label: `${pretty} #${id}`, detail: null };
}

function buildAuditRow(row) {
  const target = describeTarget(row);
  return {
    id: row.id,
    created_at: row.created_at,
    user_id: row.user_id,
    user_name: row.user_name,
    user_email: row.user_email,
    user_role: row.user_role,
    action: row.action,
    module: moduleOf(row.action),
    target_type: row.target_type,
    target_id: row.target_id,
    target_label: target.label,
    target_detail: target.detail,
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    result: row.result,
    details: parseDetails(row.details),
    subject:
      row.target_type === 'proposal' && row.proposal_title ? row.proposal_club
        : row.target_type === 'user' && row.target_user_role ? ROLE_LABEL[row.target_user_role]
        : row.target_type === 'club' && row.target_club_name ? row.target_club_name
        : ROLE_LABEL[row.user_role] || 'System',
  };
}

function buildAuditFilters(query) {
  const { search, action, user_id: userId, role, module: moduleName, result, from, to } = query;
  const where = [];
  const params = [];

  if (search) {
    where.push('(u.name LIKE ? OR u.email LIKE ? OR a.action LIKE ? OR a.ip_address LIKE ?)');
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }
  if (action) {
    where.push('a.action = ?');
    params.push(action);
  }
  if (userId) {
    where.push('a.user_id = ?');
    params.push(userId);
  }
  if (role) {
    where.push('u.role = ?');
    params.push(role);
  }
  if (moduleName) {
    const cond = moduleCondition(moduleName);
    if (cond) {
      where.push(cond.sql);
      params.push(...cond.params);
    }
  }
  if (result && ['success', 'failure', 'blocked'].includes(result)) {
    where.push('a.result = ?');
    params.push(result);
  }
  if (from) {
    where.push('a.created_at >= ?');
    params.push(from);
  }
  if (to) {
    where.push('a.created_at <= ?');
    params.push(`${to} 23:59:59`);
  }
  return { whereClause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

module.exports = {
  ROLE_LABEL, MODULE_NAMES, moduleOf, AUDIT_SELECT, AUDIT_JOINS, buildAuditRow, buildAuditFilters, proposalCode,
};
