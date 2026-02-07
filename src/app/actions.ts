"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

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

export async function createTrip(formData: FormData) {
  const title = toString(formData.get("title"));
  if (!title) {
    throw new Error("Trip title is required.");
  }

  const trip = await db.trip.create({
    data: {
      title,
      destination: toString(formData.get("destination")),
      startDate: toDate(formData.get("startDate")),
      endDate: toDate(formData.get("endDate")),
      notes: toString(formData.get("notes")),
    },
  });

  revalidatePath("/");
  redirect(`/trips/${trip.id}`);
}

export async function createReservation(formData: FormData) {
  const tripId = toString(formData.get("tripId"));
  const type = toString(formData.get("type"));
  const title = toString(formData.get("title"));

  if (!tripId || !type || !title) {
    throw new Error("Trip, type, and title are required.");
  }

  await db.reservation.create({
    data: {
      tripId,
      type,
      title,
      provider: toString(formData.get("provider")),
      confirmationNumber: toString(formData.get("confirmationNumber")),
      startAt: toDate(formData.get("startAt")),
      endAt: toDate(formData.get("endAt")),
      location: toString(formData.get("location")),
      notes: toString(formData.get("notes")),
    },
  });

  revalidatePath(`/trips/${tripId}`);
}
