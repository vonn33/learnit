import {describe, it, expect, beforeEach} from 'vitest';
import {render, screen, fireEvent, act} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {QuickSettingsPopover} from '@/components/ui/QuickSettingsPopover';
import {useReaderStore} from '@/store/readerStore';
import {useHandbookStore} from '@/store';

describe('QuickSettingsPopover', () => {
  beforeEach(() => {
    useReaderStore.getState().reset();
    useHandbookStore.getState().setTheme('dark');
  });

  function renderPopover() {
    return render(
      <MemoryRouter>
        <QuickSettingsPopover />
      </MemoryRouter>,
    );
  }

  it('renders trigger button only initially', () => {
    renderPopover();
    expect(screen.getByLabelText('Quick settings')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens popover on trigger click', () => {
    renderPopover();
    fireEvent.click(screen.getByLabelText('Quick settings'));
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('closes popover on Escape', () => {
    renderPopover();
    fireEvent.click(screen.getByLabelText('Quick settings'));
    act(() => {
      fireEvent.keyDown(document, {key: 'Escape'});
    });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('Theme buttons dispatch setTheme', () => {
    renderPopover();
    fireEvent.click(screen.getByLabelText('Quick settings'));
    fireEvent.click(screen.getByRole('button', {name: /Light/i}));
    expect(useHandbookStore.getState().theme).toBe('light');
  });

  it('Tint swatches dispatch setPaperTint', () => {
    renderPopover();
    fireEvent.click(screen.getByLabelText('Quick settings'));
    fireEvent.click(screen.getByRole('button', {name: /Vellum/i}));
    expect(useReaderStore.getState().paperTint).toBe('vellum');
  });

  it('Size A+/A- bump font size', () => {
    renderPopover();
    fireEvent.click(screen.getByLabelText('Quick settings'));
    useReaderStore.getState().setFontSize('m');
    fireEvent.click(screen.getByLabelText('Increase size'));
    expect(useReaderStore.getState().fontSize).toBe('l');
    fireEvent.click(screen.getByLabelText('Decrease size'));
    fireEvent.click(screen.getByLabelText('Decrease size'));
    expect(useReaderStore.getState().fontSize).toBe('s');
  });
});
