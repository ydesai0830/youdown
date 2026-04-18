import { cookies } from "next/headers";

export const PROFILE_ID_COOKIE = "yd-profile-id";
export const PROFILE_NAME_COOKIE = "yd-profile-name";
export const ACTIVE_GROUP_COOKIE = "yd-active-group";

type Profile = {
  id: string | null;
  name: string | null;
  activeGroupId: string | null;
};

function createProfileId() {
  return `profile_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getProfile(): Promise<Profile> {
  const store = await cookies();

  return {
    id: store.get(PROFILE_ID_COOKIE)?.value ?? null,
    name: store.get(PROFILE_NAME_COOKIE)?.value ?? null,
    activeGroupId: store.get(ACTIVE_GROUP_COOKIE)?.value ?? null,
  };
}

export async function ensureProfile(inputName: string) {
  const store = await cookies();
  const trimmedName = inputName.trim();
  const existingId = store.get(PROFILE_ID_COOKIE)?.value;
  const profileId = existingId ?? createProfileId();

  store.set(PROFILE_ID_COOKIE, profileId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  store.set(PROFILE_NAME_COOKIE, trimmedName, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { profileId, name: trimmedName };
}

export async function setActiveGroup(groupId: string) {
  const store = await cookies();
  store.set(ACTIVE_GROUP_COOKIE, groupId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
