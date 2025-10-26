/**
 * API Response Utilities
 * Standard response format for all API endpoints
 */

import { NextResponse } from 'next/server';

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    skip?: number;
    take?: number;
  };
}

export interface PaginatedResponse<T = unknown> {
  success: boolean;
  data: T[];
  error?: string;
  meta: {
    total: number;
    skip: number;
    take: number;
  };
}

// ============================================================================
// RESPONSE BUILDERS
// ============================================================================

export class ApiResponseBuilder {
  /**
   * Success response
   */
  static success<T>(data: T, status: number = 200): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
      },
      { status }
    );
  }

  /**
   * Success response with metadata
   */
  static successWithMeta<T>(
    data: T,
    meta: { total?: number; skip?: number; take?: number },
    status: number = 200
  ): NextResponse<ApiResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
        meta,
      },
      { status }
    );
  }

  /**
   * Paginated success response
   */
  static paginated<T>(
    data: T[],
    total: number,
    skip: number,
    take: number,
    status: number = 200
  ): NextResponse<PaginatedResponse<T>> {
    return NextResponse.json(
      {
        success: true,
        data,
        meta: { total, skip, take },
      },
      { status }
    );
  }

  /**
   * Error response
   */
  static error(message: string, status: number = 400): NextResponse<ApiResponse> {
    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status }
    );
  }

  /**
   * Bad request error
   */
  static badRequest(message: string): NextResponse<ApiResponse> {
    return this.error(message, 400);
  }

  /**
   * Unauthorized error
   */
  static unauthorized(message: string = 'Unauthorized'): NextResponse<ApiResponse> {
    return this.error(message, 401);
  }

  /**
   * Forbidden error
   */
  static forbidden(message: string = 'Forbidden'): NextResponse<ApiResponse> {
    return this.error(message, 403);
  }

  /**
   * Not found error
   */
  static notFound(message: string = 'Not found'): NextResponse<ApiResponse> {
    return this.error(message, 404);
  }

  /**
   * Internal server error
   */
  static internalError(message: string = 'Internal server error'): NextResponse<ApiResponse> {
    return this.error(message, 500);
  }
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export class RequestValidator {
  /**
   * Get tenant ID from request (from session/context)
   */
  static getTenantId(headers: Headers): string | null {
    // In production, extract from session
    return headers.get('x-tenant-id') || null;
  }

  /**
   * Get user ID from request (from session/context)
   */
  static getUserId(headers: Headers): string | null {
    // In production, extract from session
    return headers.get('x-user-id') || null;
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(skip?: number, take?: number): { skip: number; take: number } {
    const validSkip = Math.max(0, skip || 0);
    const validTake = Math.min(100, Math.max(1, take || 50)); // Max 100 per page

    return { skip: validSkip, take: validTake };
  }

  /**
   * Validate required fields
   */
  static validateRequired(obj: Record<string, unknown>, fields: string[]): ValidationError[] {
    const errors: ValidationError[] = [];

    for (const field of fields) {
      if (!obj[field]) {
        errors.push({
          field,
          message: `${field} is required`,
        });
      }
    }

    return errors;
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate UUID format
   */
  static isValidUUID(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id) || id.length > 8; // Allow custom IDs too
  }
}
