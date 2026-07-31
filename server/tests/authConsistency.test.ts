import { getClientIdentifier } from "../middleware/rateLimiter";
import { firebaseDB } from "../firebase";

function runAuthTests() {
  console.log("=== Running Authentication Consistency & Security Audit Tests ===");
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  // Test 1: Anonymous Quota Abuse Protection in Rate Limiter Client Identifier
  const reqGuest1 = {
    headers: { "x-forwarded-for": "203.0.113.19" },
    user: { email: "guest_abc123@guest.studymate.ai", uid: "guest_abc123" }
  } as any;
  const idGuest1 = getClientIdentifier(reqGuest1);
  assert(
    idGuest1 === "guest:203.0.113.19:guest_abc123@guest.studymate.ai",
    "Binds guest identity to IP address to prevent quota abuse"
  );

  const reqGuest2 = {
    headers: { "x-forwarded-for": "203.0.113.19" },
    user: { email: "guest_xyz789@guest.studymate.ai", uid: "guest_xyz789" }
  } as any;
  const idGuest2 = getClientIdentifier(reqGuest2);
  assert(
    idGuest2.startsWith("guest:203.0.113.19:"),
    "Maintains IP attribution across multiple guest token identities from same client IP"
  );

  const reqUserReg = {
    headers: { "x-forwarded-for": "203.0.113.19" },
    user: { email: "student@example.com", uid: "uid_student_1" }
  } as any;
  const idReg = getClientIdentifier(reqUserReg);
  assert(
    idReg === "user:student@example.com",
    "Uses clean user identity key for registered user accounts"
  );

  // Test 2: Unauthenticated / Forged Firebase ID Token Rejection
  firebaseDB.verifyFirebaseIdToken("invalid_forged_token.payload.signature")
    .then(() => {
      assert(false, "Rejects invalid / forged Firebase ID token");
    })
    .catch((err: Error) => {
      assert(
        err.message.includes("Cryptographic verification failed") || err.message.includes("verification failed"),
        "Cryptographically rejects unverified / forged Firebase ID token"
      );
    })
    .finally(() => {
      console.log(`\nAuth Audit Summary: ${passed} Passed, ${failed} Failed`);
      process.exit(failed > 0 ? 1 : 0);
    });
}

runAuthTests();
