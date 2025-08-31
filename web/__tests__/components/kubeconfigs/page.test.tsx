/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import KubeconfigCore from '@/components/kubeconfig-core';

// Mock navigator.clipboard
const mockWriteText = vi.fn();
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: mockWriteText,
  },
  writable: true,
});

// Mock URL and Blob for download functionality
global.URL.createObjectURL = vi.fn(() => 'mock-url');
global.URL.revokeObjectURL = vi.fn();

describe('KubeconfigCore', () => {
  beforeEach(() => {
    mockWriteText.mockClear();
    (global.URL.createObjectURL as ReturnType<typeof vi.fn>).mockClear();
    (global.URL.revokeObjectURL as ReturnType<typeof vi.fn>).mockClear();
  });

  test('renders kubeconfig component with all required elements', () => {
    render(<KubeconfigCore />);
    
    // Check main heading
    expect(screen.getByText('Kubernetes Configurations')).toBeInTheDocument();
    
    // Check description
    expect(screen.getByText(/Export kubeconfig for use in GitHub Actions/)).toBeInTheDocument();
    
    // Check buttons
    expect(screen.getByTestId('copy-button')).toBeInTheDocument();
    expect(screen.getByTestId('download-button')).toBeInTheDocument();
    
    // Check kubeconfig content is displayed
    const kubeconfigContent = screen.getByTestId('kubeconfig-content');
    expect(kubeconfigContent).toBeInTheDocument();
    expect(kubeconfigContent.textContent).toContain('apiVersion: v1');
    expect(kubeconfigContent.textContent).toContain('kind: Config');
  });

  test('copy functionality works correctly', async () => {
    render(<KubeconfigCore />);
    
    const copyButton = screen.getByTestId('copy-button');
    
    // Click copy button
    fireEvent.click(copyButton);
    
    // Check that clipboard.writeText was called
    expect(mockWriteText).toHaveBeenCalledTimes(1);
    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('apiVersion: v1'));
    
    // Check that button text changes to "Copied!"
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  test('download functionality works correctly', () => {
    render(<KubeconfigCore />);
    
    // Mock document.createElement and appendChild/removeChild after render
    const mockAnchor = {
      click: vi.fn(),
      href: '',
      download: '',
    };
    const mockAppendChild = vi.fn();
    const mockRemoveChild = vi.fn();
    
    const originalCreateElement = document.createElement;
    vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return mockAnchor as any;
      }
      return originalCreateElement.call(document, tagName);
    });
    
    vi.spyOn(document.body, 'appendChild').mockImplementation(mockAppendChild);
    vi.spyOn(document.body, 'removeChild').mockImplementation(mockRemoveChild);
    
    const downloadButton = screen.getByTestId('download-button');
    
    // Click download button
    fireEvent.click(downloadButton);
    
    // Check that download functionality was triggered
    expect(global.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(mockAnchor.click).toHaveBeenCalledTimes(1);
    expect(mockAnchor.download).toBe('kubeconfig.yaml');
    expect(mockAppendChild).toHaveBeenCalledWith(mockAnchor);
    expect(mockRemoveChild).toHaveBeenCalledWith(mockAnchor);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    
    // Restore mocks
    (document.createElement as ReturnType<typeof vi.fn>).mockRestore();
    (document.body.appendChild as ReturnType<typeof vi.fn>).mockRestore();
    (document.body.removeChild as ReturnType<typeof vi.fn>).mockRestore();
  });

  test('kubeconfig contains expected structure and content', () => {
    render(<KubeconfigCore />);
    
    const kubeconfigContent = screen.getByTestId('kubeconfig-content');
    
    // Check for expected kubeconfig sections
    expect(kubeconfigContent.textContent).toContain('clusters:');
    expect(kubeconfigContent.textContent).toContain('contexts:');
    expect(kubeconfigContent.textContent).toContain('users:');
    expect(kubeconfigContent.textContent).toContain('current-context:');
    
    // Check for GitHub Actions service account
    expect(kubeconfigContent.textContent).toContain('github-actions');
    
    // Check cluster name
    expect(kubeconfigContent.textContent).toContain('catalyst-cluster');
  });
});