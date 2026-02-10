/**
 * UserContextService
 * Manages the currently authenticated user in the Electron main process.
 * Stores userId, role, permissions, and access token in memory.
 * (Refresh token is stored securely in TokenManager)
 */

interface AuthContext {
  userId: number;
  username: string;
  role: string;
  permissions: string[];
  accessToken: string;
}

class UserContextService {
  private currentContext: AuthContext | null = null;

  /**
   * Set the current authenticated user context with access token
   */
  setContext(
    userId: number,
    username: string,
    role: string,
    permissions: string[],
    accessToken: string
  ): void {
    this.currentContext = {
      userId,
      username,
      role,
      permissions,
      accessToken,
    };
  }

  /**
   * Get the current authenticated user context
   */
  getContext(): AuthContext | null {
    return this.currentContext;
  }

  /**
   * Get the current user ID
   */
  getUserId(): number | null {
    return this.currentContext?.userId ?? null;
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.currentContext?.accessToken ?? null;
  }

  /**
   * Update access token (after refresh)
   */
  updateAccessToken(accessToken: string): void {
    if (this.currentContext) {
      this.currentContext.accessToken = accessToken;
    }
  }

  /**
   * Check if a user is authenticated
   */
  isAuthenticated(): boolean {
    return this.currentContext !== null;
  }

  /**
   * Clear the current context (logout)
   */
  clearContext(): void {
    this.currentContext = null;
  }
}

// Singleton instance
export const userContextService = new UserContextService();
