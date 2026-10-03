import { api, requireSession } from "@/lib/api";
import type { IntegrationCard as Card } from "@/lib/types";
import { IntegrationCard, RunModes } from "@/components/integration-card";
import { DeleteAccount } from "@/components/delete-account";

export const metadata = { title: "Connections" };

export default async function Connections() {
  const cards = await api<Card[]>(await requireSession(), "/v1/integrations");
  const live = cards.filter((c) => c.state !== "planned");
  const planned = cards.filter((c) => c.state === "planned");
  return (
    <div className="space-y-14">
      <div>
        <p className="eyebrow">Connections</p>
        <h1 className="font-display mt-2 text-[clamp(2rem,4.5vw,3rem)]">What Dial can reach</h1>
        <p className="mt-3 max-w-2xl text-lg text-muted">Only what's connected shows as connected. Anything Dial can't do yet says so, and asks for no access.</p>
      </div>

      <section aria-labelledby="where">
        <h2 id="where" className="eyebrow mb-4">Where Dial runs a request</h2>
        <RunModes />
      </section>

      <section aria-labelledby="live">
        <h2 id="live" className="eyebrow mb-4">Working now</h2>
        <div className="grid gap-5 md:grid-cols-2">{live.map((c) => <IntegrationCard key={c.id} c={c} />)}</div>
      </section>

      <section aria-labelledby="planned">
        <h2 id="planned" className="eyebrow mb-1">Not built yet</h2>
        <p className="mb-4 text-muted">There's nothing to connect or revoke here. No sign-in screens, no scopes, until each one really works.</p>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{planned.map((c) => <IntegrationCard key={c.id} c={c} />)}</div>
      </section>

      <section aria-labelledby="data" className="rounded-[var(--radius-card)] border border-line bg-surface p-7">
        <h2 id="data" className="text-lg font-bold">Your data</h2>
        <p className="mt-2 max-w-2xl text-muted">Finished requests and their documents are deleted after 90 days. Call records are kept for 30 days. Dial doesn&apos;t keep call audio or full transcripts.</p>
        <div className="mt-5 border-t border-line pt-5">
          <p className="mb-3 font-semibold">Delete everything Dial holds about you</p>
          <DeleteAccount />
        </div>
      </section>
    </div>
  );
}
