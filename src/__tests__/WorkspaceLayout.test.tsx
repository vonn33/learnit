import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout';

const Left = () => <div data-testid="left">Map</div>;
const Right = () => <div data-testid="right">Reader</div>;

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

  it('can focus left pane', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    const focusLeftBtn = screen.getByLabelText('Focus map');
    fireEvent.click(focusLeftBtn);
    const leftPane = screen.getByTestId('left').parentElement!;
    expect(leftPane.style.flexGrow).toBe('1');
  });

  it('can focus right pane', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    const focusRightBtn = screen.getByLabelText('Focus reader');
    fireEvent.click(focusRightBtn);
    const rightPane = screen.getByTestId('right').parentElement!;
    expect(rightPane.style.flexGrow).toBe('1');
  });

  it('can return to split mode from focused', () => {
    render(<WorkspaceLayout left={<Left />} right={<Right />} />);
    fireEvent.click(screen.getByLabelText('Focus map'));
    fireEvent.click(screen.getByLabelText('Reset layout'));
    expect(screen.getByTestId('left')).toBeVisible();
    expect(screen.getByTestId('right')).toBeVisible();
  });
});
