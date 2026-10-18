import { Sidebar } from "@/components/panel/Sidebar";
import { TopBar } from "@/components/panel/TopBar";
import { requireAdminPage } from "@/server/auth/current";
import { isMaintenance } from "@/server/services/settings";

export const dynamic = "force-dynamic";

export default async function PanelAppLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <Sidebar admin={{ name: admin.name, isSuperAdmin: admin.isSuperAdmin }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar maintenance={await isMaintenance()} />
        <main className="flex flex-1 flex-col gap-5 p-4 md:p-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
