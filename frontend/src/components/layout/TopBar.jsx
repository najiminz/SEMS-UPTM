import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, Mail, Menu, Search, UserCircle } from 'lucide-react';
import client from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useDismiss } from '../../hooks/useDismiss';
import { avatarUrl } from '../../utils/avatar';
import { formatDateTime } from '../../utils/format';

const ROLE_LABEL = {
  club_committee: 'Club Committee',
  hepa_officer: 'HEPA Officer',
  admin: 'Administrator',
};

const SEARCH_TARGET = {
  club_committee: { path: '/club/proposals', placeholder: 'Search proposals...' },
};

function seenKey(userId) {
  return `sems_notif_seen_${userId}`;
}

function readSeen(userId) {
  try {
    return Number(localStorage.getItem(seenKey(userId))) || 0;
  } catch {
    return 0;
  }
}

function Avatar({ user, size = 'w-8 h-8' }) {
  if (user?.avatar_filename) {
    return <img src={avatarUrl(user.avatar_filename)} alt="" className={`${size} rounded-full object-cover`} />;
  }
  return (
    <span className={`${size} rounded-full bg-navy-50 text-navy-700 flex items-center justify-center`}>
      <UserCircle className="w-5 h-5" />
    </span>
  );
}

function NotificationsMenu({ user }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [seenAt, setSeenAt] = useState(() => readSeen(user.id));
  const [highlight, setHighlight] = useState(() => new Set());
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  const load = useCallback(() => {
    client
      .get('/notifications')
      .then((res) => setItems(res.data.notifications))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const unread = items.filter((n) => new Date(n.created_at).getTime() > seenAt);

  function toggle() {
    if (!open) {
      load();
      setHighlight(new Set(unread.map((n) => n.id)));
      const now = Date.now();
      setSeenAt(now);
      try {
        localStorage.setItem(seenKey(user.id), String(now));
      } catch {
      }
    }
    setOpen((o) => !o);
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label={unread.length > 0 ? `Notifications, ${unread.length} new` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100"
      >
        <Bell className="w-5 h-5" />
        {unread.length > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-brand-600 text-white text-[10px] font-semibold leading-4 text-center">
            {unread.length > 9 ? '9+' : unread.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-surface border border-slate-200 rounded-lg shadow-lg z-40">
          <p className="px-4 py-3 text-sm font-semibold text-slate-900 border-b border-slate-100">Notifications</p>
          {!loaded ? (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">Loading...</p>
          ) : items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-slate-400 text-center">You're all caught up.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto divide-y divide-slate-100">
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      navigate(n.link);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${highlight.has(n.id) ? 'bg-slate-100/70' : ''}`}
                  >
                    <p className="text-sm font-medium text-slate-900">{n.title}</p>
                    <p className="text-sm text-slate-600 line-clamp-2">{n.body}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(n.created_at)}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function ProfileMenu({ user }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(ref, open, close);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Account menu"
        className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-slate-100"
      >
        <Avatar user={user} />
        <span className="hidden md:block text-left leading-tight">
          <span className="block text-sm font-medium text-slate-900 max-w-32 truncate">{user.name}</span>
          <span className="block text-xs text-slate-500">{ROLE_LABEL[user.role]}</span>
        </span>
        <ChevronDown className="w-4 h-4 text-slate-400" />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-60 bg-surface border border-slate-200 rounded-lg shadow-lg z-40 py-1">
          <div className="px-4 py-3 border-b border-slate-100">
            <p className="text-sm font-medium text-slate-900 truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <Link role="menuitem" to="/profile" onClick={close} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <UserCircle className="w-4 h-4 text-slate-400" /> My profile
          </Link>
          <Link role="menuitem" to="/change-email" onClick={close} className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
            <Mail className="w-4 h-4 text-slate-400" /> Change email
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 border-t border-slate-100 mt-1"
          >
            <LogOut className="w-4 h-4 text-slate-400" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

export default function TopBar({ onMenu }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const target = SEARCH_TARGET[user?.role];

  function submitSearch(e) {
    e.preventDefault();
    const q = query.trim();
    navigate(q ? `${target.path}?q=${encodeURIComponent(q)}` : target.path);
  }

  return (
    <div className="no-print sticky top-0 z-30 flex items-center gap-2 sm:gap-3 px-4 sm:px-6 lg:px-8 h-14 bg-surface border-b border-slate-200">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation menu"
        className="md:hidden p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
      >
        <Menu className="w-5 h-5" />
      </button>

      {target ? (
        <form onSubmit={submitSearch} role="search" aria-label="Site search" className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={target.placeholder}
            aria-label={target.placeholder.replace('...', '')}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400"
          />
        </form>
      ) : (
        <div className="flex-1" />
      )}

      <div className="flex items-center gap-1 ml-auto">
        <NotificationsMenu user={user} />
        <ProfileMenu user={user} />
      </div>
    </div>
  );
}
