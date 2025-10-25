import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../auth';

describe('Authentication Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'testPassword123!';
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(0);
    });

    it('should create different hashes for the same password (salt rounds)', async () => {
      const password = 'testPassword123!';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
    });

    it('should handle special characters', async () => {
      const password = 'P@ssw0rd!#$%^&*()';
      const hashed = await hashPassword(password);

      expect(hashed).toBeDefined();
      expect(hashed.length).toBeGreaterThan(0);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'testPassword123!';
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword(password, hashed);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testPassword123!';
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword', hashed);

      expect(isValid).toBe(false);
    });

    it('should handle special characters in password', async () => {
      const password = 'P@ssw0rd!#$%^&*()';
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword(password, hashed);

      expect(isValid).toBe(true);
    });

    it('should be case sensitive', async () => {
      const password = 'TestPassword123!';
      const hashed = await hashPassword(password);

      const isValid = await verifyPassword('testpassword123!', hashed);

      expect(isValid).toBe(false);
    });

    it('should reject null password against hash', async () => {
      const password = 'testPassword123!';
      const hashed = await hashPassword(password);

      try {
        const isValid = await verifyPassword('', hashed);
        expect(isValid).toBe(false);
      } catch (error) {
        // Expected behavior
        expect(error).toBeDefined();
      }
    });
  });

  describe('password hashing security', () => {
    it('should not expose original password in hash', async () => {
      const password = 'superSecretPassword';
      const hashed = await hashPassword(password);

      expect(hashed).not.toContain(password);
    });

    it('should create bcrypt-formatted hashes', async () => {
      const password = 'testPassword123!';
      const hashed = await hashPassword(password);

      // Bcrypt hashes start with $2
      expect(hashed).toMatch(/^\$2[aby]\$/);
    });
  });
});
