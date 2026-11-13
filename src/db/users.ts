import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { profiles } from './schema.ts';

export async function getOrCreateProfile(
  uid: string,
  email: string,
  fullName?: string
) {
  try {
    const existing = await db
      .select()
      .from(profiles)
      .where(eq(profiles.uid, uid))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    const fallbackName =
      fullName && fullName.trim().length > 0
        ? fullName.trim()
        : email.split('@')[0] || 'Singapore Parent';

    const inserted = await db
      .insert(profiles)
      .values({
        uid,
        email,
        fullName: fallbackName,
        role: 'PARENT',
      })
      .onConflictDoUpdate({
        target: profiles.uid,
        set: { email },
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateProfile:', error);
    throw new Error('Failed to load user profile.', { cause: error });
  }
}
