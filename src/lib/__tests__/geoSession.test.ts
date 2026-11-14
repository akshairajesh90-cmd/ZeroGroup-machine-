/**
 * @jest-environment jsdom
 */

import { getGeoSessionId, getNextPingSequence } from "../geoSession";

describe("GeoSession Monotonic Sequence & Persistence", () => {
  beforeEach(() => {
    // Reset mock storage
    const storage: Record<string, string> = {};
    Object.defineProperty(window, "localStorage", {
      value: {
        getItem: jest.fn((key: string) => storage[key] || null),
        setItem: jest.fn((key: string, val: string) => {
          storage[key] = val;
        }),
        removeItem: jest.fn((key: string) => {
          delete storage[key];
        }),
        clear: jest.fn(() => {
          for (const k in storage) delete storage[k];
        }),
      },
      writable: true,
    });
  });

  it("generates a session ID and persists across invocations in localStorage", () => {
    const id1 = getGeoSessionId();
    expect(id1).toBeDefined();
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "ironrent_geo_session_id",
      id1
    );

    const id2 = getGeoSessionId();
    expect(id2).toBe(id1);
  });

  it("increments sequence numbers monotonically and persists to localStorage", () => {
    const seq1 = getNextPingSequence();
    const seq2 = getNextPingSequence();
    const seq3 = getNextPingSequence();

    expect(seq2).toBe(seq1 + 1);
    expect(seq3).toBe(seq2 + 1);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "ironrent_geo_seq",
      seq3.toString()
    );
  });
});
