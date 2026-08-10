import { db } from '../config/database.js';
import { users, organizations, organizationMembers } from '@s3forge/database';
import { eq } from 'drizzle-orm';

export interface CreateUserData {
  email: string;
  passwordHash: string;
  displayName: string;
}

export class UserRepository {
  /**
   * Find user by email address.
   */
  async findByEmail(email: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    return user ?? null;
  }

  /**
   * Find user by ID.
   */
  async findById(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user ?? null;
  }

  /**
   * Find primary organization for a user.
   */
  async getUserOrganization(userId: number) {
    const [member] = await db
      .select({
        organizationId: organizationMembers.organizationId,
        role: organizationMembers.role,
        name: organizations.name,
        slug: organizations.slug,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .where(eq(organizationMembers.userId, userId))
      .limit(1);

    return member ?? null;
  }

  /**
   * Register new user and create their initial organization in a single transaction.
   */
  async createUserWithOrganization(data: CreateUserData, orgName?: string) {
    return await db.transaction(async (tx) => {
      // 1. Create user
      const [newUser] = await tx
        .insert(users)
        .values({
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          displayName: data.displayName,
        })
        .returning();

      // 2. Create organization
      const name = orgName ?? `${data.displayName}'s Org`;
      const slug = `${data.email.split('@')[0]}-${Date.now().toString(36)}`;

      const [newOrg] = await tx
        .insert(organizations)
        .values({
          name,
          slug,
        })
        .returning();

      // 3. Create organization member as owner
      await tx.insert(organizationMembers).values({
        organizationId: newOrg.id,
        userId: newUser.id,
        role: 'owner',
      });

      return { user: newUser, organization: newOrg };
    });
  }
}

export const userRepository = new UserRepository();
