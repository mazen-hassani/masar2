import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth-config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handler = NextAuth(authConfig) as any;

export const GET = handler;
export const POST = handler;
