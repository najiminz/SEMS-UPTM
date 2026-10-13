export const ACTION_LABEL = {
  PROPOSAL_SUBMITTED: 'Submitted to HEPA',
  PROPOSAL_RESUBMITTED: 'Resubmitted with changes',
  PROPOSAL_REVIEW_STARTED: 'Review started',
  PROPOSAL_QUERIED: 'HEPA requested changes',
  PROPOSAL_APPROVED: 'Approved by HEPA',
  PROPOSAL_REJECTED: 'Rejected by HEPA',
  PROPOSAL_CANCELLED_BY_ADMIN: 'Cancelled by an administrator',
  PROPOSAL_DOCUMENT_REMOVED: 'Document removed',
  POST_EVENT_REPORT_SUBMITTED: 'Post-event report submitted',
};

const toEvent = (e) => ({
  id: e.id,
  action: e.action,
  label: ACTION_LABEL[e.action] || e.action,
  at: e.created_at,
  user: e.user_name,
  role: e.user_role,
  remark: e.details?.remark || e.details?.reason || null,
});

export function buildTimeline(proposal, activity = [], { showOptionalRevision = false } = {}) {
  const of = (action) => activity.filter((e) => e.action === action).map(toEvent);
  const submitted = of('PROPOSAL_SUBMITTED')[0];
  const reviewStarted = of('PROPOSAL_REVIEW_STARTED')[0];
  const queries = of('PROPOSAL_QUERIED');
  const resubmits = of('PROPOSAL_RESUBMITTED');
  const approved = of('PROPOSAL_APPROVED').at(-1);
  const rejected = of('PROPOSAL_REJECTED').at(-1);
  const cancelled = of('PROPOSAL_CANCELLED_BY_ADMIN').at(-1);

  const status = proposal.status;
  const isDraft = status === 'draft';
  const inReview = status === 'under_review';
  const inRevision = status === 'queries' || status === 'resubmitted';
  const decided = ['approved', 'rejected', 'cancelled'].includes(status);
  const beforeReview = isDraft || status === 'submitted';

  const stages = [];

  stages.push({
    key: 'draft',
    label: 'Draft',
    state: isDraft ? 'current' : 'done',
    tone: 'default',
    at: proposal.created_at,
    user: proposal.submitted_by_name,
    note: 'The committee prepared the proposal as a private draft.',
    events: [],
  });

  stages.push({
    key: 'submitted',
    label: 'Submitted',
    state: isDraft ? 'upcoming' : status === 'submitted' ? 'current' : 'done',
    tone: 'default',
    at: isDraft ? null : (submitted?.at || proposal.created_at),
    user: isDraft ? null : (submitted?.user || proposal.submitted_by_name),
    note: isDraft ? 'Not submitted yet.' : 'The proposal was sent to HEPA for review.',
    events: submitted ? [submitted] : [],
  });

  stages.push({
    key: 'under_review',
    label: 'Under Review',
    state: beforeReview ? 'upcoming' : inReview ? 'current' : reviewStarted ? 'done' : 'skipped',
    tone: 'default',
    at: reviewStarted?.at || null,
    user: reviewStarted?.user || null,
    note: beforeReview
      ? 'Waiting for a HEPA officer to open the proposal.'
      : reviewStarted
        ? 'A HEPA officer opened the proposal and began reviewing it.'
        : 'This proposal was decided without a recorded review start.',
    events: reviewStarted ? [reviewStarted] : [],
  });

  const revisionEvents = [...queries, ...resubmits].sort((a, b) => String(a.at).localeCompare(String(b.at)));
  if (revisionEvents.length > 0 || inRevision || showOptionalRevision) {
    const latest = revisionEvents.at(-1);
    stages.push({
      key: 'revision',
      label: 'Query / Resubmitted',
      state: inRevision ? 'current' : revisionEvents.length > 0 ? 'done' : decided ? 'skipped' : 'upcoming',
      tone: status === 'queries' ? 'warning' : 'default',
      at: latest?.at || null,
      user: latest?.user || null,
      note: revisionEvents.length > 0
        ? 'HEPA asked for changes and the committee responded.'
        : 'Only happens if HEPA asks for changes.',
      events: revisionEvents,
    });
  }

  const decision = approved || rejected;
  const isRejected = status === 'rejected';
  stages.push({
    key: 'decision',
    label: isRejected ? 'Rejected' : decided ? 'Approved' : showOptionalRevision ? 'Approved / Rejected' : 'Approved',
    state: decided ? 'done' : 'upcoming',
    tone: isRejected ? 'danger' : decided ? 'success' : 'default',
    at: decided ? (decision?.at || null) : null,
    user: decided ? (decision?.user || proposal.reviewed_by_name || null) : null,
    note: isRejected
      ? 'HEPA rejected the proposal.'
      : decided
        ? 'HEPA approved the proposal and it appears on the campus calendar.'
        : 'Waiting for a HEPA decision.',
    events: decision ? [decision] : [],
  });

  if (status === 'cancelled' || cancelled) {
    stages.push({
      key: 'cancelled',
      label: 'Cancelled',
      state: status === 'cancelled' ? 'current' : 'done',
      tone: 'danger',
      at: cancelled?.at || proposal.cancelled_at || null,
      user: cancelled?.user || proposal.cancelled_by_name || null,
      note: proposal.cancel_reason || 'An administrator cancelled this approved event.',
      events: cancelled ? [cancelled] : [],
    });
  }

  return stages;
}

const REVIEW_ACTIONS = [
  'PROPOSAL_REVIEW_STARTED', 'PROPOSAL_QUERIED', 'PROPOSAL_RESUBMITTED', 'PROPOSAL_APPROVED', 'PROPOSAL_REJECTED',
];

export function reviewHistory(activity = [], remarks = []) {
  const fromAudit = activity.filter((e) => REVIEW_ACTIONS.includes(e.action)).map(toEvent);
  if (fromAudit.length > 0) return fromAudit;
  return remarks.map((r) => ({
    id: `remark-${r.id}`,
    action: 'REMARK',
    label: 'HEPA remark',
    at: r.created_at,
    user: r.hepa_officer_name,
    role: 'hepa_officer',
    remark: r.remark,
  }));
}

export function allActivity(activity = []) {
  return activity.map(toEvent);
}
