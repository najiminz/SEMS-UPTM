const fs = require('fs');
const path = require('path');
const pool = require('../config/db');
const { logAction } = require('../utils/auditLogger');
const { canManageProposal } = require('../utils/proposalAccess');
const { PENDING_STATUSES } = require('../utils/proposalStatus');

const ARCHIVE_DELETE_AFTER_DAYS = 30;
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

const EVENT_TYPES = ['academic', 'sports', 'cultural', 'workshop', 'competition', 'other'];
const EDITABLE_STATUSES = ['draft', 'queries'];
const MAX_BUDGET_ITEMS = 50;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

const TEXT_FIELDS = {
  title: [200, 'Event name'],
  description: [5000, 'Description'],
  objective: [5000, 'Objective'],
  target_participants: [255, 'Target participants'],
  venue: [200, 'Venue'],
  contact_person: [150, 'Applicant name'],
  contact_info: [150, 'Phone number'],
  organizer_name: [150, 'Organiser'],
  applicant_id_number: [30, 'Applicant ID'],
  applicant_ic_number: [20, 'IC number'],
  applicant_position: [100, 'Position'],
};

function isTrue(value) {
  return value === true || value === 'true' || value === '1';
}

function todayString() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function unlinkStored(storedName) {
  fs.unlink(path.join(UPLOAD_DIR, storedName), () => {});
}

function discardUploads(files) {
  for (const list of Object.values(files || {})) {
    for (const file of list) unlinkStored(file.filename);
  }
}

function parseFields(body) {
  const values = {};

  for (const [key, [max, label]] of Object.entries(TEXT_FIELDS)) {
    if (body[key] === undefined) continue;
    const v = String(body[key]).trim();
    if (v.length > max) return { error: `${label} is too long (maximum ${max} characters).` };
    values[key] = v === '' ? null : v;
  }

  if (body.event_type !== undefined && body.event_type !== '') {
    if (!EVENT_TYPES.includes(body.event_type)) return { error: 'Please choose a valid event type.' };
    values.event_type = body.event_type;
  }

  if (body.event_date !== undefined) {
    const v = String(body.event_date).trim();
    if (v !== '' && !DATE_RE.test(v)) return { error: 'Event date is not a valid date.' };
    values.event_date = v || null;
  }

  for (const key of ['event_time', 'end_time']) {
    if (body[key] === undefined) continue;
    const v = String(body[key]).trim();
    if (v !== '' && !TIME_RE.test(v)) return { error: 'Start and end times must be valid times.' };
    values[key] = v || null;
  }

  if (body.estimated_participants !== undefined) {
    const v = String(body.estimated_participants).trim();
    if (v === '') {
      values.estimated_participants = null;
    } else {
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0 || n > 1_000_000) {
        return { error: 'Estimated participants must be a whole number.' };
      }
      values.estimated_participants = n;
    }
  }

  return { values };
}

const round2 = (n) => Math.round(n * 100) / 100;

function parseBudgetItems(raw) {
  if (raw === undefined) return { items: undefined };

  let list;
  try {
    list = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { error: 'Budget items could not be read. Please try again.' };
  }
  if (!Array.isArray(list)) return { error: 'Budget items could not be read. Please try again.' };
  if (list.length > MAX_BUDGET_ITEMS) return { error: `A budget can have at most ${MAX_BUDGET_ITEMS} items.` };

  const items = [];
  for (const [index, row] of list.entries()) {
    const item = String(row?.item ?? '').trim();
    const description = String(row?.description ?? '').trim();
    const priceBlank = row?.unit_price === '' || row?.unit_price == null;
    if (!item && !description && priceBlank) continue;

    const label = `Budget row ${items.length + 1}`;
    if (!item) return { error: `${label}: enter an item name.` };
    if (item.length > 200) return { error: `${label}: item name is too long.` };
    if (description.length > 500) return { error: `${label}: description is too long.` };

    const quantity = Number(row.quantity);
    const unitPrice = priceBlank ? 0 : Number(row.unit_price);
    if (!Number.isFinite(quantity) || quantity <= 0 || quantity > 1_000_000) {
      return { error: `${label}: quantity must be greater than zero.` };
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0 || unitPrice > 10_000_000) {
      return { error: `${label}: unit price must be zero or more.` };
    }
    items.push({ item, description: description || null, quantity: round2(quantity), unit_price: round2(unitPrice) });
  }

  const total = round2(items.reduce((sum, i) => sum + round2(i.quantity * i.unit_price), 0));
  return { items, total };
}

