import {type ReactNode} from 'react';
import {PaneHandle} from './PaneHandle';
import {Maximize2, Columns2, Eye, EyeOff} from 'lucide-react';
import {useWorkspaceStore} from '@/store/workspaceStore';

interface WorkspaceLayoutProps {
  left: ReactNode;
  right?: ReactNode;
}

export function WorkspaceLayout({left, right}: WorkspaceLayoutProps) {
  const mode = useWorkspaceStore((s) => s.mode);
  const splitPercent = useWorkspaceStore((s) => s.splitPercent);
  const showMap = useWorkspaceStore((s) => s.showMap);
  const setMode = useWorkspaceStore((s) => s.setMode);
  const setSplitPercent = useWorkspaceStore((s) => s.setSplitPercent);
  const setShowMap = useWorkspaceStore((s) => s.setShowMap);

  // No right pane → reader-only layout, no toolbar buttons for splitting
  const hasRight = !!right && showMap;
  const isLeftCollapsed = hasRight && mode === 'focus-right';
  const isRightCollapsed = hasRight && mode === 'focus-left';

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border shrink-0">
        {hasRight && (
          <>
            <button
              aria-label="Focus reader"
              onClick={() => setMode(mode === 'focus-left' ? 'split' : 'focus-left')}
              className="p-1 rounded hover:bg-muted text-foreground/60 hover:text-foreground"
              title="Focus reader"
            >
              <Maximize2 size={14} />
            </button>
            <button
              aria-label="Reset layout"
              onClick={() => setMode('split')}
              className="p-1 rounded hover:bg-muted text-foreground/60 hover:text-foreground"
              title="Split view"
            >
              <Columns2 size={14} />
            </button>
            <button
              aria-label="Focus map"
              onClick={() => setMode(mode === 'focus-right' ? 'split' : 'focus-right')}
              className="p-1 rounded hover:bg-muted text-foreground/60 hover:text-foreground"
              title="Focus map"
            >
              <Maximize2 size={14} />
            </button>
            <div className="w-px h-4 bg-border mx-0.5" />
          </>
        )}
        {right && (
          <button
            aria-label={showMap ? 'Hide concept map' : 'Show concept map'}
            onClick={() => setShowMap(!showMap)}
            className={`p-1 rounded hover:bg-muted ${
              showMap ? 'text-foreground/60 hover:text-foreground' : 'text-primary'
            }`}
            title={showMap ? 'Hide concept map' : 'Show concept map'}
          >
            {showMap ? <Eye size={14} /> : <EyeOff size={14} />}
          </button>
        )}
      </div>

      <div id="workspace-container" className="flex flex-1 overflow-hidden">
        <div
          style={
            hasRight
              ? {
                  width: isLeftCollapsed ? '32px' : mode === 'focus-left' ? '100%' : `${splitPercent}%`,
                  flexGrow: mode === 'focus-left' ? 1 : undefined,
                  minWidth: isLeftCollapsed ? '32px' : undefined,
                }
              : {width: '100%', flexGrow: 1}
          }
          className={`overflow-auto transition-all duration-200 ${isLeftCollapsed ? 'cursor-pointer' : ''}`}
          onClick={isLeftCollapsed ? () => setMode('split') : undefined}
        >
          {left}
        </div>

        {hasRight && mode === 'split' && <PaneHandle onResize={setSplitPercent} />}

        {hasRight && (
          <div
            style={{
              flexGrow: mode === 'focus-right' ? 1 : mode === 'split' ? 1 : undefined,
              width: isRightCollapsed ? '32px' : undefined,
              minWidth: isRightCollapsed ? '32px' : undefined,
            }}
            className={`overflow-auto transition-all duration-200 ${isRightCollapsed ? 'cursor-pointer' : ''}`}
            onClick={isRightCollapsed ? () => setMode('split') : undefined}
          >
            {right}
          </div>
        )}
      </div>
    </div>
  );
}
