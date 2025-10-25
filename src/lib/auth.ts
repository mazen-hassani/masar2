import { hash, compare } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password to verify
 * @param hash - Hashed password from database
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return compare(password, hash);
}

/**
 * Find a user by email and verify their password
 * @param email - User email
 * @param password - Plain text password
 * @param tenantId - Tenant ID for isolation
 * @returns User object if credentials valid, null otherwise
 */
export async function authenticateUser(
  email: string,
  password: string,
  tenantId: string
): Promise<{ id: string; email: string; name: string | null; tenantId: string } | null> {
  try {
    const user = await prisma.user.findFirst({
      where: {
        email: email.toLowerCase(),
        tenantId,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        tenantId: true,
      },
    });

    if (!user) {
      return null;
    }

    if (!user.passwordHash) {
      // User created via SSO or no password set
      return null;
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      return null;
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

/**
 * Get user's roles for permission checking
 * @param userId - User ID
 * @param contextType - Context type: 'Global', 'Program', 'Project'
 * @param contextId - Context ID (program or project ID)
 * @returns Array of roles for the given context
 */
export async function getUserRoles(
  userId: string,
  contextType: 'Global' | 'Program' | 'Project' = 'Global',
  contextId?: string
): Promise<string[]> {
  try {
    const roles = await prisma.userRole.findMany({
      where: {
        userId,
        contextType,
        contextId: contextId || null,
        isActive: true,
        OR: [
          { validUntil: null },
          { validUntil: { gt: new Date() } },
        ],
      },
      select: {
        role: true,
      },
    });

    return roles.map((r) => r.role);
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }
}

/**
 * Check if user has a specific role
 * @param userId - User ID
 * @param role - Role name to check
 * @param contextType - Context type
 * @param contextId - Context ID
 * @returns True if user has the role, false otherwise
 */
export async function hasRole(
  userId: string,
  role: string,
  contextType: 'Global' | 'Program' | 'Project' = 'Global',
  contextId?: string
): Promise<boolean> {
  const roles = await getUserRoles(userId, contextType, contextId);
  return roles.includes(role);
}

/**
 * Check if user has any of the specified roles
 * @param userId - User ID
 * @param roles - Array of roles to check
 * @param contextType - Context type
 * @param contextId - Context ID
 * @returns True if user has any of the roles, false otherwise
 */
export async function hasAnyRole(
  userId: string,
  roles: string[],
  contextType: 'Global' | 'Program' | 'Project' = 'Global',
  contextId?: string
): Promise<boolean> {
  const userRoles = await getUserRoles(userId, contextType, contextId);
  return userRoles.some((role) => roles.includes(role));
}
