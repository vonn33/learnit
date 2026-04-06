import './index.css';
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter, Routes, Route, Navigate} from 'react-router';
import {ThemeProvider} from '@/components/layout/ThemeProvider';
import {Shell} from '@/components/layout/Shell';
import {DocsPage} from '@/pages/DocsPage';
import {HighlightsPage} from '@/pages/HighlightsPage';
import {DiagramsPage} from '@/pages/DiagramsPage';
import {SettingsPage} from '@/pages/SettingsPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Navigate to="/docs" replace />} />
            <Route path="docs/*" element={<DocsPage />} />
            <Route path="highlights" element={<HighlightsPage />} />
            <Route path="diagrams/*" element={<DiagramsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/docs" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  </StrictMode>,
);
