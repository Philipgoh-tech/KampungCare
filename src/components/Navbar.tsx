import { User } from 'firebase/auth';
import { LogOut, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { ActiveTab } from '../types/marketplace.ts';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  firebaseUser: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  authLoading: boolean;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'find', label: 'Find Sitters' },
  { id: 'bookings', label: 'My Bookings' },
  { id: 'sitter', label: 'Sitter Portal' },
  { id: 'admin', label: 'Admin Queue' },
  { id: 'faq', label: 'FAQ & Inquiry' },
];

export function Navbar({
  activeTab,
  onSelectTab,
  firebaseUser,
  onSignIn,
  onSignOut,
  authLoading,
}: NavbarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSelect = (tab: ActiveTab) => {
    onSelectTab(tab);
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E6E4DE]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line brand wordmark only */}
        <button
          type="button"
          onClick={() => handleSelect('find')}
          className="font-display text-xl font-semibold tracking-tight text-[#14453D] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#14453D]"
        >
          KampungCare
        </button>

        {/* Zone 2: Clean single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.id)}
                className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#14453D] ${
                  active
                    ? 'border-[#14453D] text-[#14453D]'
                    : 'border-transparent text-[#5E6764] hover:text-[#1C2422]'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center gap-3 shrink-0">
          {firebaseUser ? (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-xs text-[#5E6764] max-w-[150px] truncate">
                {firebaseUser.displayName || firebaseUser.email}
              </span>
              <button
                type="button"
                onClick={onSignOut}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#1C2422] bg-white border border-[#D9D6CE] rounded-lg hover:bg-[#F3F1EC] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              disabled={authLoading}
              className="hidden md:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#14453D] rounded-lg hover:bg-[#0F362F] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {authLoading ? 'Signing In...' : 'Sign In'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[#E6E4DE] bg-white text-[#1C2422]"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E6E4DE] bg-white px-4 py-4 space-y-2">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelect(item.id)}
              className={`block w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium ${
                activeTab === item.id
                  ? 'bg-[#14453D]/10 text-[#14453D]'
                  : 'text-[#1C2422] hover:bg-[#FAF9F6]'
              }`}
            >
              {item.label}
            </button>
          ))}
          <div className="pt-2 border-t border-[#E6E4DE]">
            {firebaseUser ? (
              <button
                type="button"
                onClick={() => {
                  onSignOut();
                  setMobileOpen(false);
                }}
                className="w-full py-2.5 px-4 text-sm font-medium text-[#1C2422] border border-[#D9D6CE] rounded-lg"
              >
                Sign Out ({firebaseUser.email})
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  onSignIn();
                  setMobileOpen(false);
                }}
                className="w-full py-2.5 px-4 text-sm font-semibold text-white bg-[#14453D] rounded-lg"
              >
                Sign In with Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
