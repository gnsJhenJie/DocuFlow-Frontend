import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AppLogo } from './AppLogo';

// Mock next/link for testing purposes
// In a real Jest setup, this might go into a setupTests.js or a __mocks__ directory
jest.mock('next/link', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ({ children, href }: { children: React.ReactNode, href: string, [key: string]: any }) => {
    return <a href={href}>{children}</a>;
  };
});

describe('AppLogo Component', () => {
  it('renders the logo with the correct text and link', () => {
    render(<AppLogo />);

    // Check for the link by its role and accessible name (text content)
    const linkElement = screen.getByRole('link', { name: /docuflow/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', '/');

    // Check for the text "DocuFlow"
    const logoText = screen.getByText('DocuFlow');
    expect(logoText).toBeInTheDocument();

    // Check for the BookMarked icon (lucide-react icons are SVGs)
    // This is a basic check; more specific icon checks can be done by looking at SVG paths or titles if needed
    // For simplicity, we check if an SVG element is rendered as part of the logo.
    const svgIcon = linkElement.querySelector('svg');
    expect(svgIcon).toBeInTheDocument();
    // You could add more specific assertions for the SVG if its structure is stable
    // e.g., expect(svgIcon).toHaveClass('lucide-book-marked'); // This depends on how lucide-react outputs classes
  });
});
