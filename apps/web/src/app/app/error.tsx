"use client";
import { Button } from "@/components/ui/button";
import { StatePanel } from "@/components/state-panel";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return <StatePanel title="That didn't load." body="It's on our side, not yours, and nothing you saved was lost. Give it another go." action={<Button onClick={reset}>Try again</Button>} />;
}
