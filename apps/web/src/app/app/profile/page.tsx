import { api, requireSession } from "@/lib/api";
import type { Me } from "@/lib/types";
import { CvUpload, ProfileForm } from "@/components/profile-form";

export const metadata = { title: "Profile & CV" };

export default async function ProfilePage() {
  const me = await api<Me>(await requireSession(), "/v1/me");
  return (
    <div className="space-y-10">
      <div><p className="eyebrow">Source of truth</p><h1 className="font-display mt-2 text-5xl">Profile &amp; CV</h1>
        <p className="mt-3 max-w-2xl text-muted">Applications are written only from this profile. Review it, then confirm it. Anything you change afterwards needs confirming again.</p></div>
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_20rem]">
        <ProfileForm key={me.profile?.verifiedAt ?? "draft"} initial={me.profile} />
        <aside className="lg:sticky lg:top-24"><CvUpload cv={me.cv} /></aside>
      </div>
    </div>
  );
}
