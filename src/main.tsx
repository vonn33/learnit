import './index.css';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route, Navigate} from 'react-router';
import {ThemeProvider} from '@/components/layout/ThemeProvider';
import {Shell} from '@/components/layout/Shell';
import {HomePage} from '@/pages/HomePage';
import {DocsPage} from '@/pages/DocsPage';
import {HighlightsPage} from '@/pages/HighlightsPage';
import {DiagramsPage} from '@/pages/DiagramsPage';
import {SettingsPage} from '@/pages/SettingsPage';
import ContentManagementPage from '@/pages/ContentManagementPage';

const MIGRATION_FLAG = 'handbook:supabase-migration-done';
if (!localStorage.getItem(MIGRATION_FLAG)) {
  const stale = ['handbook:annotations', 'handbook:maps'];
  const hasStale = stale.some((k) => localStorage.getItem(k));
  if (hasStale) {
    if (
      window.confirm(
        'LearnIt has migrated to cloud sync. Local annotations and maps from before this version cannot be carried over. Clear stale local data?',
      )
    ) {
      stale.forEach((k) => localStorage.removeItem(k));
    }
  }
  localStorage.setItem(MIGRATION_FLAG, '1');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<HomePage />} />
            <Route path="docs/*" element={<DocsPage />} />
            <Route path="highlights" element={<HighlightsPage />} />
            <Route path="diagrams/*" element={<DiagramsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="manage" element={<ContentManagementPage />} />
            <Route path="*" element={<Navigate to="/docs" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
