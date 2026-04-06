import {describe, it, expect, beforeEach} from 'vitest';
import {render, screen, fireEvent} from '@testing-library/react';
import {WorkspaceLayout} from '@/components/workspace/WorkspaceLayout';
import {useWorkspaceStore} from '@/store/workspaceStore';

beforeEach(() => {
  useWorkspaceStore.getState().reset();
});

const Left = () => <div data-testid="left">Reader</div>;
const Right = () => <div data-testid="right">Map</div>;

describe('WorkspaceLayout', () => {
  it('renders both panes in split mode', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    expect(screen.getByTestId('left')).toBeInTheDocument();
    expect(screen.getByTestId('right')).toBeInTheDocument();
  });

  it('renders resize handle between panes', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('can focus left pane (reader)', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    fireEvent.click(screen.getByLabelText('Focus reader'));
    expect(useWorkspaceStore.getState().mode).toBe('focus-left');
  });

  it('can focus right pane (map)', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    fireEvent.click(screen.getByLabelText('Focus map'));
    expect(useWorkspaceStore.getState().mode).toBe('focus-right');
  });

  it('can return to split mode', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    fireEvent.click(screen.getByLabelText('Focus reader'));
    fireEvent.click(screen.getByLabelText('Reset layout'));
    expect(useWorkspaceStore.getState().mode).toBe('split');
  });
});
