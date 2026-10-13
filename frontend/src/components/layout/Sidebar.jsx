import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { NAV_BY_ROLE } from './navConfig';

const ROLE_LABEL = {
  club_committee: 'Club Committee',
  hepa_officer: 'HEPA Officer',
  admin: 'Administrator',
};

export default function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const items = NAV_BY_ROLE[user?.role] || [];

  return (
    <div className="flex flex-col h-full bg-navy-800 w-60">
      <div className="px-4 py-4 border-b border-white/10">
        <p className="text-sm font-medium text-white truncate">{user?.name}</p>
        <p className="text-xs text-navy-200">{ROLE_LABEL[user?.role] || user?.role}</p>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5" aria-label="Dashboard navigation">
        {items.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to + label}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-brand-600 text-white' : 'text-navy-100 hover:bg-white/10'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
