import { User } from '../entities/User.js';

export interface IUserRepository {
  findByUsername(username: string): User | null;
  findById(id: number): User | null;
  create(user: User): User;
  findAll(): User[];
  update(id: number, data: Partial<User>): User;
  count(): number;
  updateLastLogin(id: number): void;
}
