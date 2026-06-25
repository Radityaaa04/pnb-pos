import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock createServerClient
const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}));

// Mock Next.js server modules - must use inline factory to avoid hoisting issues
const mockRedirect = vi.fn();

vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({
      cookies: { set: vi.fn() },
    })),
    redirect: (...args: unknown[]) => {
      mockRedirect(...args);
      return { type: 'redirect' };
    },
  },
}));

// Set env vars before importing middleware
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key');

import { middleware } from '@/middleware';

function createMockRequest(pathname: string): Parameters<typeof middleware>[0] {
  return {
    nextUrl: {
      clone: () => ({ pathname, searchParams: new URLSearchParams() }),
    },
    cookies: {
      getAll: () => [],
      set: vi.fn(),
    },
  } as Parameters<typeof middleware>[0];
}

describe('middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('unauthenticated user', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: null } });
    });

    it('redirects to /login when accessing protected route /pos', async () => {
      const req = createMockRequest('/pos');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/login');
    });

    it('redirects to /login when accessing /dashboard', async () => {
      const req = createMockRequest('/dashboard');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/login');
    });

    it('redirects to /login when accessing /inventory', async () => {
      const req = createMockRequest('/inventory');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/login');
    });

    it('redirects to /login when accessing /history', async () => {
      const req = createMockRequest('/history');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/login');
    });

    it('redirects to /login from root /', async () => {
      const req = createMockRequest('/');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/login');
    });

    it('does not redirect for non-protected, non-auth routes', async () => {
      const req = createMockRequest('/some-public-page');
      await middleware(req);
      // Should not redirect to login since it's not a protected route
      if (mockRedirect.mock.calls.length > 0) {
        const redirectArg = mockRedirect.mock.calls[0][0];
        expect(redirectArg.pathname).not.toBe('/login');
      }
    });
  });

  describe('authenticated user (kasir role)', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { role: 'kasir' } }),
          }),
        }),
      });
    });

    it('redirects from /login to /pos when already authenticated', async () => {
      const req = createMockRequest('/login');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/pos');
    });

    it('redirects from root / to /pos', async () => {
      const req = createMockRequest('/');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/pos');
    });

    it('redirects kasir from /dashboard to /pos', async () => {
      const req = createMockRequest('/dashboard');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/pos');
    });

    it('redirects kasir from /inventory to /pos', async () => {
      const req = createMockRequest('/inventory');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/pos');
    });

    it('redirects kasir from /settings to /pos', async () => {
      const req = createMockRequest('/settings');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/pos');
    });

    it('redirects kasir from /vouchers to /pos', async () => {
      const req = createMockRequest('/vouchers');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/pos');
    });
  });

  describe('authenticated user (owner role)', () => {
    beforeEach(() => {
      mockGetUser.mockResolvedValue({ data: { user: { id: 'user-owner' } } });
      mockFrom.mockReturnValue({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { role: 'owner' } }),
          }),
        }),
      });
    });

    it('allows owner to access /dashboard (no redirect to /pos)', async () => {
      const req = createMockRequest('/dashboard');
      await middleware(req);
      // Owner should NOT be redirected to /pos
      const posRedirects = mockRedirect.mock.calls.filter(
        (call) => call[0]?.pathname === '/pos'
      );
      expect(posRedirects).toHaveLength(0);
    });

    it('allows owner to access /inventory (no redirect to /pos)', async () => {
      const req = createMockRequest('/inventory');
      await middleware(req);
      const posRedirects = mockRedirect.mock.calls.filter(
        (call) => call[0]?.pathname === '/pos'
      );
      expect(posRedirects).toHaveLength(0);
    });

    it('allows owner to access /vouchers (no redirect to /pos)', async () => {
      const req = createMockRequest('/vouchers');
      await middleware(req);
      const posRedirects = mockRedirect.mock.calls.filter(
        (call) => call[0]?.pathname === '/pos'
      );
      expect(posRedirects).toHaveLength(0);
    });

    it('allows owner to access /settings (no redirect to /pos)', async () => {
      const req = createMockRequest('/settings');
      await middleware(req);
      const posRedirects = mockRedirect.mock.calls.filter(
        (call) => call[0]?.pathname === '/pos'
      );
      expect(posRedirects).toHaveLength(0);
    });

    it('redirects owner from /login to /pos', async () => {
      const req = createMockRequest('/login');
      await middleware(req);
      expect(mockRedirect).toHaveBeenCalled();
      const redirectArg = mockRedirect.mock.calls[0][0];
      expect(redirectArg.pathname).toBe('/pos');
    });
  });
});
