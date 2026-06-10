import { render, screen, fireEvent } from '@testing-library/react';
import { FilterBar } from '@/components/FilterBar';

describe('FilterBar Component', () => {
  it('renders correctly with default filters', () => {
    const mockOnChange = jest.fn();
    render(
      <FilterBar 
        filters={{ type: 'all', location: 'all' }} 
        onChange={mockOnChange} 
      />
    );
    
    expect(screen.getByText('All Types')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Internships')).toBeInTheDocument();
    expect(screen.getByText('Hackathons')).toBeInTheDocument();
    
    expect(screen.getByText('Anywhere')).toBeInTheDocument();
    expect(screen.getByText('India')).toBeInTheDocument();
    expect(screen.getByText('Global / Remote')).toBeInTheDocument();
  });

  it('calls onChange when a type tab is clicked', () => {
    const mockOnChange = jest.fn();
    render(
      <FilterBar 
        filters={{ type: 'all', location: 'all' }} 
        onChange={mockOnChange} 
      />
    );
    
    fireEvent.click(screen.getByText('Jobs'));
    expect(mockOnChange).toHaveBeenCalledWith({ type: 'job', location: 'all' });
  });

  it('calls onChange when location tab is clicked', () => {
    const mockOnChange = jest.fn();
    render(
      <FilterBar 
        filters={{ type: 'all', location: 'all' }} 
        onChange={mockOnChange} 
      />
    );
    
    fireEvent.click(screen.getByText('India'));
    expect(mockOnChange).toHaveBeenCalledWith({ type: 'all', location: 'india' });
  });
});
