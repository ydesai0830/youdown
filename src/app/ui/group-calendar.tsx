"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { GroupMember, Hangout, Response } from "@/generated/prisma/client";
import {
  createGroup,
  createHangout,
  joinGroup,
  setResponse,
  updateHangout,
} from "@/app/actions";
import { buildMemberInitials, getHangoutTags, serializeTags } from "@/lib/group";
import { formatDayLabel, formatDate, formatTimeRange } from "@/lib/format";

type HangoutWithPeople = Hangout & {
  hostMember: GroupMember;
  responses: Array<Response & { member: GroupMember }>;
};

type CalendarGroup = {
  id: string;
  name: string;
  inviteCode: string;
  members: GroupMember[];
  hangouts: HangoutWithPeople[];
};

type GroupOption = {
  id: string;
  name: string;
  inviteCode: string;
  memberCount: number;
};

type GroupCalendarProps = {
  activeGroup: CalendarGroup;
  currentProfileName: string;
  groups: GroupOption[];
  selectedEventId: string | null;
  weekStart: string;
};

const START_HOUR = 8;
const END_HOUR = 23;
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, index) => START_HOUR + index);
const RESPONSE_LABELS = {
  INTERESTED: "Interested",
  DOWN: "Down",
  OUT: "Out",
} as const;

function toDate(value: Date | string | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value : new Date(value);
}

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

