import { decideAuthEvent } from "../src/utils/authSessionEvents.ts";

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
    );
  }
}

Deno.test("keeps an initialized signed-in user without reloading data", () => {
  assertEquals(
    decideAuthEvent({
      event: "SIGNED_IN",
      currentUserId: "user-1",
      nextUserId: "user-1",
      initialized: true,
      hasRole: true,
    }),
    { reinitialize: false, showLoading: false, clear: false },
    "Same initialized user"
  );
});

Deno.test("reinitializes with loading when the signed-in account changes", () => {
  assertEquals(
    decideAuthEvent({
      event: "SIGNED_IN",
      currentUserId: "user-1",
      nextUserId: "user-2",
      initialized: true,
      hasRole: true,
    }),
    { reinitialize: true, showLoading: true, clear: false },
    "Different signed-in user"
  );
});

Deno.test("clears local user data after sign-out", () => {
  assertEquals(
    decideAuthEvent({
      event: "SIGNED_OUT",
      currentUserId: "user-1",
      nextUserId: null,
      initialized: true,
      hasRole: true,
    }),
    { reinitialize: false, showLoading: false, clear: true },
    "Signed-out user"
  );
});

Deno.test("token refresh recovers missing initialization without unnecessary loading", () => {
  assertEquals(
    decideAuthEvent({
      event: "TOKEN_REFRESHED",
      currentUserId: "user-1",
      nextUserId: "user-1",
      initialized: false,
      hasRole: true,
    }),
    { reinitialize: true, showLoading: false, clear: false },
    "Existing role does not need blocking loading"
  );

  assertEquals(
    decideAuthEvent({
      event: "TOKEN_REFRESHED",
      currentUserId: "user-1",
      nextUserId: "user-1",
      initialized: true,
      hasRole: false,
    }),
    { reinitialize: true, showLoading: true, clear: false },
    "Missing role needs blocking loading"
  );
});
