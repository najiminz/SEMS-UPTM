import {
  LayoutDashboard, FilePlus2, CalendarDays, Users, Building2, ClipboardList,
  FileClock, Settings, UserCircle, BarChart3, FolderOpen, Ticket, ClipboardCheck, CalendarCheck,
} from 'lucide-react';

export const NAV_BY_ROLE = {
  club_committee: [
    { label: 'Dashboard', to: '/club', icon: LayoutDashboard, end: true },
    { label: 'Club Proposals', to: '/club/proposals', icon: FolderOpen },
    { label: 'Create Proposal', to: '/club/new', icon: FilePlus2 },
    { label: 'Events', to: '/events', icon: Ticket },
    { label: 'Post-Event Report', to: '/club/reports', icon: ClipboardCheck },
    { label: 'Profile', to: '/profile', icon: UserCircle, end: true },
  ],
  hepa_officer: [
    { label: 'Dashboard', to: '/hepa', icon: LayoutDashboard, end: true },
    { label: 'Proposal Review', to: '/hepa/review', icon: ClipboardCheck },
    { label: 'Approved Events', to: '/hepa/events', icon: CalendarCheck },
    { label: 'Calendar', to: '/calendar', icon: CalendarDays },
    { label: 'Reports', to: '/hepa/reports', icon: BarChart3 },
    { label: 'Profile', to: '/profile', icon: UserCircle, end: true },
  ],
  admin: [
    { label: 'Dashboard', to: '/admin', icon: LayoutDashboard, end: true },
    { label: 'Users', to: '/admin/users', icon: Users },
    { label: 'Clubs', to: '/admin/clubs', icon: Building2 },
    { label: 'Events', to: '/admin/events', icon: CalendarDays },
    { label: 'Proposals', to: '/admin/proposals', icon: ClipboardList },
    { label: 'Audit Logs', to: '/admin/audit-logs', icon: FileClock },
    { label: 'Reports', to: '/admin/reports', icon: BarChart3 },
    { label: 'Settings', to: '/admin/settings', icon: Settings },
    { label: 'Profile', to: '/profile', icon: UserCircle, end: true },
  ],
};
