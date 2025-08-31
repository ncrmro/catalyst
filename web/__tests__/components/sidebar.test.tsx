/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import { vi, describe, it, expect, afterEach, beforeEach } from 'vitest';

// Mock usePathname
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

const mockUsePathname = usePathname as ReturnType<typeof vi.fn>;

describe('Sidebar Component', () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue('/');
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders all navigation items for non-admin users except clusters', () => {
    render(<Sidebar user={{ admin: false }} />);
    
    // Should show regular navigation items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Pull Requests')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Kubeconfigs')).toBeInTheDocument();
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    
    // Should NOT show clusters link
    expect(screen.queryByText('Clusters')).not.toBeInTheDocument();
  });

  it('renders all navigation items for admin users including clusters', () => {
    render(<Sidebar user={{ admin: true }} />);
    
    // Should show regular navigation items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Pull Requests')).toBeInTheDocument();
    expect(screen.getByText('Teams')).toBeInTheDocument();
    expect(screen.getByText('Kubeconfigs')).toBeInTheDocument();
    expect(screen.getByText('Infrastructure')).toBeInTheDocument();
    
    // Should show clusters link for admin
    expect(screen.getByText('Clusters')).toBeInTheDocument();
  });

  it('does not show clusters when user is undefined', () => {
    render(<Sidebar />);
    
    // Should show regular navigation items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Pull Requests')).toBeInTheDocument();
    
    // Should NOT show clusters link when user is undefined
    expect(screen.queryByText('Clusters')).not.toBeInTheDocument();
  });

  it('does not show clusters when user admin is undefined', () => {
    render(<Sidebar user={{}} />);
    
    // Should show regular navigation items
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Pull Requests')).toBeInTheDocument();
    
    // Should NOT show clusters link when admin property is undefined
    expect(screen.queryByText('Clusters')).not.toBeInTheDocument();
  });

  it('highlights active navigation item correctly', () => {
    mockUsePathname.mockReturnValue('/clusters');
    
    render(<Sidebar user={{ admin: true }} />);
    
    const clustersLink = screen.getByText('Clusters').closest('a');
    expect(clustersLink).toHaveClass('bg-primary-container', 'text-on-primary-container');
  });

  it('clusters link has correct href', () => {
    render(<Sidebar user={{ admin: true }} />);
    
    const clustersLink = screen.getByText('Clusters').closest('a');
    expect(clustersLink).toHaveAttribute('href', '/clusters');
  });

  it('pull requests link has correct href', () => {
    render(<Sidebar user={{ admin: false }} />);
    
    const pullRequestsLink = screen.getByText('Pull Requests').closest('a');
    expect(pullRequestsLink).toHaveAttribute('href', '/pull-requests');
  });

  it('highlights pull requests navigation item correctly', () => {
    mockUsePathname.mockReturnValue('/pull-requests');
    
    render(<Sidebar user={{ admin: false }} />);
    
    const pullRequestsLink = screen.getByText('Pull Requests').closest('a');
    expect(pullRequestsLink).toHaveClass('bg-primary-container', 'text-on-primary-container');
  });

  it('clusters link has kubernetes icon', () => {
    render(<Sidebar user={{ admin: true }} />);
    
    const clustersLink = screen.getByText('Clusters').closest('a');
    expect(clustersLink).toHaveTextContent('☸️');
  });
});