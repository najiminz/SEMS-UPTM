export const DASHBOARD_BY_ROLE = {
  club_committee: '/club',
  hepa_officer: '/hepa',
  admin: '/admin',
};

export function dashboardFor(role) {
  return DASHBOARD_BY_ROLE[role] || '/';
}
