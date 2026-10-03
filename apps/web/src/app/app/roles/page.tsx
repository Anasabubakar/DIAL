import { api, requireSession } from "@/lib/api";
import type { Me } from "@/lib/types";
import { RoleForm, DeleteRole } from "@/components/role-form";
import { PrepareForm } from "@/components/prepare-form";
import { Briefcase } from "lucide-react";

export const metadata = { title: "Roles" };

export default async function RolesPage() {
  const me = await api<Me>(await requireSession(), "/v1/me");
  return (
    <div className="space-y-10">
      <div><p className="eyebrow">Opportunities</p><h1 className="font-display mt-2 text-5xl">Saved roles</h1>
        <p className="mt-3 max-w-2xl text-muted">When you call, DIAL picks from these. Keep the application email accurate; it&apos;s read back to you before anything is sent.</p></div>
      <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
        <RoleForm />
        <section>
          <h2 className="eyebrow mb-4">{me.roles.length} saved</h2>
          {me.roles.length === 0 ? (
            <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong px-6 py-12 text-center">
              <Briefcase className="mx-auto mb-3 size-6 text-muted" /><p className="font-display text-2xl">No roles yet</p>
              <p className="mx-auto mt-2 max-w-xs text-sm text-muted">Add a role and its job description. You can then prepare an application here or by phone.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {me.roles.map((r) => (
                <li key={r.id} className="rounded-[var(--radius-card)] border border-line bg-surface p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-medium">{r.title}</p><p className="text-sm text-muted">{r.company} · {r.applyEmail}</p></div>
                    <DeleteRole id={r.id} label={r.title} />
                  </div>
                  <p className="mt-3 line-clamp-3 text-sm text-muted">{r.description}</p>
                  <div className="mt-4 border-t border-line pt-4"><PrepareForm roles={[r]} hasCv={!!me.cv} ready={!!me.profile?.verifiedAt} /></div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
