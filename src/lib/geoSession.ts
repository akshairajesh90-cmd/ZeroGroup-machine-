/**
 * IronRent ERP — Geolocation Session & Monotonic Sequence Manager
 *
 * Ensures each telemetry session has a unique identifier and monotonic sequence
 * counter (seq: 1, 2, 3...) so the server can reconstruct chronological order
 * and reject out-of-order offline replays.
 */

let memorySessionId: string | null = null;
let currentSequence = 0;

export function getGeoSessionId(): string {
  if (typeof window === "undefined") {
    if (!memorySessionId) {
      memorySessionId = `srv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    return memorySessionId;
  }

  try {
    const existing = window.sessionStorage.getItem("ironrent_geo_session_id");
    if (existing) {
      return existing;
    }
    const newId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    window.sessionStorage.setItem("ironrent_geo_session_id", newId);
    return newId;
  } catch {
    if (!memorySessionId) {
      memorySessionId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    return memorySessionId;
  }
}

export function getNextPingSequence(): number {
  if (typeof window === "undefined") {
    currentSequence += 1;
    return currentSequence;
  }

  try {
    const storedSeq = window.sessionStorage.getItem("ironrent_geo_seq");
    const nextSeq = (storedSeq ? parseInt(storedSeq, 10) : 0) + 1;
    window.sessionStorage.setItem("ironrent_geo_seq", nextSeq.toString());
    currentSequence = nextSeq;
    return nextSeq;
  } catch {
    currentSequence += 1;
    return currentSequence;
  }
}
