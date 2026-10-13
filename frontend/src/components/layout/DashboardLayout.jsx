import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

const TOPBAR_ROLES = ['club_committee', 'hepa_officer'];

export default function DashboardLayout({ children }) {
  const { user } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showTopBar = TOPBAR_ROLES.includes(user?.role);

  return (
    <div className="md:flex md:min-h-[calc(100vh-56px)]">
      <div className="no-print hidden md:block shrink-0 md:sticky md:top-0 md:h-screen md:self-start">
        <Sidebar />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex">
            <Sidebar onNavigate={() => setDrawerOpen(false)} />
            <button
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation menu"
              className="self-start mt-4 -ml-10 p-1.5 rounded-lg bg-white/90 text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        {showTopBar ? (
          <TopBar onMenu={() => setDrawerOpen(true)} />
        ) : (
          <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-surface">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation menu"
              className="p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
            >
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-sm font-medium text-slate-700">Menu</span>
          </div>
        )}

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
