import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../hooks/useTheme';

const DASHBOARD_BY_ROLE = {
  club_committee: '/club',
  hepa_officer: '/hepa',
  admin: '/admin',
};

const ROLE_LABEL = {
  club_committee: 'Club Committee',
  hepa_officer: 'HEPA Officer',
  admin: 'Administrator',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="no-print h-14 bg-navy-700 text-white px-4 sm:px-6 flex items-center justify-between shrink-0">
      <Link to="/" className="font-semibold tracking-tight flex items-center gap-2">
        <img src="/uptm-logo.png" alt="UPTM" className="h-7 sm:h-8 w-auto bg-white rounded px-1.5 py-1" />
        <span>SEMS</span>
      </Link>

      <div className="flex items-center gap-3 sm:gap-4 text-sm">
        {!user && (
          <Link to="/" className="hover:text-navy-100 hidden sm:inline">
            Calendar
          </Link>
        )}
        {user && DASHBOARD_BY_ROLE[user.role] && (
          <Link to={DASHBOARD_BY_ROLE[user.role]} className="hover:text-navy-100 hidden sm:inline">
            Dashboard
          </Link>
        )}

        <button
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-lg hover:bg-white/10"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {user ? (
          <>
            <span className="text-navy-200 hidden md:inline">
              {user.name} <span className="text-navy-200">· {ROLE_LABEL[user.role] || user.role}</span>
            </span>
            <button
              onClick={() => {
                logout();
                navigate('/login');
              }}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </>
        ) : (
          <Link to="/login" className="bg-brand-600 hover:bg-brand-700 px-3 py-1.5 rounded-lg">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
