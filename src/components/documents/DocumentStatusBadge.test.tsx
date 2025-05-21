import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { DocumentStatusBadge } from './DocumentStatusBadge';
import type { ReviewStatus } from '@/lib/types';

describe('DocumentStatusBadge Component', () => {
  // Test cases based on the implementation in DocumentStatusBadge.tsx
  const testCases: { status: ReviewStatus; expectedText: string; expectedClassSubstrings: string[] }[] = [
    { 
      status: 'draft', 
      expectedText: 'Draft', 
      expectedClassSubstrings: ['bg-gray-100', 'text-gray-800', 'border-gray-300'] 
    },
    { 
      status: 'pending_review', 
      expectedText: 'Pending Review', 
      expectedClassSubstrings: ['bg-yellow-100', 'text-yellow-800', 'border-yellow-300'] 
    },
    { 
      status: 'approved', 
      expectedText: 'Approved', 
      expectedClassSubstrings: ['bg-green-100', 'text-green-800', 'border-green-300'] 
    },
    { 
      status: 'rejected', 
      expectedText: 'Rejected', 
      expectedClassSubstrings: ['bg-red-100', 'text-red-800', 'border-red-300'] 
    },
  ];

  testCases.forEach(({ status, expectedText, expectedClassSubstrings }) => {
    it(\`renders correctly for status: \${status}\`, () => {
      render(<DocumentStatusBadge status={status} />);
      
      const badgeElement = screen.getByText(expectedText);
      expect(badgeElement).toBeInTheDocument();
      
      // Check for specific classes. Note that cn might reorder them.
      // So, it's often better to check for the presence of key styling classes.
      expectedClassSubstrings.forEach(substring => {
        expect(badgeElement.className).toContain(substring);
      });

      // Also check general badge classes
      expect(badgeElement).toHaveClass('capitalize');
      expect(badgeElement).toHaveClass('px-2.5');
      expect(badgeElement).toHaveClass('py-1');
      expect(badgeElement).toHaveClass('text-xs');
      expect(badgeElement).toHaveClass('font-semibold');
      // Check that it's a 'div' as per Badge component's implementation
      expect(badgeElement.tagName.toLowerCase()).toBe('div');

    });
  });
});
