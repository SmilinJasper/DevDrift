import { render, screen, fireEvent } from '@testing-library/react';
import { ListingCard } from '@/components/ListingCard';
import type { Listing } from '@/types/database';

const mockListing: Listing = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  title: 'Software Engineer Intern',
  description: 'Join our team for the summer.',
  type: 'internship',
  location: 'San Francisco, CA',
  is_remote: true,
  application_url: 'https://example.com/apply',
  tags: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
  popularity_score: 1.5,
  is_published: true,
  starts_at: '2026-06-01T00:00:00Z',
  ends_at: '2026-08-31T00:00:00Z',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('ListingCard Component', () => {
  beforeAll(() => {
    // Mock fetch for the viewObserver fetch call inside ListingCard
    global.fetch = jest.fn(() => Promise.resolve(new Response()));
  });

  it('renders listing details correctly', () => {
    render(<ListingCard listing={mockListing} />);
    
    expect(screen.getByText('Software Engineer Intern')).toBeInTheDocument();
    expect(screen.getByText('Join our team for the summer.')).toBeInTheDocument();
    expect(screen.getByText('internship')).toBeInTheDocument();
    
    // Location + Remote formatting check
    expect(screen.getByText('Remote • San Francisco, CA')).toBeInTheDocument();
    
    // Tags
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument(); // 4th tag truncated
  });

  it('calls onSaveToggle when bookmark is clicked', () => {
    const mockOnSaveToggle = jest.fn();
    render(<ListingCard listing={mockListing} onSaveToggle={mockOnSaveToggle} isSaved={false} />);
    
    const saveButton = screen.getByLabelText('Save');
    fireEvent.click(saveButton);
    
    expect(mockOnSaveToggle).toHaveBeenCalledWith(mockListing.id, false);
  });
});
