import { getSessionUser } from "@/server/auth";
import { redirect } from "next/navigation";
import { Avatar } from "@/components/ui";

export const metadata = { title: "Profile — Pathforge" };

export default async function ProfilePage() {
  const user = await getSessionUser();
  if (!user) redirect("/auth/login");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Avatar name={user.name} id={user.id} src={user.avatarUrl} size="xl" />
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {user.name}
          </h1>
          <p className="text-muted-foreground">@{user.username}</p>
        </div>
      </div>

      <div className="rounded-xl border border-input bg-card p-5 shadow-soft">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Account
        </h2>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="text-foreground">{user.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Username</span>
            <span className="text-foreground">{user.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Role</span>
            <span className="text-xs font-semibold text-signal uppercase">{user.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Timezone</span>
            <span className="text-foreground">{user.timezone}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
