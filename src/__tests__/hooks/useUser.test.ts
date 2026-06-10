import { renderHook, waitFor } from '@testing-library/react';
import { useUser, MOCK_USER_ID } from '@/hooks/useUser';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';

// Mock the supabase client module
jest.mock('@/lib/supabase/client', () => ({
  createSupabaseBrowserClient: jest.fn(),
}));

describe('useUser Hook', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns user id when authenticated', async () => {
    const mockUnsubscribe = jest.fn();
    (createSupabaseBrowserClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-123' } } } }),
        onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } }),
      },
    });

    const { result } = renderHook(() => useUser());

    expect(result.current).toBeNull(); // Initial state

    await waitFor(() => {
      expect(result.current).toBe('user-123');
    });
  });

  it('returns MOCK_USER_ID when unauthenticated', async () => {
    const mockUnsubscribe = jest.fn();
    (createSupabaseBrowserClient as jest.Mock).mockReturnValue({
      auth: {
        getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
        onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } }),
      },
    });

    const { result } = renderHook(() => useUser());

    await waitFor(() => {
      expect(result.current).toBe(MOCK_USER_ID);
    });
  });
});
