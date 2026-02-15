import { eq, sql } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { users } from '../schema/schema.js';
import { IUserRepository, User } from '@nuqtaplus/core';

export class SqliteUserRepository implements IUserRepository {
  constructor(private db: DbClient) {}

  findByUsername(username: string): User | null {
    try {
      const user = this.db.select().from(users).where(eq(users.username, username)).get();
      return (user as User) || null;
    } catch (e: any) {
      console.error('Error finding user by username:', e);
      return null;
    }
  }

  findById(id: number): User | null {
    const user = this.db.select().from(users).where(eq(users.id, id)).get();
    return (user as User) || null;
  }

  create(user: User): User {
    const created = this.db
      .insert(users)
      .values(user as any)
      .returning()
      .get();
    return created as User;
  }

  findAll(): User[] {
    const results = this.db.select().from(users).all();
    return results as User[];
  }

  update(id: number, data: Partial<User>): User {
    const updatedUser = this.db.update(users).set(data).where(eq(users.id, id)).returning().get();
    return updatedUser as unknown as User;
  }

  count(): number {
    const result = this.db.select({ count: sql<number>`count(*)` }).from(users).get();
    return result?.count || 0;
  }

  updateLastLogin(id: number): void {
    this.db
      .update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, id))
      .run();
  }
}
