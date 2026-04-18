import type { GroupMember, Hangout, Response } from "@/generated/prisma/client";

export type HangoutWithPeople = Hangout & {
  hostMember: GroupMember;
  responses: Array<
    Response & {
      member: GroupMember;
    }
  >;
};

export function buildInviteCode(name: string) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24);

  return `${base || "group"}-${Math.random().toString(36).slice(2, 7)}`;
}

export function buildMemberInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function parseTags(input: string | null | undefined) {
  if (!input) return [];

  const seen = new Set<string>();

  return input
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
    .filter((tag) => {
      const normalized = tag.toLowerCase();
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .slice(0, 8);
}

export function serializeTags(tags: string[]) {
  return tags.join(", ");
}

export function getHangoutTags(hangout: Pick<Hangout, "tags">) {
  return parseTags(hangout.tags);
}
