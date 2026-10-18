"use server";

import { cookies } from "next/headers";
import { getLanguage } from "@/i18n/server";
import { GUEST_COOKIE } from "@/lib/constants";
import type { OrderInput } from "@/lib/schemas";
import { getCurrentUser, requireUserAction, requireUserSession } from "@/server/auth/current";
import { endSession } from "@/server/auth/session";
import { runAction } from "@/server/errors";
import { login, registerUser, requestUserPinReset, setNewPin } from "@/server/services/auth";
import { createOrder } from "@/server/services/orders";
import { updateOwnProfile } from "@/server/services/people";



export async function loginUserAction(input: { phone: string; pin: string }) {
  return runAction("site.login", input, () => login("user", input.phone, input.pin));
}

export async function registerUserAction(input: { name: string; phone: string; email: string; pin: string; confirmPin: string }) {
  return runAction("site.register", input, () => registerUser(input));
}

export async function logoutUserAction() {
  return runAction("site.logout", {}, () => endSession("user"));
}

export async function forgotPinAction(input: { phone: string }) {
  return runAction("site.forgotPin", input, async () => requestUserPinReset(input.phone, await getLanguage()));
}

export async function setUserPinAction(input: { currentPin?: string; newPin: string; confirmPin: string }) {
  return runAction("site.setPin", input, async () => {
    const user = await requireUserSession();
    await setNewPin("user", user, input);
  });
}

export async function updateProfileAction(input: { name: string; phone: string; email: string }) {
  return runAction("site.updateProfile", input, async () => {
    const user = await requireUserAction();
    await updateOwnProfile(user._id, input);
  });
}

/** Request form. Logged-in users get the order in "My orders"; guests get a private link kept on this device. */
export async function createWebOrderAction(input: OrderInput) {
  return runAction("site.createOrder", input, async () => {
    const user = await getCurrentUser();
    if (user?.mustChangePin) await requireUserAction();
    const result = await createOrder({ input, source: "web", userId: user?._id ?? null, language: await getLanguage() });
    if (result.guestToken) {
      const cookieStore = await cookies();
      const previous = (cookieStore.get(GUEST_COOKIE)?.value ?? "").split(".").filter(Boolean);
      const tokens = [result.guestToken, ...previous].slice(0, 5);
      cookieStore.set(GUEST_COOKIE, tokens.join("."), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 90 });
    }
    return { number: result.number, guestToken: result.guestToken };
  });
}
