/* eslint-disable no-console */
import { z } from 'zod';
import type { AppConfiguration } from '@/types/config';

/**
 * Environment Variable Schema
 * Defines all configuration with types, defaults, and validation
 * Validates at module load time - fails fast if required vars missing
 */

const envSchema = z.object({
  // Application
  NODE_ENV: z
    .enum(['development', 'staging', 'production'])
    .default('development'),
  DEBUG: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),
  PORT: z.string().default('3000').transform(Number),

  // Database (Required)
  DATABASE_URL: z
    .string()
    .url('DATABASE_URL must be a valid database URL')
    .min(1, 'DATABASE_URL is required'),

  // Database - Optional (for migrations)
  POSTGRES_URL: z.string().optional(),

  // NextAuth (Required)
  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET must be at least 32 characters')
    .min(1, 'NEXTAUTH_SECRET is required'),

  NEXTAUTH_URL: z
    .string()
    .url('NEXTAUTH_URL must be a valid URL')
    .default('http://localhost:3000'),

  // JWT (Required)
  JWT_SECRET: z
    .string()
    .min(32, 'JWT_SECRET must be at least 32 characters')
    .min(1, 'JWT_SECRET is required'),

  // Multi-tenancy
  TENANT_IDENTIFIER: z
    .enum(['subdomain', 'header', 'path'])
    .default('subdomain'),

  ENABLE_MULTI_TENANCY: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('true'),

  // Features
  ENABLE_REDIS: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),

  ENABLE_S3: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),

  ENABLE_EMAIL_NOTIFICATIONS: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('false'),

  ENABLE_AUDIT_LOGGING: z
    .string()
    .transform((val) => val === 'true' || val === '1')
    .default('true'),

  // Redis (Optional)
  REDIS_URL: z.string().optional(),

  // S3 (Optional)
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),

  // Email (Optional)
  RESEND_API_KEY: z.string().optional(),
});

type EnvVars = z.infer<typeof envSchema>;

/**
 * Parse and validate environment variables
 * Throws error if validation fails (fail-fast pattern)
 */
function parseEnv(): EnvVars {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment variable validation failed:');
    console.error(result.error.flatten().fieldErrors);
    throw new Error(
      `Invalid environment variables: ${JSON.stringify(
        result.error.flatten().fieldErrors
      )}`
    );
  }

  return result.data;
}

const env = parseEnv();

/**
 * Application Configuration
 * Centralized configuration object with type safety
 * Exported for use throughout the application
 */
export const config: AppConfiguration = {
  app: {
    name: 'Masar Portfolio Manager',
    description: 'Government-grade Portfolio Management System',
    version: '0.1.0',
    environment: env.NODE_ENV,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isStaging: env.NODE_ENV === 'staging',
    debug: env.DEBUG,
    port: env.PORT,
  },

  database: {
    url: env.DATABASE_URL,
    postgresUrl: env.POSTGRES_URL,
  },

  auth: {
    secret: env.NEXTAUTH_SECRET,
    url: env.NEXTAUTH_URL,
    jwtSecret: env.JWT_SECRET,
    sessionMaxAge: 24 * 60 * 60, // 24 hours in seconds
  },

  tenant: {
    identifier: env.TENANT_IDENTIFIER,
    enableMultiTenancy: env.ENABLE_MULTI_TENANCY,
  },

  features: {
    enableRedis: env.ENABLE_REDIS,
    enableS3: env.ENABLE_S3,
    enableEmailNotifications: env.ENABLE_EMAIL_NOTIFICATIONS,
    enableAuditLogging: env.ENABLE_AUDIT_LOGGING,
  },

  externalServices: {
    ...(env.REDIS_URL && {
      redis: {
        url: env.REDIS_URL,
      },
    }),
    ...(env.S3_BUCKET && {
      s3: {
        bucket: env.S3_BUCKET,
        region: env.S3_REGION || 'us-east-1',
        accessKeyId: env.S3_ACCESS_KEY_ID || '',
        secretAccessKey: env.S3_SECRET_ACCESS_KEY || '',
      },
    }),
    ...(env.RESEND_API_KEY && {
      email: {
        apiKey: env.RESEND_API_KEY,
      },
    }),
  },
};

/**
 * Re-export configuration for convenience
 */
export default config;

/**
 * Validate that required external services are configured when features are enabled
 */
if (config.features.enableRedis && !config.externalServices.redis) {
  console.warn('Redis feature enabled but REDIS_URL not configured');
}

if (config.features.enableS3 && !config.externalServices.s3) {
  console.warn('S3 feature enabled but S3 credentials not configured');
}

if (config.features.enableEmailNotifications && !config.externalServices.email) {
  console.warn('Email notifications enabled but RESEND_API_KEY not configured');
}

/**
 * Log configuration info at startup (non-sensitive)
 */
if (config.app.debug) {
  console.log('[Config] Application initialized:', {
    environment: config.app.environment,
    features: config.features,
    tenantMultiTenancy: config.tenant.enableMultiTenancy,
    externalServices: Object.keys(config.externalServices),
  });
}
