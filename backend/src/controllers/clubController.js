const pool = require('../config/db');
const { logAction } = require('../utils/auditLogger');

async function listClubs(req, res) {
  const { search, status } = req.query;
  const where = [];
  const params = [];
  if (search) {
    where.push('c.name LIKE ?');
    params.push(`%${search}%`);
  }
  if (status) {
    where.push('c.status = ?');
    params.push(status);
  }
  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const [clubs] = await pool.query(
    `SELECT c.*,
       (SELECT COUNT(*) FROM users u WHERE u.club_id = c.id) AS member_count,
       (SELECT COUNT(*) FROM proposals p JOIN users u ON u.id = p.submitted_by WHERE COALESCE(p.club_id, u.club_id) = c.id AND p.status <> 'draft') AS proposal_count
     FROM clubs c ${whereClause} ORDER BY c.name ASC`,
    params
  );
  res.json({ clubs });
}

async function getClub(req, res) {
  const { id } = req.params;
  const [clubs] = await pool.query('SELECT * FROM clubs WHERE id = ?', [id]);
  const club = clubs[0];
  if (!club) return res.status(404).json({ message: 'Club not found' });

  const [members] = await pool.query(
    'SELECT id, name, email, status FROM users WHERE club_id = ? ORDER BY name ASC',
    [id]
  );
  const [proposals] = await pool.query(
    `SELECT p.id, p.title, p.status, p.event_date, u.name AS submitted_by_name
     FROM proposals p JOIN users u ON u.id = p.submitted_by
     WHERE COALESCE(p.club_id, u.club_id) = ? AND p.status <> 'draft' ORDER BY p.created_at DESC`,
    [id]
  );

  res.json({ club, members, proposals });
}

async function createClub(req, res) {
  const { name, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Club name is required' });

  const [existing] = await pool.query('SELECT id FROM clubs WHERE name = ?', [name]);
  if (existing.length > 0) return res.status(409).json({ message: 'A club with this name already exists' });

  const [result] = await pool.query('INSERT INTO clubs (name, description) VALUES (?, ?)', [name, description || null]);
  await logAction({ userId: req.user.id, action: 'CLUB_CREATED', targetType: 'club', targetId: result.insertId, details: { name } });
  res.status(201).json({ message: 'Club created', clubId: result.insertId });
}

async function updateClub(req, res) {
  const { id } = req.params;
  const { name, description } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ message: 'Club name is required' });

  await pool.query('UPDATE clubs SET name = ?, description = ? WHERE id = ?', [name, description || null, id]);
  await logAction({ userId: req.user.id, action: 'CLUB_UPDATED', targetType: 'club', targetId: id });
  res.json({ message: 'Club updated' });
}

async function setClubStatus(req, res) {
  const { id } = req.params;
  const { status } = req.body;
  if (!['active', 'inactive'].includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  await pool.query('UPDATE clubs SET status = ? WHERE id = ?', [status, id]);
  await logAction({
    userId: req.user.id,
    action: status === 'active' ? 'CLUB_ACTIVATED' : 'CLUB_DEACTIVATED',
    targetType: 'club',
    targetId: id,
  });
  res.json({ message: 'Club status updated' });
}

async function assignMember(req, res) {
  const { id } = req.params;
  const { user_id } = req.body;

  const [users] = await pool.query('SELECT id, role FROM users WHERE id = ?', [user_id]);
  const user = users[0];
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (user.role !== 'club_committee') {
    return res.status(400).json({ message: 'Only Club Committee accounts can be assigned to a club' });
  }

  await pool.query('UPDATE users SET club_id = ? WHERE id = ?', [id, user_id]);
  await pool.query('UPDATE proposals SET club_id = ? WHERE submitted_by = ? AND club_id IS NULL', [id, user_id]);
  await logAction({ userId: req.user.id, action: 'CLUB_MEMBER_ASSIGNED', targetType: 'club', targetId: id, details: { user_id } });
  res.json({ message: 'Member assigned to club' });
}

async function removeMember(req, res) {
  const { id, userId } = req.params;
  await pool.query('UPDATE users SET club_id = NULL WHERE id = ? AND club_id = ?', [userId, id]);
  await logAction({ userId: req.user.id, action: 'CLUB_MEMBER_REMOVED', targetType: 'club', targetId: id, details: { user_id: userId } });
  res.json({ message: 'Member removed from club' });
}

async function deleteClub(req, res) {
  const { id } = req.params;
  const [clubs] = await pool.query('SELECT id, name FROM clubs WHERE id = ?', [id]);
  if (!clubs[0]) return res.status(404).json({ message: 'Club not found' });

  const [[{ proposal_count }]] = await pool.query(
    `SELECT COUNT(*) AS proposal_count FROM proposals p JOIN users u ON u.id = p.submitted_by WHERE COALESCE(p.club_id, u.club_id) = ?`,
    [id]
  );
  if (proposal_count > 0) {
    return res.status(400).json({
      message: 'This club has proposal history and cannot be deleted. Deactivate it instead.',
    });
  }

  await pool.query('DELETE FROM clubs WHERE id = ?', [id]);
  await logAction({ userId: req.user.id, action: 'CLUB_DELETED', targetType: 'club', targetId: id, details: { name: clubs[0].name } });
  res.json({ message: 'Club deleted' });
}

module.exports = {
  listClubs, getClub, createClub, updateClub, setClubStatus, assignMember, removeMember, deleteClub,
};
