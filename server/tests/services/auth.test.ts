import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loginService } from '../../src/services/auth';
import { prisma } from '../../src/prisma';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UnauthorizedError } from '../../src/utils/errors';

// Mock the prisma client
vi.mock('../../src/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully authenticate user with correct credentials', async () => {
    const mockPasswordHash = await bcrypt.hash('Password123', 10);
    const mockUser = {
      id: 'user-id-123',
      email: 'manager@transitops.com',
      passwordHash: mockPasswordHash,
      role: 'FLEET_MANAGER',
    };

    // Setup prisma mock to return the mock user
    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    const result = await loginService({
      email: 'manager@transitops.com',
      password: 'Password123',
    });

    expect(result).toBeDefined();
    expect(result.user.email).toBe('manager@transitops.com');
    expect(result.user.role).toBe('FLEET_MANAGER');
    expect(result.token).toBeDefined();

    // Verify token content
    const decoded = jwt.decode(result.token) as any;
    expect(decoded.id).toBe('user-id-123');
    expect(decoded.email).toBe('manager@transitops.com');
    expect(decoded.role).toBe('FLEET_MANAGER');
  });

  it('should throw UnauthorizedError if user does not exist', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);

    await expect(
      loginService({
        email: 'nonexistent@transitops.com',
        password: 'Password123',
      })
    ).rejects.toThrow(UnauthorizedError);
  });

  it('should throw UnauthorizedError if password is incorrect', async () => {
    const mockPasswordHash = await bcrypt.hash('Password123', 10);
    const mockUser = {
      id: 'user-id-123',
      email: 'manager@transitops.com',
      passwordHash: mockPasswordHash,
      role: 'FLEET_MANAGER',
    };

    (prisma.user.findUnique as any).mockResolvedValue(mockUser);

    await expect(
      loginService({
        email: 'manager@transitops.com',
        password: 'WrongPassword',
      })
    ).rejects.toThrow(UnauthorizedError);
  });
});