function validateForSubmit(p) {
  if (!p.title) return 'Event name is required.';
  if (!p.event_type) return 'Please choose an event type.';
  if (!p.event_date) return 'Event date is required.';
  if (p.event_date < todayString()) return 'The event date has already passed. Please choose a future date.';
  if (!p.venue) return 'Venue is required.';
  if (p.event_time && p.end_time && p.end_time <= p.event_time) return 'The end time must be after the start time.';
  return null;
}

async function replaceBudgetItems(proposalId, items) {
  await pool.query('DELETE FROM proposal_budget_items WHERE proposal_id = ?', [proposalId]);
  if (items.length === 0) return;
  await pool.query(
    'INSERT INTO proposal_budget_items (proposal_id, item, description, quantity, unit_price, sort_order) VALUES ?',
    [items.map((i, idx) => [proposalId, i.item, i.description, i.quantity, i.unit_price, idx])]
  );
}

async function saveDocuments(proposalId, files) {
  const groups = [
    { field: 'proposal_document', type: 'proposal', replace: true },
    { field: 'budget_document', type: 'budget', replace: true },
    { field: 'supporting_documents', type: 'supporting', replace: false },
  ];

  for (const { field, type, replace } of groups) {
    const incoming = files?.[field] || [];
    if (incoming.length === 0) continue;

    if (replace) {
      const [old] = await pool.query(
        'SELECT stored_name FROM proposal_documents WHERE proposal_id = ? AND document_type = ?',
        [proposalId, type]
      );
      if (old.length > 0) {
        await pool.query('DELETE FROM proposal_documents WHERE proposal_id = ? AND document_type = ?', [proposalId, type]);
        old.forEach((d) => unlinkStored(d.stored_name));
      }
    }

    for (const file of incoming) {
      await pool.query(
        `INSERT INTO proposal_documents (proposal_id, stored_name, original_name, mime_type, file_size, document_type)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [proposalId, file.filename, file.originalname, file.mimetype, file.size, type]
      );
    }
  }
}

async function createProposal(req, res) {
  const submit = req.body.submit === undefined ? true : isTrue(req.body.submit);

  const parsed = parseFields(req.body);
  const budget = parseBudgetItems(req.body.budget_items);
  let error = parsed.error || budget.error;

  const values = { event_type: 'other', ...parsed.values };
  if (!error && !values.title) error = 'Event name is required, even for a draft.';
  if (!error && submit) error = validateForSubmit(values);
  if (error) {
    discardUploads(req.files);
    return res.status(400).json({ message: error });
  }

  const budgetAmount = budget.items ? budget.total : Number(req.body.budget_amount) || 0;
  const [result] = await pool.query('INSERT INTO proposals SET ?', [
    { ...values, submitted_by: req.user.id, club_id: req.user.club_id ?? null, budget_amount: budgetAmount, status: submit ? 'submitted' : 'draft' },
  ]);
  const proposalId = result.insertId;

  if (budget.items) await replaceBudgetItems(proposalId, budget.items);
  await saveDocuments(proposalId, req.files);
  if (submit) {
    await logAction({ userId: req.user.id, action: 'PROPOSAL_SUBMITTED', targetType: 'proposal', targetId: proposalId });
  }

  res.status(201).json({
    message: submit ? 'Proposal submitted successfully' : 'Draft saved',
    proposalId,
    status: submit ? 'submitted' : 'draft',
  });
}

async function updateProposal(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM proposals WHERE id = ?', [id]);
  const proposal = rows[0];

  const fail = (status, message) => {
    discardUploads(req.files);
    return res.status(status).json({ message });
  };

  if (!proposal) return fail(404, 'Proposal not found');
  if (!canManageProposal(req.user, proposal)) return fail(403, "You can only edit your club's proposals");
  if (!EDITABLE_STATUSES.includes(proposal.status)) {
    return fail(400, 'Only drafts and proposals that HEPA has sent back for changes can be edited.');
  }

  const submit = isTrue(req.body.submit);
  if (proposal.status === 'queries' && !submit) {
    return fail(400, 'A proposal sent back by HEPA has to be resubmitted, not saved as a draft.');
  }

  const parsed = parseFields(req.body);
  const budget = parseBudgetItems(req.body.budget_items);
  let error = parsed.error || budget.error;

  const merged = { ...proposal, ...parsed.values };
  if (merged.event_date) merged.event_date = String(merged.event_date).slice(0, 10);
  for (const key of ['event_time', 'end_time']) {
    if (merged[key]) merged[key] = String(merged[key]).slice(0, 8);
  }
  if (!error && !merged.title) error = 'Event name is required.';
  if (!error && submit) error = validateForSubmit(merged);
  if (error) return fail(400, error);

  const update = { ...parsed.values };
  if (budget.items) update.budget_amount = budget.total;
  if (submit) {
    update.status = proposal.status === 'queries' ? 'resubmitted' : 'submitted';
    if (proposal.status === 'queries') update.version = proposal.version + 1;
  }
  if (Object.keys(update).length > 0) {
    await pool.query('UPDATE proposals SET ? WHERE id = ?', [update, id]);
  }

  if (budget.items) await replaceBudgetItems(id, budget.items);
  await saveDocuments(id, req.files);

  if (submit) {
    await logAction({
      userId: req.user.id,
      action: proposal.status === 'queries' ? 'PROPOSAL_RESUBMITTED' : 'PROPOSAL_SUBMITTED',
      targetType: 'proposal',
      targetId: id,
    });
  }

  res.json({
    message: submit ? 'Proposal submitted' : 'Draft saved',
    status: update.status || proposal.status,
  });
}

async function deleteDraft(req, res) {
  const { id } = req.params;
  const [rows] = await pool.query('SELECT * FROM proposals WHERE id = ?', [id]);
  const proposal = rows[0];
  if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
  if (!canManageProposal(req.user, proposal)) {
    return res.status(403).json({ message: "You can only delete your club's drafts" });
  }
  if (proposal.status !== 'draft') {
    return res.status(400).json({ message: 'Only drafts can be deleted. Submitted proposals are kept on record.' });
  }

  const [docs] = await pool.query('SELECT stored_name FROM proposal_documents WHERE proposal_id = ?', [id]);
  await pool.query('DELETE FROM proposals WHERE id = ?', [id]);
  docs.forEach((d) => unlinkStored(d.stored_name));
  res.json({ message: 'Draft deleted' });
}

async function deleteDocument(req, res) {
  const { id, documentId } = req.params;
  const [rows] = await pool.query(
    `SELECT d.*, p.submitted_by, p.club_id, p.status FROM proposal_documents d
     JOIN proposals p ON p.id = d.proposal_id WHERE d.id = ? AND d.proposal_id = ?`,
    [documentId, id]
  );
  const doc = rows[0];
  if (!doc) return res.status(404).json({ message: 'Document not found' });
  if (!canManageProposal(req.user, doc)) {
    return res.status(403).json({ message: "You can only remove documents from your club's proposals" });
  }
  if (!EDITABLE_STATUSES.includes(doc.status)) {
    return res.status(400).json({ message: 'Documents can only be removed while the proposal is a draft or awaiting changes.' });
  }

  await pool.query('DELETE FROM proposal_documents WHERE id = ?', [documentId]);
  unlinkStored(doc.stored_name);
  if (doc.status !== 'draft') {
    await logAction({
      userId: req.user.id,
      action: 'PROPOSAL_DOCUMENT_REMOVED',
      targetType: 'proposal',
      targetId: id,
      details: { file: doc.original_name },
    });
  }
  res.json({ message: 'Document removed' });
}

async function listMyProposals(req, res) {
  const [rows] = await pool.query(
    `SELECT p.*, u.name AS submitted_by_name,
       (SELECT MIN(a.created_at) FROM audit_logs a
         WHERE a.target_type = 'proposal' AND a.target_id = p.id AND a.action = 'PROPOSAL_SUBMITTED') AS submitted_at_log,
       EXISTS(SELECT 1 FROM post_event_reports r WHERE r.proposal_id = p.id) AS has_report
     FROM proposals p JOIN users u ON u.id = p.submitted_by
     WHERE p.submitted_by = ? OR (p.club_id IS NOT NULL AND p.club_id = ?)
     ORDER BY p.updated_at DESC`,
    [req.user.id, req.user.club_id ?? null]
  );
  const proposals = rows.map(({ submitted_at_log, has_report, ...p }) => ({
    ...p,
    submitted_at: submitted_at_log || (p.status === 'draft' ? null : p.created_at),
    has_report: Boolean(has_report),
  }));
  res.json({ proposals });
}

async function listPendingProposals(req, res) {
  const [rows] = await pool.query(
    `SELECT p.*, u.name AS submitted_by_name
     FROM proposals p
     JOIN users u ON u.id = p.submitted_by
     WHERE p.status IN (?)
     ORDER BY p.created_at ASC`,
    [PENDING_STATUSES]
  );
  res.json({ proposals: rows });
}

async function getReviewStats(req, res) {
  const [[counts]] = await pool.query(
    `SELECT
       COUNT(*) AS total,
       SUM(status IN (?)) AS pending,
       SUM(status = 'queries') AS queried,
       SUM(status = 'approved') AS approved,
       SUM(status = 'rejected') AS rejected
     FROM proposals WHERE status <> 'draft'`,
    [PENDING_STATUSES]
  );
  const [[month]] = await pool.query(
    `SELECT
       COUNT(DISTINCT CASE WHEN action = 'PROPOSAL_APPROVED' THEN target_id END) AS approved_this_month,
       COUNT(DISTINCT CASE WHEN action = 'PROPOSAL_REJECTED' THEN target_id END) AS rejected_this_month
     FROM audit_logs
     WHERE target_type = 'proposal' AND action IN ('PROPOSAL_APPROVED', 'PROPOSAL_REJECTED')
       AND DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')`
  );
  const [recent] = await pool.query(
    `SELECT p.id, p.title, p.status, p.event_date, p.created_at, u.name AS submitted_by_name
     FROM proposals p JOIN users u ON u.id = p.submitted_by
     WHERE p.status <> 'draft'
     ORDER BY p.created_at DESC LIMIT 5`
  );

  res.json({
    total: Number(counts.total),
    pending: Number(counts.pending),
    queried: Number(counts.queried),
    approved: Number(counts.approved),
    rejected: Number(counts.rejected),
    approvedThisMonth: Number(month.approved_this_month),
    rejectedThisMonth: Number(month.rejected_this_month),
    recent,
  });
}

async function listAllProposals(req, res) {
  const { status, club_id, search, from, to, event_type, min_budget: minBudget, max_budget: maxBudget } = req.query;
  const page = Math.max(parseInt(req.query.page) || 1, 1);
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = (page - 1) * limit;

  const where = ["p.status <> 'draft'"];
  const params = [];
  if (status) {
    const statuses = status.split(',').map((s) => s.trim());
    where.push(`p.status IN (?)`);
    params.push(statuses);
  }
  if (club_id) {
    where.push('COALESCE(p.club_id, u.club_id) = ?');
    params.push(club_id);
  }
  if (event_type) {
    where.push('p.event_type = ?');
    params.push(event_type);
  }
  if (search) {
    where.push('p.title LIKE ?');
    params.push(`%${search}%`);
  }
  if (from) {
    where.push('p.event_date >= ?');
    params.push(from);
  }
  if (to) {
    where.push('p.event_date <= ?');
    params.push(to);
  }
  if (minBudget !== undefined && minBudget !== '' && Number.isFinite(Number(minBudget))) {
    where.push('p.budget_amount >= ?');
    params.push(Number(minBudget));
  }
  if (maxBudget !== undefined && maxBudget !== '' && Number.isFinite(Number(maxBudget))) {
    where.push('p.budget_amount <= ?');
    params.push(Number(maxBudget));
  }
  const whereClause = `WHERE ${where.join(' AND ')}`;

  const [rows] = await pool.query(
    `SELECT p.*, u.name AS submitted_by_name, COALESCE(c.name, u.name) AS club_name,
            reviewer.name AS reviewed_by_name,
            (SELECT MIN(a.created_at) FROM audit_logs a
              WHERE a.target_type = 'proposal' AND a.target_id = p.id AND a.action = 'PROPOSAL_SUBMITTED') AS submitted_at_log
     FROM proposals p
     JOIN users u ON u.id = p.submitted_by
     LEFT JOIN clubs c ON c.id = COALESCE(p.club_id, u.club_id)
     LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by
     ${whereClause}
     ORDER BY p.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total FROM proposals p JOIN users u ON u.id = p.submitted_by ${whereClause}`,
    params
  );

  const proposals = rows.map(({ submitted_at_log: submittedAtLog, ...p }) => ({
    ...p,
    submitted_at: submittedAtLog || p.created_at,
  }));
  res.json({ proposals, page, limit, total });
}

function parseDetails(raw) {
  if (!raw) return null;
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

async function getProposal(req, res) {
  const { id } = req.params;
  const [proposals] = await pool.query(
    `SELECT p.*, u.name AS submitted_by_name, u.email AS submitted_by_email, u.contact_number AS submitted_by_phone,
            COALESCE(c.name, u.name) AS club_name, reviewer.name AS reviewed_by_name,
            canceller.name AS cancelled_by_name, signer.name AS signoff_by_name
     FROM proposals p
     JOIN users u ON u.id = p.submitted_by
     LEFT JOIN clubs c ON c.id = COALESCE(p.club_id, u.club_id)
     LEFT JOIN users reviewer ON reviewer.id = p.reviewed_by
     LEFT JOIN users canceller ON canceller.id = p.cancelled_by
     LEFT JOIN users signer ON signer.id = p.signoff_by
     WHERE p.id = ?`,
    [id]
  );
  const proposal = proposals[0];
  if (!proposal) return res.status(404).json({ message: 'Proposal not found' });

  const isOwner = canManageProposal(req.user, proposal);
  const isReviewerOrAdmin = ['hepa_officer', 'admin'].includes(req.user.role);
  if (!isOwner && !isReviewerOrAdmin) {
    return res.status(403).json({ message: 'You do not have access to this proposal' });
  }
  if (proposal.status === 'draft' && !isOwner) {
    return res.status(404).json({ message: 'Proposal not found' });
  }

  const [documents] = await pool.query('SELECT * FROM proposal_documents WHERE proposal_id = ? ORDER BY id ASC', [id]);
  const [budgetItems] = await pool.query(
    'SELECT * FROM proposal_budget_items WHERE proposal_id = ? ORDER BY sort_order ASC, id ASC',
    [id]
  );
  const [remarks] = await pool.query(
    `SELECT r.*, u.name AS hepa_officer_name FROM proposal_remarks r
     JOIN users u ON u.id = r.hepa_officer_id WHERE r.proposal_id = ? ORDER BY r.created_at ASC, r.id ASC`,
    [id]
  );
  const [activityRows] = await pool.query(
    `SELECT a.id, a.action, a.details, a.created_at, u.name AS user_name, u.role AS user_role
     FROM audit_logs a LEFT JOIN users u ON u.id = a.user_id
     WHERE a.target_type = 'proposal' AND a.target_id = ?
     ORDER BY a.created_at ASC, a.id ASC`,
    [id]
  );
  const activity = activityRows.map((a) => ({ ...a, details: parseDetails(a.details) }));
  const [reports] = await pool.query('SELECT * FROM post_event_reports WHERE proposal_id = ?', [id]);

  res.json({ proposal, documents, budget_items: budgetItems, remarks, activity, report: reports[0] || null });
}

async function downloadDocument(req, res) {
  const { documentId } = req.params;
  const [docs] = await pool.query(
    `SELECT d.*, p.submitted_by, p.club_id, p.status AS proposal_status FROM proposal_documents d
     JOIN proposals p ON p.id = d.proposal_id WHERE d.id = ?`,
    [documentId]
  );
  const doc = docs[0];
  if (!doc) return res.status(404).json({ message: 'Document not found' });

  const isOwner = canManageProposal(req.user, doc);
  const isReviewerOrAdmin = ['hepa_officer', 'admin'].includes(req.user.role);
  if (!isOwner && !isReviewerOrAdmin) {
    return res.status(403).json({ message: 'You do not have access to this document' });
  }
  if (doc.proposal_status === 'draft' && !isOwner) {
    return res.status(404).json({ message: 'Document not found' });
  }

  const filePath = path.join(UPLOAD_DIR, doc.stored_name);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File is missing on the server' });
  }

  const safeName = doc.original_name.replace(/"/g, '');
  res.setHeader('Content-Type', doc.mime_type);
  res.setHeader(
    'Content-Disposition',
    `inline; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(doc.original_name)}`
  );
  res.sendFile(filePath);
}

async function startReview(req, res) {
  const { id } = req.params;
  const [result] = await pool.query(
    "UPDATE proposals SET status = 'under_review' WHERE id = ? AND status IN ('submitted', 'resubmitted')",
    [id]
  );
  if (result.affectedRows > 0) {
    await logAction({ userId: req.user.id, action: 'PROPOSAL_REVIEW_STARTED', targetType: 'proposal', targetId: id });
  }
  res.json({ started: result.affectedRows > 0 });
}

async function decide(res, id, newStatus, reviewerId, remark, { acknowledgedSignoff = false } = {}) {
  const [result] = await pool.query(
    `UPDATE proposals SET status = ?, reviewed_by = ?,
            signoff_by = IF(?, ?, signoff_by), signoff_at = IF(?, NOW(), signoff_at)
     WHERE id = ? AND status IN (?)`,
    [newStatus, reviewerId, acknowledgedSignoff, reviewerId, acknowledgedSignoff, id, PENDING_STATUSES]
  );
  if (result.affectedRows === 0) {
    res.status(409).json({ message: 'This proposal is not awaiting a decision (it may already have been reviewed).' });
    return false;
  }
  if (remark) {
    await pool.query('INSERT INTO proposal_remarks (proposal_id, hepa_officer_id, remark) VALUES (?, ?, ?)', [
      id, reviewerId, remark,
    ]);
  }
  return true;
}

const SIGNOFF_PARTIES = ['advisor', 'secretary', 'director'];

async function approveProposal(req, res) {
  const { id } = req.params;
  const signoff = req.body?.signoff || {};
  if (!SIGNOFF_PARTIES.every((party) => signoff[party] === true)) {
    return res.status(400).json({
      message: 'Confirm that the Advisor/BHEP, the Setiausaha ATAP Kolej and the Director (Pengarah) have all signed the form before approving.',
    });
  }
  if (!(await decide(res, id, 'approved', req.user.id, undefined, { acknowledgedSignoff: true }))) return;
  await logAction({
    userId: req.user.id,
    action: 'PROPOSAL_APPROVED',
    targetType: 'proposal',
    targetId: id,
    details: { signoff_acknowledged: SIGNOFF_PARTIES },
  });
  res.json({ message: 'Proposal approved' });
}

async function rejectProposal(req, res) {
  const { id } = req.params;
  const { remark } = req.body;
  if (!remark || !remark.trim()) {
    return res.status(400).json({ message: 'A rejection reason is required' });
  }

  if (!(await decide(res, id, 'rejected', req.user.id, remark))) return;
  await logAction({ userId: req.user.id, action: 'PROPOSAL_REJECTED', targetType: 'proposal', targetId: id, details: { remark } });
  res.json({ message: 'Proposal rejected' });
}

async function queryProposal(req, res) {
  const { id } = req.params;
  const { remark } = req.body;
  if (!remark || !remark.trim()) return res.status(400).json({ message: 'A remark is required' });

  if (!(await decide(res, id, 'queries', req.user.id, remark))) return;
  await logAction({ userId: req.user.id, action: 'PROPOSAL_QUERIED', targetType: 'proposal', targetId: id, details: { remark } });
  res.json({ message: 'Query sent to club committee' });
}

async function cancelProposal(req, res) {
  const { id } = req.params;
  const { reason } = req.body;
  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: 'A reason is required to cancel an event' });
  }

  const [proposals] = await pool.query('SELECT * FROM proposals WHERE id = ?', [id]);
  const proposal = proposals[0];
  if (!proposal) return res.status(404).json({ message: 'Proposal not found' });
  if (proposal.status !== 'approved') {
    return res.status(400).json({ message: 'Only approved events can be cancelled' });
  }

  await pool.query(
    `UPDATE proposals SET status = 'cancelled', cancelled_by = ?, cancel_reason = ?, cancelled_at = NOW()
     WHERE id = ?`,
    [req.user.id, reason, id]
  );
  await logAction({
    userId: req.user.id,
    action: 'PROPOSAL_CANCELLED_BY_ADMIN',
    targetType: 'proposal',
    targetId: id,
    details: { reason },
  });
  res.json({ message: 'Event cancelled' });
}

