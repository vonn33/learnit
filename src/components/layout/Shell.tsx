import {useEffect, useState} from 'react';
import {Outlet, useLocation} from 'react-router';
import {Navbar} from './Navbar';
import {Sidebar} from './Sidebar';
import {Menu, X} from 'lucide-react';
import {CommandPalette} from '@/components/ui/CommandPalette';
import {useDocStore} from '@/store/docStore';
import {useAnnotationStore} from '@/store/annotationStore';
import {useMapStore} from '@/store/mapStore';

const SIDEBAR_ROUTES = ['/docs', '/manage'];

export function Shell() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const showSidebar = SIDEBAR_ROUTES.some((r) => location.pathname.startsWith(r));

  useEffect(() => {
    const docFetch = useDocStore.getState().fetchAll();
    const annFetch = useAnnotationStore.getState().fetchAll();
    void Promise.all([docFetch, annFetch]);
    const unsub1 = useDocStore.getState().subscribeRealtime();
    const unsub2 = useAnnotationStore.getState().subscribeRealtime();
    const unsub3 = useMapStore.getState().subscribeRealtime();
    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex flex-col h-full">
      <Navbar onSearchOpen={() => setSearchOpen(true)} />

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {showSidebar && <Sidebar className="hidden md:flex md:flex-col" />}

        {/* Mobile sidebar drawer */}
        {showSidebar && drawerOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 md:hidden">
              <Sidebar />
            </div>
          </>
        )}

        {/* Mobile drawer toggle */}
        {showSidebar && (
          <button
            className="fixed bottom-4 left-4 z-30 md:hidden p-2 rounded-full bg-[var(--color-card)] border shadow-lg"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            {drawerOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        )}

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
