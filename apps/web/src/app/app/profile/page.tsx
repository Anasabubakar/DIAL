import { api, requireSession } from "@/lib/api";
import type { Me } from "@/lib/types";
import { CvUpload, ProfileForm } from "@/components/profile-form";

export const metadata = { title: "Profile & CV" };

export default async function ProfilePage() {
  const me = await api<Me>(await requireSession(), "/v1/me");
  return (
    <div className="space-y-10">
      <div><p className="eyebrow">About you</p><h1 className="font-display mt-2 text-[clamp(2rem,4.5vw,3rem)]">Your profile and CV</h1>
        <p className="mt-3 max-w-2xl text-muted">Dial writes every application from this profile and nothing else. Check it, confirm it, and you're set.</p></div>
      <div className="grid items-start gap-10 lg:grid-cols-[1fr_20rem]">
        <ProfileForm initial={me.profile} />
        <aside className="lg:sticky lg:top-24"><CvUpload cv={me.cv} /></aside>
      </div>
    </div>
  );
}
