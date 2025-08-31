type User = { id: string; email: string | null; firebaseUid?: string | null };

const mem = new Map<string, User>(); // swap with Prisma/DB

export async function upsertUserByFirebase(uid: string, email: string | null): Promise<User> {
  // try by firebase uid
  for (const u of mem.values()) if (u.firebaseUid === uid) return u;
  // otherwise create
  const id = `u_${uid}`;
  const user: User = { id, email, firebaseUid: uid };
  mem.set(id, user);
  return user;
}

export async function getUserById(id: string): Promise<User | null> {
  return mem.get(id) ?? null;
}
