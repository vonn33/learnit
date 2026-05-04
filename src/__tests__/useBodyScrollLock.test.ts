import {describe, it, expect, beforeEach, afterEach} from 'vitest';
import {renderHook} from '@testing-library/react';
import {useBodyScrollLock} from '@/lib/useBodyScrollLock';

describe('useBodyScrollLock', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('does nothing when active is false', () => {
    renderHook(() => useBodyScrollLock(false));
    expect(document.body.style.overflow).toBe('');
  });

  it('locks body overflow when active is true', () => {
    renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores prior overflow value on unmount', () => {
    document.body.style.overflow = 'auto';
    const {unmount} = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('auto');
  });

  it('restores prior value when active flips back to false', () => {
    document.body.style.overflow = 'auto';
    const {rerender} = renderHook(({a}) => useBodyScrollLock(a), {
      initialProps: {a: true},
    });
    expect(document.body.style.overflow).toBe('hidden');
    rerender({a: false});
    expect(document.body.style.overflow).toBe('auto');
  });

  it('handles stacked locks: inner unmount restores outer lock state', () => {
    document.body.style.overflow = 'auto';
    const outer = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    const inner = renderHook(() => useBodyScrollLock(true));
    expect(document.body.style.overflow).toBe('hidden');
    inner.unmount();
    expect(document.body.style.overflow).toBe('hidden');
    outer.unmount();
    expect(document.body.style.overflow).toBe('auto');
  });
});
