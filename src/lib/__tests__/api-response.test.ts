/**
 * API Response Utilities Tests
 * Tests for ApiResponseBuilder and RequestValidator
 */

import { describe, it, expect } from 'vitest';
import { ApiResponseBuilder, RequestValidator } from '@/lib/api/response';

describe('API Response Utilities', () => {
  describe('ApiResponseBuilder', () => {
    it('should create success response', () => {
      const data = { id: '1', name: 'Test' };
      const response = ApiResponseBuilder.success(data);

      expect(response.status).toBe(200);
    });

    it('should create success response with custom status', () => {
      const data = { id: '1' };
      const response = ApiResponseBuilder.success(data, 201);

      expect(response.status).toBe(201);
    });

    it('should create paginated response', () => {
      const data = [{ id: '1' }, { id: '2' }];
      const response = ApiResponseBuilder.paginated(data, 10, 0, 2);

      expect(response.status).toBe(200);
    });

    it('should create bad request error', () => {
      const response = ApiResponseBuilder.badRequest('Invalid input');

      expect(response.status).toBe(400);
    });

    it('should create unauthorized error', () => {
      const response = ApiResponseBuilder.unauthorized();

      expect(response.status).toBe(401);
    });

    it('should create forbidden error', () => {
      const response = ApiResponseBuilder.forbidden();

      expect(response.status).toBe(403);
    });

    it('should create not found error', () => {
      const response = ApiResponseBuilder.notFound();

      expect(response.status).toBe(404);
    });

    it('should create internal server error', () => {
      const response = ApiResponseBuilder.internalError();

      expect(response.status).toBe(500);
    });

    it('should create success response with metadata', () => {
      const data = { id: '1' };
      const meta = { total: 100, skip: 0, take: 50 };
      const response = ApiResponseBuilder.successWithMeta(data, meta);

      expect(response.status).toBe(200);
    });
  });

  describe('RequestValidator', () => {
    it('should extract tenant ID from headers', () => {
      const headers = new Headers({ 'x-tenant-id': 'tenant-123' });
      const tenantId = RequestValidator.getTenantId(headers);

      expect(tenantId).toBe('tenant-123');
    });

    it('should return null if tenant ID missing', () => {
      const headers = new Headers();
      const tenantId = RequestValidator.getTenantId(headers);

      expect(tenantId).toBeNull();
    });

    it('should extract user ID from headers', () => {
      const headers = new Headers({ 'x-user-id': 'user-456' });
      const userId = RequestValidator.getUserId(headers);

      expect(userId).toBe('user-456');
    });

    it('should validate pagination parameters', () => {
      const result = RequestValidator.validatePagination(150, 200);

      expect(result.skip).toBe(150);
      expect(result.take).toBe(100); // Max is 100
    });

    it('should set default pagination values', () => {
      const result = RequestValidator.validatePagination();

      expect(result.skip).toBe(0);
      expect(result.take).toBe(50);
    });

    it('should validate required fields', () => {
      const obj = { name: 'Test', email: 'test@example.com' };
      const errors = RequestValidator.validateRequired(obj, ['name', 'email', 'phone']);

      expect(errors.length).toBe(1);
      expect(errors[0].field).toBe('phone');
    });

    it('should validate email format', () => {
      expect(RequestValidator.isValidEmail('test@example.com')).toBe(true);
      expect(RequestValidator.isValidEmail('invalid-email')).toBe(false);
    });

    it('should validate UUID format', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const tooShortId = 'short';
      const customId = 'custom-id-123';
      const longCustomId = 'not-a-uuid'; // Length 11 > 8, so it's valid as custom ID

      expect(RequestValidator.isValidUUID(validUUID)).toBe(true);
      expect(RequestValidator.isValidUUID(tooShortId)).toBe(false); // Too short
      expect(RequestValidator.isValidUUID(customId)).toBe(true); // Custom IDs with length > 8 allowed
      expect(RequestValidator.isValidUUID(longCustomId)).toBe(true); // Custom IDs allowed
    });
  });
});
