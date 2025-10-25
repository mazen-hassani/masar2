import { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { z } from 'zod';
import { authenticateUser, getUserRoles } from './auth';

const credentialsSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  tenantId: z.string().min(1, 'Tenant ID is required'),
});

export const authConfig = {
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        tenantId: { label: 'Tenant ID', type: 'text' },
      },
      async authorize(credentials) {
        try {
          // Validate input
          const parsed = credentialsSchema.safeParse(credentials);
          if (!parsed.success) {
            throw new Error('Invalid credentials format');
          }

          const { email, password, tenantId } = parsed.data;

          // Authenticate user
          const user = await authenticateUser(email, password, tenantId);

          if (!user) {
            throw new Error('Invalid email or password');
          }

          // Get user's roles
          const roles = await getUserRoles(user.id, 'Global');

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            tenantId: user.tenantId,
            roles,
          };
        } catch (error) {
          console.error('Authorization error:', error);
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: '/login',
    error: '/login',
  },

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tenantId = (user as unknown as Record<string, unknown>).tenantId;
        token.roles = ((user as unknown as Record<string, unknown>).roles as string[]) || [];
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as unknown as Record<string, unknown>).tenantId = token.tenantId as string;
        (session.user as unknown as Record<string, unknown>).roles = token.roles as string[];
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      // Allow relative URLs
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      // Allow same origin URLs
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  events: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async signIn({ user }) {
      if (user?.email) {
        // Logging for debugging - can be removed or sent to analytics
      }
    },

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async signOut() {
      // Logging for debugging - can be removed or sent to analytics
    },
  },

  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
    updateAge: 24 * 60 * 60, // Update session every 24 hours
  },

  jwt: {
    maxAge: 24 * 60 * 60, // 24 hours
  },
} satisfies NextAuthConfig;