async function deleteArchivedProposal(req, res) {
  const { id } = req.params;
  const [proposals] = await pool.query('SELECT * FROM proposals WHERE id = ?', [id]);
  const proposal = proposals[0];
  if (!proposal) return res.status(404).json({ message: 'Proposal not found' });

  if (proposal.status !== 'cancelled') {
    return res.status(400).json({ message: 'Only cancelled events in the archive can be deleted' });
  }

  const cancelledAt = new Date(proposal.cancelled_at);
  const eligibleAt = new Date(cancelledAt.getTime() + ARCHIVE_DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000);
  const now = new Date();
  if (now < eligibleAt) {
    const daysRemaining = Math.ceil((eligibleAt - now) / (24 * 60 * 60 * 1000));
    return res.status(400).json({
      message: `This event can be permanently deleted in ${daysRemaining} more day${daysRemaining === 1 ? '' : 's'} (30 days after cancellation).`,
    });
  }

  const [documents] = await pool.query('SELECT stored_name FROM proposal_documents WHERE proposal_id = ?', [id]);

  await pool.query('DELETE FROM proposals WHERE id = ?', [id]);

  documents.forEach((doc) => unlinkStored(doc.stored_name));

  await logAction({
    userId: req.user.id,
    action: 'PROPOSAL_ARCHIVE_DELETED',
    targetType: 'proposal',
    targetId: id,
    details: { title: proposal.title, cancelled_at: proposal.cancelled_at },
  });
  res.json({ message: 'Event permanently deleted' });
}

