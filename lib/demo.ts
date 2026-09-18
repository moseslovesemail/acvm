import type { SignalEvent } from "./types";

export const DEMO_SIGNALS: SignalEvent[] = [
  {
    eventType: "NEW_REGISTRATION",
    registrationNumber: "A012174",
    tradeName: "Alfaxan Forte",
    registrant: "Zoetis New Zealand Limited",
    detectedAt: "2026-09-11",
    summary: "New veterinary medicine registration detected in MPI recent registrations."
  },
  {
    eventType: "NEW_REGISTRATION",
    registrationNumber: "P010225",
    tradeName: "Hustler",
    registrant: "Arxada NZ Limited",
    detectedAt: "2026-08-24",
    summary: "New herbicide registration detected in MPI recent registrations."
  }
];
