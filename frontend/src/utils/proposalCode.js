export function proposalCode(proposal) {
  if (!proposal?.id) return '';
  const year = proposal.created_at ? new Date(proposal.created_at).getFullYear() : new Date().getFullYear();
  return `SEMS-${year}-${String(proposal.id).padStart(3, '0')}`;
}