async function listCalendarEvents(req, res) {
  const canSeeBudget = ['hepa_officer', 'admin'].includes(req.user.role);
  const [rows] = await pool.query(
    `SELECT p.id, p.title, p.event_type, p.description, p.objective, p.target_participants,
            p.estimated_participants, p.event_date, p.event_time, p.end_time, p.venue,
            p.contact_person, COALESCE(c.name, u.name) AS club_name,
            CASE WHEN ? OR p.submitted_by = ? OR (p.club_id IS NOT NULL AND p.club_id = ?) THEN p.budget_amount END AS budget_amount,
            (SELECT MAX(a.created_at) FROM audit_logs a
              WHERE a.target_type = 'proposal' AND a.target_id = p.id AND a.action = 'PROPOSAL_APPROVED') AS approved_at
     FROM proposals p
     JOIN users u ON u.id = p.submitted_by
     LEFT JOIN clubs c ON c.id = COALESCE(p.club_id, u.club_id)
     WHERE p.status = 'approved'
     ORDER BY p.event_date ASC, p.event_time ASC`,
    [canSeeBudget ? 1 : 0, req.user.id, req.user.club_id ?? null]
  );
  const [[{ registered_clubs }]] = await pool.query("SELECT COUNT(*) AS registered_clubs FROM clubs WHERE status = 'active'");
  res.json({ events: rows, registered_clubs: Number(registered_clubs) });
}

module.exports = {
  createProposal,
  updateProposal,
  deleteDraft,
  deleteDocument,
  listMyProposals,
  listPendingProposals,
  listAllProposals,
  getReviewStats,
  getProposal,
  downloadDocument,
  startReview,
  approveProposal,
  rejectProposal,
  queryProposal,
  cancelProposal,
  deleteArchivedProposal,
  listCalendarEvents,
};
