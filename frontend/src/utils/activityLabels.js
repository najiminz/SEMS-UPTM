import {
  UserPlus, UserCog, UserX, UserCheck, KeyRound, LogIn, LogOut,
  FilePlus2, CheckCircle2, XCircle, MessageCircleQuestion, RefreshCcw, Ban,
  Building2, FileClock, Settings, ShieldAlert, Eye, FileX2,
} from 'lucide-react';

export const ACTIVITY_META = {
  USER_REGISTERED: { label: 'New account registered', icon: UserPlus },
  USER_CREATED: { label: 'Admin created a user', icon: UserPlus },
  USER_UPDATED: { label: 'Admin updated a user', icon: UserCog },
  USER_ROLE_UPDATED: { label: "Admin changed a user's role", icon: UserCog },
  USER_ACTIVATED: { label: 'Admin activated an account', icon: UserCheck },
  USER_DEACTIVATED: { label: 'Admin deactivated an account', icon: UserX },
  USER_PASSWORD_RESET: { label: "Admin reset a user's password", icon: KeyRound },
  LOGIN_SUCCESS: { label: 'User logged in', icon: LogIn },
  LOGIN_FAILED: { label: 'Failed login attempt', icon: ShieldAlert },
  ACCOUNT_LOCKED: { label: 'Account locked after repeated failed logins', icon: ShieldAlert },
  LOGOUT: { label: 'User logged out', icon: LogOut },
  PROPOSAL_SUBMITTED: { label: 'Club Committee submitted a proposal', icon: FilePlus2 },
  PROPOSAL_RESUBMITTED: { label: 'Club Committee resubmitted a proposal', icon: RefreshCcw },
  PROPOSAL_APPROVED: { label: 'HEPA Officer approved a proposal', icon: CheckCircle2 },
  PROPOSAL_REJECTED: { label: 'HEPA Officer rejected a proposal', icon: XCircle },
  PROPOSAL_QUERIED: { label: 'HEPA Officer requested changes', icon: MessageCircleQuestion },
  PROPOSAL_REVIEW_STARTED: { label: 'HEPA Officer started a review', icon: Eye },
  PROPOSAL_DOCUMENT_REMOVED: { label: 'Club Committee removed a proposal document', icon: FileX2 },
  PROPOSAL_CANCELLED_BY_ADMIN: { label: 'Admin cancelled an approved event', icon: Ban },
  POST_EVENT_REPORT_SUBMITTED: { label: 'Club Committee submitted a post-event report', icon: FilePlus2 },
  CLUB_CREATED: { label: 'Admin created a new club', icon: Building2 },
  CLUB_UPDATED: { label: 'Admin updated a club', icon: Building2 },
  CLUB_ACTIVATED: { label: 'Admin activated a club', icon: Building2 },
  CLUB_DEACTIVATED: { label: 'Admin deactivated a club', icon: Building2 },
  CLUB_MEMBER_ASSIGNED: { label: 'Admin assigned a committee member', icon: Building2 },
  CLUB_MEMBER_REMOVED: { label: 'Admin removed a committee member', icon: Building2 },
  SYSTEM_SETTINGS_UPDATED: { label: 'Admin updated system settings', icon: Settings },
};

export function describeActivity(log) {
  return ACTIVITY_META[log.action] || { label: log.action, icon: FileClock };
}

const SHORT_LABEL = {
  USER_REGISTERED: 'User account registered',
  USER_CREATED: 'User account created',
  USER_UPDATED: 'User account updated',
  USER_ROLE_UPDATED: 'User role changed',
  USER_ACTIVATED: 'User account activated',
  USER_DEACTIVATED: 'User account deactivated',
  USER_DELETED: 'User account deleted',
  USER_PASSWORD_RESET: 'Password reset by an admin',
  REGISTRATION_SUBMITTED: 'Registration completed',
  EMAIL_VERIFIED: 'Email verified',
  EMAIL_CHANGE_REQUESTED: 'Email change requested',
  EMAIL_CHANGED: 'Email address changed',
  PASSWORD_RESET_REQUESTED: 'Password reset requested',
  PASSWORD_RESET_COMPLETED: 'Password reset completed',
  PASSWORD_CHANGED: 'Password changed',
  PASSWORD_CHANGE_FAILED: 'Password change failed',
  LOGIN_SUCCESS: 'User signed in',
  LOGIN_FAILED: 'Sign-in failed',
  LOGIN_BLOCKED: 'Sign-in blocked',
  ACCOUNT_LOCKED: 'Account locked',
  LOGOUT: 'User signed out',
  PROPOSAL_SUBMITTED: 'Proposal submitted',
  PROPOSAL_RESUBMITTED: 'Proposal resubmitted',
  PROPOSAL_REVIEW_STARTED: 'Proposal review started',
  PROPOSAL_APPROVED: 'Proposal approved',
  PROPOSAL_REJECTED: 'Proposal rejected',
  PROPOSAL_QUERIED: 'Proposal queried',
  PROPOSAL_CANCELLED_BY_ADMIN: 'Event cancelled',
  PROPOSAL_DOCUMENT_REMOVED: 'Proposal document removed',
  PROPOSAL_ARCHIVE_DELETED: 'Archived event deleted',
  POST_EVENT_REPORT_SUBMITTED: 'Post-event report submitted',
  CLUB_CREATED: 'Club created',
  CLUB_UPDATED: 'Club updated',
  CLUB_DELETED: 'Club deleted',
  CLUB_ACTIVATED: 'Club activated',
  CLUB_DEACTIVATED: 'Club deactivated',
  CLUB_MEMBER_ASSIGNED: 'Committee member assigned',
  CLUB_MEMBER_REMOVED: 'Committee member removed',
  SYSTEM_SETTINGS_UPDATED: 'System settings updated',
};

export function shortLabel(action) {
  if (SHORT_LABEL[action]) return SHORT_LABEL[action];
  const words = action.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const WARNING_ACTIONS = ['PROPOSAL_QUERIED', 'USER_DEACTIVATED', 'PASSWORD_RESET_REQUESTED'];
const DANGER_ACTIONS = ['PROPOSAL_REJECTED', 'PROPOSAL_CANCELLED_BY_ADMIN', 'USER_DELETED', 'CLUB_DELETED', 'PROPOSAL_ARCHIVE_DELETED'];

export function activityTone(log) {
  if (log.result === 'failure' || log.result === 'blocked') return 'warning';
  if (DANGER_ACTIONS.includes(log.action)) return 'danger';
  if (WARNING_ACTIONS.includes(log.action)) return 'warning';
  return 'success';
}
