function canManageProposal(user, proposal) {
  if (!user || !proposal) return false;
  if (proposal.submitted_by === user.id) return true;
  return user.role === 'club_committee' && user.club_id != null && proposal.club_id === user.club_id;
}

module.exports = { canManageProposal };
