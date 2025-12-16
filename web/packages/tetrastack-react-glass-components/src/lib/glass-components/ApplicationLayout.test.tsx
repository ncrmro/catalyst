import { render, screen } from '@testing-library/react';
import { ApplicationLayout } from './ApplicationLayout';
import { describe, it, expect } from 'vitest';

describe('ApplicationLayout', () => {
  it('renders header and children', () => {
    render(
      <ApplicationLayout header={<span>Test Header</span>}>
        <div>Test Content</div>
      </ApplicationLayout>,
    );

    expect(screen.getByText('Test Header')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders nav when provided', () => {
    render(
      <ApplicationLayout header="Header" nav={<nav>Test Nav</nav>}>
        Content
      </ApplicationLayout>,
    );

    expect(screen.getByText('Test Nav')).toBeInTheDocument();
  });
});