function formatDateTimeInput(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function sameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatWeekParam(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

export function GroupCalendar({
  activeGroup,
  currentProfileName,
  groups,
  selectedEventId,
  weekStart,
}: GroupCalendarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [draftSelection, setDraftSelection] = useState<{
    dayIndex: number;
    startHour: number;
    endHour: number;
  } | null>(null);
  const [selection, setSelection] = useState<{
    dayIndex: number;
    startHour: number;
    endHour: number;
  } | null>(null);
  const [dragAnchor, setDragAnchor] = useState<{ dayIndex: number; hour: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [manualNote, setManualNote] = useState("");
  const [isEditingEvent, setIsEditingEvent] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const currentWeekStart = useMemo(() => startOfDay(new Date(weekStart)), [weekStart]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(currentWeekStart, index)),
    [currentWeekStart],
  );
  const selectedHangout =
    activeGroup.hangouts.find((hangout) => hangout.id === selectedEventId) ?? null;
  const canEditSelectedHangout =
    selectedHangout?.hostMember.name.trim().toLowerCase() ===
    currentProfileName.trim().toLowerCase();

  function setQuery(nextGroupId: string, nextEventId?: string | null, nextWeek?: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("group", nextGroupId);
    params.set("week", nextWeek ?? formatWeekParam(currentWeekStart));

    if (nextEventId) {
      params.set("event", nextEventId);
    } else {
      params.delete("event");
    }

    router.push(`${pathname}?${params.toString()}`);
  }

  function openComposer(dayIndex: number, startHour: number, endHour: number) {
    setSelection({ dayIndex, startHour, endHour });
  }

  function closeComposer() {
    setSelection(null);
    setDraftSelection(null);
    setDragAnchor(null);
    setIsDragging(false);
  }

  function buildDateForSelection(dayIndex: number, hour: number) {
    const date = new Date(weekDays[dayIndex]);
    date.setHours(hour, 0, 0, 0);
    return date;
  }

  function beginDrag(dayIndex: number, hour: number) {
    setIsDragging(true);
    setDragAnchor({ dayIndex, hour });
    setDraftSelection({ dayIndex, startHour: hour, endHour: hour + 1 });
  }

  function extendDrag(dayIndex: number, hour: number) {
    if (!dragAnchor || dragAnchor.dayIndex !== dayIndex) return;

    const startHour = Math.min(dragAnchor.hour, hour);
    const endHour = Math.max(dragAnchor.hour, hour) + 1;
    setDraftSelection({ dayIndex, startHour, endHour });
  }

  function finishDrag() {
    if (draftSelection) {
      setSelection(draftSelection);
    }
    setDraftSelection(null);
    setDragAnchor(null);
    setIsDragging(false);
  }

  const weekLabel = `${formatDate(weekDays[0])} - ${formatDate(weekDays[6])}`;

  return (
    <main className="calendar-shell">
      <header className="calendar-topbar">
        <div className="topbar-group">
          <span className="badge">YouDown</span>
          <div className="group-switcher">
            <select
              key={activeGroup.id}
              name="groupId"
              value={activeGroup.id}
              onChange={(event) => {
                setQuery(event.target.value, null, formatWeekParam(currentWeekStart));
              }}
            >
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.name}
                </option>
              ))}
            </select>
          </div>
          <div className="group-meta">
            <strong>{activeGroup.name}</strong>
            <span>Invite code: {activeGroup.inviteCode}</span>
          </div>
        </div>

        <div className="topbar-side">
          <div className="member-strip">
            {activeGroup.members.map((member) => (
              <div key={member.id} className="member-chip" title={member.name}>
                <span>{buildMemberInitials(member.name)}</span>
                <small>{member.name}</small>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="ghost-button"
            onClick={() => setShowGroupModal(true)}
          >
            New group
          </button>
          <button
            type="button"
            className="ghost-button"
            onClick={() => openComposer(0, 18, 19)}
          >
            New event
          </button>
        </div>
      </header>

      <section className="calendar-body">
        <div className="calendar-nav">
          <div className="calendar-nav-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() =>
                setQuery(activeGroup.id, null, formatWeekParam(addDays(currentWeekStart, -7)))
              }
            >
              Previous week
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() =>
                setQuery(activeGroup.id, null, formatWeekParam(startOfDay(new Date())))
              }
            >
              Today
            </button>
            <button
              type="button"
              className="ghost-button"
              onClick={() =>
                setQuery(activeGroup.id, null, formatWeekParam(addDays(currentWeekStart, 7)))
              }
            >
              Next week
            </button>
          </div>
          <strong>{weekLabel}</strong>
        </div>

        <div className="calendar-header-row">
          <div className="calendar-corner">Week view</div>
          {weekDays.map((day) => (
            <div key={day.toISOString()} className="calendar-day-title">
              <strong>{formatDayLabel(day)}</strong>
            </div>
          ))}
        </div>

        <div className="calendar-grid-shell">
          <div className="time-rail">
            {HOURS.map((hour) => (
              <div key={hour} className="time-slot-label">
                {hour === 12 ? "12 PM" : hour > 12 ? `${hour - 12} PM` : `${hour} AM`}
              </div>
            ))}
          </div>

          <div
            className="calendar-grid"
            onMouseLeave={() => {
              if (isDragging) {
                finishDrag();
              }
            }}
          >
            {weekDays.map((day, dayIndex) => {
              const dayEvents = activeGroup.hangouts.filter((hangout) =>
                sameDay(new Date(hangout.startAt), day),
              );

              return (
                <div key={day.toISOString()} className="calendar-column">
                  {HOURS.map((hour) => {
                    const isSelected =
                      draftSelection &&
                      draftSelection.dayIndex === dayIndex &&
                      hour >= draftSelection.startHour &&
                      hour < draftSelection.endHour;

                    return (
                      <button
                        key={hour}
                        type="button"
                        className={`calendar-cell${isSelected ? " selected" : ""}`}
                        onMouseDown={() => beginDrag(dayIndex, hour)}
                        onMouseEnter={() => extendDrag(dayIndex, hour)}
                        onMouseUp={() => {
                          if (isDragging) {
                            finishDrag();
                          }
                        }}
                        onClick={() => {
                          if (!isDragging && !draftSelection) {
                            openComposer(dayIndex, hour, hour + 1);
                          }
                        }}
                      />
                    );
                  })}

                  <div className="calendar-events-layer">
                    {dayEvents.map((hangout) => {
                      const start = new Date(hangout.startAt);
                      const end = hangout.endAt
                        ? new Date(hangout.endAt)
                        : new Date(start.getTime() + 60 * 60 * 1000);
                      const startOffset =
                        (start.getHours() - START_HOUR) * 72 + start.getMinutes() * 1.2;
                      const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                      const top = Math.max(startOffset, 0);
                      const height = Math.max(durationHours * 72, 64);
                      const tags = getHangoutTags(hangout);
                      const counts = {
                        INTERESTED: hangout.responses.filter(
                          (response) => response.status === "INTERESTED",
                        ),
                        DOWN: hangout.responses.filter((response) => response.status === "DOWN"),
                        OUT: hangout.responses.filter((response) => response.status === "OUT"),
                      };

                      return (
                        <button
                          key={hangout.id}
                          type="button"
                          className="event-card"
                          style={{ top, height }}
                          onClick={() =>
                            setQuery(
                              activeGroup.id,
                              hangout.id,
                              formatWeekParam(currentWeekStart),
                            )
                          }
                        >
                          <strong>{hangout.title}</strong>
                          <span>{formatTimeRange(start, end)}</span>
                          <div className="event-tags">
                            {tags.map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </div>
                          <div className="event-icons">
                            <span title="Interested">👀 {counts.INTERESTED.length}</span>
                            <span title="Down">🔥 {counts.DOWN.length}</span>
                            <span title="Out">✕ {counts.OUT.length}</span>
                          </div>
                        </button>
                      );
                    })}

                    {dayEvents.length === 0 ? (
                      <div className="column-empty">Drag or tap to create the first event.</div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {selection ? (
        <div className="overlay">
          <div className="sheet">
            <div className="sheet-header">
              <div>
                <span className="badge">New event</span>
                <h2>Create for {formatDayLabel(weekDays[selection.dayIndex])}</h2>
              </div>
              <button type="button" className="icon-button" onClick={closeComposer}>
                Close
              </button>
            </div>

            <form className="sheet-form" action={createHangout}>
              <input type="hidden" name="profileName" value={currentProfileName} />
              <input type="hidden" name="groupId" value={activeGroup.id} />
              <label htmlFor="title">Event name</label>
              <input id="title" name="title" placeholder="Leg day then smoothies" required />
              <label htmlFor="startAt">Start</label>
              <input
                id="startAt"
                name="startAt"
                type="datetime-local"
                defaultValue={formatDateTimeInput(
                  buildDateForSelection(selection.dayIndex, selection.startHour),
                )}
                required
              />
              <label htmlFor="endAt">End</label>
              <input
                id="endAt"
                name="endAt"
                type="datetime-local"
                defaultValue={formatDateTimeInput(
                  buildDateForSelection(selection.dayIndex, selection.endHour),
                )}
              />
              <label htmlFor="location">Location</label>
              <input id="location" name="location" placeholder="Chelsea Piers" />
              <label htmlFor="details">Details</label>
              <textarea
                id="details"
                name="details"
                placeholder="Bring a mat, we can grab food after."
              />
              <label htmlFor="tags">Tags</label>
              <input
                id="tags"
                name="tags"
                placeholder="workout, brunch, rooftop"
                defaultValue={serializeTags([])}
              />
              <div className="sheet-actions">
                <button type="button" className="ghost-button" onClick={closeComposer}>
                  Cancel
                </button>
                <button type="submit">Create event</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showGroupModal ? (
        <div className="overlay">
          <div className="sheet">
            <div className="sheet-header">
              <div>
                <span className="badge">Groups</span>
                <h2>Create or join another group</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setShowGroupModal(false)}
              >
                Close
              </button>
            </div>

            <div className="entry-actions modal-entry-actions">
              <form className="entry-form" action={createGroup}>
                <h2>Create group</h2>
                <input type="hidden" name="profileName" value={currentProfileName} />
                <label htmlFor="groupNameModal">Group name</label>
                <input
                  id="groupNameModal"
                  name="groupName"
                  placeholder="Summer fridays"
                  required
                />
                <button type="submit">Create group</button>
              </form>

              <form className="entry-form" action={joinGroup}>
                <h2>Join group</h2>
                <input type="hidden" name="profileName" value={currentProfileName} />
                <label htmlFor="inviteCodeModal">Invite code</label>
                <input
                  id="inviteCodeModal"
                  name="inviteCode"
                  placeholder="summer-fridays-abc12"
                  required
                />
                <button type="submit">Join with code</button>
              </form>
            </div>
          </div>
        </div>
      ) : null}

      {selectedHangout ? (
        <div
          className="drawer-backdrop"
          onClick={() => setQuery(activeGroup.id, null, formatWeekParam(currentWeekStart))}
        >
          <aside className="drawer" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-header">
              <div>
                <span className="badge">{selectedHangout.hostMember.name} proposed this</span>
                <h2>{selectedHangout.title}</h2>
              </div>
              <div className="drawer-header-actions">
                {canEditSelectedHangout ? (
                  <button
                    type="button"
                    className="ghost-button"
                    onClick={() => setIsEditingEvent((current) => !current)}
                  >
                    {isEditingEvent ? "Done editing" : "Edit"}
                  </button>
                ) : null}
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => {
                    setIsEditingEvent(false);
                    setQuery(activeGroup.id, null, formatWeekParam(currentWeekStart));
                  }}
                >
                  Close
                </button>
              </div>
            </div>
            {isEditingEvent && canEditSelectedHangout ? (
              <form className="sheet-form" action={updateHangout}>
                <input type="hidden" name="profileName" value={currentProfileName} />
                <input type="hidden" name="groupId" value={activeGroup.id} />
                <input type="hidden" name="hangoutId" value={selectedHangout.id} />
                <label htmlFor="editTitle">Event name</label>
                <input
                  id="editTitle"
                  name="title"
                  defaultValue={selectedHangout.title}
                  required
                />
                <label htmlFor="editStartAt">Start</label>
                <input
                  id="editStartAt"
                  name="startAt"
                  type="datetime-local"
                  defaultValue={formatDateTimeInput(new Date(selectedHangout.startAt))}
                  required
                />
                <label htmlFor="editEndAt">End</label>
                <input
                  id="editEndAt"
                  name="endAt"
                  type="datetime-local"
                  defaultValue={
                    selectedHangout.endAt
                      ? formatDateTimeInput(new Date(selectedHangout.endAt))
                      : ""
                  }
                />
                <label htmlFor="editLocation">Location</label>
                <input
                  id="editLocation"
                  name="location"
                  defaultValue={selectedHangout.location ?? ""}
                />
                <label htmlFor="editDetails">Details</label>
                <textarea
                  id="editDetails"
                  name="details"
                  defaultValue={selectedHangout.details ?? ""}
                />
                <label htmlFor="editTags">Tags</label>
                <input
                  id="editTags"
                  name="tags"
                  defaultValue={selectedHangout.tags}
                  placeholder="workout, brunch, rooftop"
                />
                <div className="sheet-actions">
                  <button type="submit">Save changes</button>
                </div>
              </form>
            ) : (
              <div className="drawer-copy">
                <p>{formatTimeRange(toDate(selectedHangout.startAt), toDate(selectedHangout.endAt))}</p>
                {selectedHangout.location ? <p>{selectedHangout.location}</p> : null}
                {selectedHangout.details ? <p>{selectedHangout.details}</p> : null}
                <div className="event-tags">
                  {getHangoutTags(selectedHangout).map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>
            )}

            <form className="response-form" action={setResponse}>
              <input type="hidden" name="profileName" value={currentProfileName} />
              <input type="hidden" name="groupId" value={activeGroup.id} />
              <input type="hidden" name="hangoutId" value={selectedHangout.id} />
              <label htmlFor="note">Optional note</label>
              <textarea
                id="note"
                name="note"
                placeholder="Running 10 minutes late"
                value={manualNote}
                onChange={(event) => setManualNote(event.target.value)}
              />
              <div className="response-chips">
                {Object.entries(RESPONSE_LABELS).map(([value, label]) => (
                  <button key={value} type="submit" name="status" value={value}>
                    {label}
                  </button>
                ))}
              </div>
            </form>

            <div className="response-groups">
              {Object.entries(RESPONSE_LABELS).map(([value, label]) => {
                const members = selectedHangout.responses.filter(
                  (response) => response.status === value,
                );

                return (
                  <div key={value} className="response-group">
                    <div className="response-group-title">
                      <strong>{label}</strong>
                      <span>{members.length}</span>
                    </div>
                    {members.length === 0 ? (
                      <p className="muted">Nobody yet.</p>
                    ) : (
                      members.map((response) => (
                        <div key={response.id} className="response-person">
                          <div className="member-chip compact">
                            <span>{buildMemberInitials(response.member.name)}</span>
                            <small>{response.member.name}</small>
                          </div>
                          {response.note ? <p>{response.note}</p> : null}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      ) : null}
    </main>
  );
}
