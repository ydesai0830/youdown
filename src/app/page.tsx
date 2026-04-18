import { db } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { createGroup, joinGroup } from "./actions";
import { GroupCalendar } from "./ui/group-calendar";

export const dynamic = "force-dynamic";

type HomePageProps = {
  searchParams?: {
    group?: string;
    event?: string;
    week?: string;
  };
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function parseWeekStart(week?: string) {
  if (!week) {
    return startOfDay(new Date());
  }

  const parsed = new Date(week);
  if (Number.isNaN(parsed.getTime())) {
    return startOfDay(new Date());
  }

  return startOfDay(parsed);
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const profile = await getProfile();

  if (!profile.id) {
    return <OnboardingView defaultName={profile.name ?? ""} />;
  }

  const memberships = await db.groupMember.findMany({
    where: { profileKey: profile.id },
    orderBy: { createdAt: "asc" },
    include: {
      group: {
        include: {
          members: {
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
  });

  if (memberships.length === 0) {
    return <OnboardingView defaultName={profile.name ?? ""} />;
  }

  const requestedGroupId = searchParams?.group;
  const activeGroupId =
    memberships.find((membership) => membership.groupId === requestedGroupId)?.groupId ??
    memberships.find((membership) => membership.groupId === profile.activeGroupId)?.groupId ??
    memberships[0]?.groupId;

  const activeMembership = memberships.find((membership) => membership.groupId === activeGroupId);

  if (!activeMembership) {
    return <OnboardingView defaultName={profile.name ?? ""} />;
  }

  const weekStart = parseWeekStart(searchParams?.week);
  const weekEnd = addDays(weekStart, 7);

  const activeGroup = await db.group.findUnique({
    where: { id: activeMembership.groupId },
    include: {
      members: {
        orderBy: { createdAt: "asc" },
      },
      hangouts: {
        where: {
          startAt: {
            gte: weekStart,
            lt: weekEnd,
          },
        },
        orderBy: [{ startAt: "asc" }, { createdAt: "asc" }],
        include: {
          hostMember: true,
          responses: {
            include: {
              member: true,
            },
          },
        },
      },
    },
  });

  if (!activeGroup) {
    return <OnboardingView defaultName={profile.name ?? ""} />;
  }

  return (
    <GroupCalendar
      activeGroup={{
        id: activeGroup.id,
        name: activeGroup.name,
        inviteCode: activeGroup.inviteCode,
        members: activeGroup.members,
        hangouts: activeGroup.hangouts,
      }}
      currentProfileName={profile.name ?? ""}
      groups={memberships.map((membership) => ({
        id: membership.group.id,
        name: membership.group.name,
        inviteCode: membership.group.inviteCode,
        memberCount: membership.group.members.length,
      }))}
      selectedEventId={searchParams?.event ?? null}
      weekStart={weekStart.toISOString()}
    />
  );
}

function OnboardingView({ defaultName }: { defaultName: string }) {
  return (
    <main className="entry-shell">
      <section className="entry-card">
        <div className="entry-copy">
          <span className="badge">YouDown</span>
          <h1>Start by creating a group or joining one.</h1>
          <p>
            Every calendar in YouDown belongs to a group. Pick your name once, then
            jump into a shared weekly calendar.
          </p>
        </div>

        <div className="entry-actions">
          <form className="entry-form" action={createGroup}>
            <h2>Create group</h2>
            <label htmlFor="profileNameCreate">Your name</label>
            <input
              id="profileNameCreate"
              name="profileName"
              placeholder="Your name"
              defaultValue={defaultName}
              required
            />
            <label htmlFor="groupName">Group name</label>
            <input
              id="groupName"
              name="groupName"
              placeholder="Friday crew"
              required
            />
            <button type="submit">Create group</button>
          </form>

          <form className="entry-form" action={joinGroup}>
            <h2>Join group</h2>
            <label htmlFor="profileNameJoin">Your name</label>
            <input
              id="profileNameJoin"
              name="profileName"
              placeholder="Your name"
              defaultValue={defaultName}
              required
            />
            <label htmlFor="inviteCode">Invite code</label>
            <input
              id="inviteCode"
              name="inviteCode"
              placeholder="friday-crew-ab123"
              required
            />
            <button type="submit">Join with code</button>
          </form>
        </div>
      </section>
    </main>
  );
}
