import {describe, it, expect} from 'vitest';
import {render, screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router';
import {DocNav} from '@/components/reader/DocNav';
import {vi} from 'vitest';

// Mock the manifest used by DocNav
vi.mock('@/data/content-manifest.json', () => ({
  default: {
    'lang': {
      label: 'Lang',
      link: 'lang/index',
      sections: {
        'refs': {
          label: 'Refs',
          link: 'lang/refs/index',
          docs: ['alpha', 'beta', 'gamma'],
        },
      },
    },
  },
}));

describe('DocNav', () => {
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

  it('renders nothing when path not in manifest', () => {
    const {container} = render(
      <MemoryRouter>
        <DocNav currentPath="/docs/unknown/path/here" />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });
});
