"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { buildInviteCode, parseTags, serializeTags } from "@/lib/group";
import { ensureProfile, setActiveGroup } from "@/lib/profile";

function toDate(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string" || value.trim() === "") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toString(value: FormDataEntryValue | null) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function getOrCreateMember(groupId: string, profileId: string, name: string) {
  const existingMember = await db.groupMember.findUnique({
    where: {
      groupId_profileKey: {
        groupId,
        profileKey: profileId,
      },
    },
  });

  if (existingMember) {
    if (existingMember.name !== name) {
      return db.groupMember.update({
        where: { id: existingMember.id },
        data: { name },
      });
    }

    return existingMember;
  }

  return db.groupMember.create({
    data: {
      groupId,
      profileKey: profileId,
      name,
    },
  });
}

export async function createGroup(formData: FormData) {
  const groupName = toString(formData.get("groupName"));
  const profileName = toString(formData.get("profileName"));

  if (!groupName) {
    throw new Error("Group name is required.");
  }

  if (!profileName) {
    throw new Error("Your name is required.");
  }

  const profile = await ensureProfile(profileName);

  const group = await db.group.create({
    data: {
      name: groupName,
      inviteCode: buildInviteCode(groupName),
      members: {
        create: {
          name: profile.name,
          profileKey: profile.profileId,
        },
      },
    },
  });

  await setActiveGroup(group.id);
  revalidatePath("/");
  redirect("/");
}

export async function joinGroup(formData: FormData) {
  const inviteCode = toString(formData.get("inviteCode"));
  const profileName = toString(formData.get("profileName"));

  if (!inviteCode) {
    throw new Error("Invite code is required.");
  }

  if (!profileName) {
    throw new Error("Your name is required.");
  }

  const group = await db.group.findUnique({
    where: { inviteCode: inviteCode.toLowerCase() },
  });

  if (!group) {
    throw new Error("That invite code was not found.");
  }

  const profile = await ensureProfile(profileName);
  await getOrCreateMember(group.id, profile.profileId, profile.name);
  await setActiveGroup(group.id);
  revalidatePath("/");
  redirect("/");
}

export async function switchActiveGroup(formData: FormData) {
  const groupId = toString(formData.get("groupId"));
  const profileName = toString(formData.get("profileName"));

  if (!groupId) {
    throw new Error("Group is required.");
  }

  if (!profileName) {
    throw new Error("Profile name is required.");
  }

  const profile = await ensureProfile(profileName);
  const membership = await db.groupMember.findUnique({
    where: {
      groupId_profileKey: {
        groupId,
        profileKey: profile.profileId,
      },
    },
  });

  if (!membership) {
    throw new Error("You are not a member of that group.");
  }

  await setActiveGroup(groupId);
  revalidatePath("/");
}

export async function createHangout(formData: FormData) {
  const profileName = toString(formData.get("profileName"));
  const groupId = toString(formData.get("groupId"));
  const title = toString(formData.get("title"));
  const startAt = toDate(formData.get("startAt"));

  if (!profileName) {
    throw new Error("Your name is required.");
  }

  if (!groupId) {
    throw new Error("Group is required.");
  }

  if (!title) {
    throw new Error("Event title is required.");
  }

  if (!startAt) {
    throw new Error("Start time is required.");
  }

  const profile = await ensureProfile(profileName);
  const member = await getOrCreateMember(groupId, profile.profileId, profile.name);
  const tags = serializeTags(parseTags(toString(formData.get("tags"))));

  await db.hangout.create({
    data: {
      groupId,
      hostMemberId: member.id,
      title,
      startAt,
      endAt: toDate(formData.get("endAt")),
      location: toString(formData.get("location")),
      details: toString(formData.get("details")),
      tags,
    },
  });

  await setActiveGroup(groupId);
  revalidatePath("/");
}

export async function setResponse(formData: FormData) {
  const profileName = toString(formData.get("profileName"));
  const groupId = toString(formData.get("groupId"));
  const hangoutId = toString(formData.get("hangoutId"));
  const status = toString(formData.get("status"));

  if (!profileName || !groupId || !hangoutId || !status) {
    throw new Error("Missing response details.");
  }

  const profile = await ensureProfile(profileName);
  const member = await getOrCreateMember(groupId, profile.profileId, profile.name);
  const note = toString(formData.get("note"));

  await db.response.upsert({
    where: {
      hangoutId_memberId: {
        hangoutId,
        memberId: member.id,
      },
    },
    create: {
      hangoutId,
      memberId: member.id,
      status,
      note,
    },
    update: {
      status,
      note,
    },
  });

  await setActiveGroup(groupId);
  revalidatePath("/");
}

export async function updateHangout(formData: FormData) {
  const profileName = toString(formData.get("profileName"));
  const groupId = toString(formData.get("groupId"));
  const hangoutId = toString(formData.get("hangoutId"));
  const title = toString(formData.get("title"));
  const startAt = toDate(formData.get("startAt"));

  if (!profileName || !groupId || !hangoutId) {
    throw new Error("Missing event details.");
  }

  if (!title) {
    throw new Error("Event title is required.");
  }

  if (!startAt) {
    throw new Error("Start time is required.");
  }

  const profile = await ensureProfile(profileName);
  const member = await getOrCreateMember(groupId, profile.profileId, profile.name);

  const hangout = await db.hangout.findUnique({
    where: { id: hangoutId },
    select: {
      id: true,
      groupId: true,
      hostMemberId: true,
    },
  });

  if (!hangout || hangout.groupId !== groupId) {
    throw new Error("Event not found.");
  }

  if (hangout.hostMemberId !== member.id) {
    throw new Error("Only the creator can edit this event.");
  }

  const tags = serializeTags(parseTags(toString(formData.get("tags"))));

  await db.hangout.update({
    where: { id: hangoutId },
    data: {
      title,
      startAt,
      endAt: toDate(formData.get("endAt")),
      location: toString(formData.get("location")),
      details: toString(formData.get("details")),
      tags,
    },
  });

  await setActiveGroup(groupId);
  revalidatePath("/");
}
