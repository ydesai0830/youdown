import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HangoutPage({
  params,
}: {
  params: { id: string };
}) {
  const hangout = await db.hangout.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      groupId: true,
    },
  });

  if (!hangout) {
    notFound();
  }

  redirect(`/?group=${hangout.groupId}&event=${hangout.id}`);
}
