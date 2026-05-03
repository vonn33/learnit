import {describe, it, expect, beforeEach} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {DocNav} from '@/components/reader/DocNav';
import {useDocStore, type Doc} from '@/store/docStore';

function makeDoc(overrides: Partial<Doc> & {id: string; slug: string; title: string}): Doc {
  return {
    id: overrides.id,
    title: overrides.title,
    slug: overrides.slug,
    project: 'lang',
    section: 'refs',
    content_md: '',
    abstract: '',
    toc_json: [],
    word_count: 0,
    user_id: null,
    created_at: overrides.created_at ?? '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('DocNav', () => {
  beforeEach(() => {
    useDocStore.setState({
      docs: [
        makeDoc({id: '1', slug: 'alpha', title: 'Alpha', created_at: '2024-01-01T00:00:00Z'}),
        makeDoc({id: '2', slug: 'beta', title: 'Beta', created_at: '2024-01-02T00:00:00Z'}),
        makeDoc({id: '3', slug: 'gamma', title: 'Gamma', created_at: '2024-01-03T00:00:00Z'}),
      ],
    });
  });

  it('shows only Next on first doc', () => {
    render(
      <MemoryRouter>
        <DocNav currentPath="/docs/lang/refs/alpha" />
      </MemoryRouter>,
    );
    expect(screen.queryByText(/Alpha/)).not.toBeInTheDocument();
    expect(screen.getByText(/Beta/)).toBeInTheDocument();
  });

  it('shows both Prev and Next on middle doc', () => {
    render(
      <MemoryRouter>
        <DocNav currentPath="/docs/lang/refs/beta" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Alpha/)).toBeInTheDocument();
    expect(screen.getByText(/Gamma/)).toBeInTheDocument();
  });

  it('shows only Prev on last doc', () => {
    render(
      <MemoryRouter>
        <DocNav currentPath="/docs/lang/refs/gamma" />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Beta/)).toBeInTheDocument();
    expect(screen.queryByText(/Alpha/)).not.toBeInTheDocument();
  });

  it('renders nothing when path not in docStore', () => {
    const {container} = render(
      <MemoryRouter>
        <DocNav currentPath="/docs/unknown/path/here" />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });
});
