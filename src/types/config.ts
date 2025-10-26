/**
 * Application Configuration Types
 * Defines all configuration sections and their types
 */

export interface DatabaseConfig {
  url: string;
  postgresUrl?: string | undefined; // Direct connection for migrations
}

export interface AuthConfig {
  secret: string;
  url: string;
  jwtSecret: string;
  sessionMaxAge: number; // in seconds
}

export interface AppConfig {
  name: string;
  description: string;
  version: string;
  environment: 'development' | 'staging' | 'production';
  isDevelopment: boolean;
  isProduction: boolean;
  isStaging: boolean;
  debug: boolean;
  port: number;
}

export interface TenantConfig {
  identifier: 'subdomain' | 'header' | 'path';
  enableMultiTenancy: boolean;
}

export interface FeaturesConfig {
  enableRedis: boolean;
  enableS3: boolean;
  enableEmailNotifications: boolean;
  enableAuditLogging: boolean;
}

export interface ExternalServicesConfig {
  redis?: {
    url: string;
  };
  s3?: {
    bucket: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  email?: {
    apiKey: string;
  };
}

export interface AppConfiguration {
  app: AppConfig;
  database: DatabaseConfig;
  auth: AuthConfig;
  tenant: TenantConfig;
  features: FeaturesConfig;
  externalServices: ExternalServicesConfig;
}

/**
 * Type guard for environment
 */
export function isEnvironment(
  env: string
): env is 'development' | 'staging' | 'production' {
  return ['development', 'staging', 'production'].includes(env);
}

/**
 * Type guard for feature flags
 */
export type FeatureFlag = keyof FeaturesConfig;
