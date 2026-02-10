import { eq, sql } from 'drizzle-orm';
import { DbClient } from '../db.js';
import { users } from '../schema/schema.js';
import { IUserRepository, User } from '@nuqtaplus/core';

export class SqliteUserRepository implements IUserRepository {
  constructor(private db: DbClient) {}

  async findByUsername(username: string): Promise<User | null> {
    try {
      const [user] = await this.db.select().from(users).where(eq(users.username, username));
      return (user as User) || null;
    } catch (e: any) {
      console.error('Error finding user by username:', e);
      return null;
    }
  }

  async findById(id: number): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return (user as User) || null;
  }

  async create(user: User): Promise<User> {
    const [created] = await this.db
      .insert(users)
      .values(user as any)
      .returning();
    return created as User;
  }

  async findAll(): Promise<User[]> {
    const results = await this.db.select().from(users);
    return results as User[];
  }

  async update(id: number, data: Partial<User>): Promise<User> {
    const [updatedUser] = await this.db.update(users).set(data).where(eq(users.id, id)).returning();
    return updatedUser as unknown as User;
  }

  async count(): Promise<number> {
    const [result] = await this.db.select({ count: sql<number>`count(*)` }).from(users);
    return result.count;
  }

  async updateLastLogin(id: number): Promise<void> {
    await this.db
      .update(users)
      .set({ lastLoginAt: new Date().toISOString() })
      .where(eq(users.id, id));
  }
}
