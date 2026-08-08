import { describe, it, expect } from "vitest";
import { getClientIdentifier } from "../middleware/rateLimiter";
import { firebaseDB } from "../firebase";

describe("Authentication Consistency & Security Audit Tests", () => {
  it("should bind guest identity to IP address to prevent quota abuse", () => {
    const reqGuest1 = {
      headers: { "x-forwarded-for": "203.0.113.19" },
      user: { email: "guest_abc123@guest.studymate.ai", uid: "guest_abc123" }
    } as any;
    const idGuest1 = getClientIdentifier(reqGuest1);
    expect(idGuest1).toBe("guest:203.0.113.19:guest_abc123@guest.studymate.ai");

    const reqGuest2 = {
      headers: { "x-forwarded-for": "203.0.113.19" },
      user: { email: "guest_xyz789@guest.studymate.ai", uid: "guest_xyz789" }
    } as any;
    const idGuest2 = getClientIdentifier(reqGuest2);
    expect(idGuest2.startsWith("guest:203.0.113.19:")).toBe(true);

    const reqUserReg = {
      headers: { "x-forwarded-for": "203.0.113.19" },
      user: { email: "student@example.com", uid: "uid_student_1" }
    } as any;
    const idReg = getClientIdentifier(reqUserReg);
    expect(idReg).toBe("user:student@example.com");
  });

  it("should cryptographically reject unverified/forged Firebase ID token", async () => {
    await expect(
      firebaseDB.verifyFirebaseIdToken("invalid_forged_token.payload.signature")
    ).rejects.toThrow();
  });
});
