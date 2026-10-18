import { redirect } from "next/navigation";
import { AppError } from "../errors";
import { Admin, type AdminDoc } from "../models/Admin";
import { Driver, type DriverDoc } from "../models/Driver";
import { User, type UserDoc } from "../models/User";
import { readSession } from "./session";

// Who is logged in on each app. Pages use the `…Page` helpers (redirect to login),
// server actions use the `…Action` helpers (return "session ended", which the client turns into a redirect).

export async function getCurrentUser(): Promise<(UserDoc & { sessionId: string }) | null> {
  const session = await readSession("user");
  if (!session) return null;
  const user = await User.findById(session.subjectId).lean();
  if (!user || !user.active) return null;
  return { ...user, sessionId: session._id };
}

export async function getCurrentDriver(): Promise<(DriverDoc & { sessionId: string }) | null> {
  const session = await readSession("driver");
  if (!session) return null;
  const driver = await Driver.findById(session.subjectId).lean();
  if (!driver || !driver.active) return null;
  return { ...driver, sessionId: session._id };
}

export async function getCurrentAdmin(): Promise<(AdminDoc & { sessionId: string }) | null> {
  const session = await readSession("panel");
  if (!session) return null;
  const admin = await Admin.findById(session.subjectId).lean();
  if (!admin || !admin.active) return null;
  return { ...admin, sessionId: session._id };
}

export async function requireUserPage(nextPath = "/home") {
  const user = await getCurrentUser();
  if (!user) redirect(`/account/login?next=${encodeURIComponent(nextPath)}`);
  if (user.mustChangePin) redirect("/account/set-pin");
  return user;
}

export async function requireDriverPage() {
  const driver = await getCurrentDriver();
  if (!driver) redirect("/login?ended=1");
  if (driver.mustChangePin) redirect("/set-pin");
  return driver;
}

export async function requireAdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/login?ended=1");
  if (admin.mustChangePin) redirect("/set-pin");
  return admin;
}

export async function requireSuperAdminPage() {
  const admin = await requireAdminPage();
  if (!admin.isSuperAdmin) redirect("/");
  return admin;
}

/** For actions that may run while a temporary PIN is still active (setting the new PIN). */
export async function requireUserSession() {
  const user = await getCurrentUser();
  if (!user) throw new AppError("errors.sessionEnded");
  return user;
}

export async function requireUserAction() {
  const user = await requireUserSession();
  if (user.mustChangePin) throw new AppError("errors.mustChangePin");
  return user;
}

export async function requireDriverSession() {
  const driver = await getCurrentDriver();
  if (!driver) throw new AppError("errors.sessionEnded");
  return driver;
}

export async function requireDriverAction() {
  const driver = await requireDriverSession();
  if (driver.mustChangePin) throw new AppError("errors.mustChangePin");
  return driver;
}

export async function requireAdminSession() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new AppError("errors.sessionEnded");
  return admin;
}

export async function requireAdminAction() {
  const admin = await requireAdminSession();
  if (admin.mustChangePin) throw new AppError("errors.mustChangePin");
  return admin;
}

export async function requireSuperAdminAction() {
  const admin = await requireAdminAction();
  if (!admin.isSuperAdmin) throw new AppError("errors.forbidden");
  return admin;
}
