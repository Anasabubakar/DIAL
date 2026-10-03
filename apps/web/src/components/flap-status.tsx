"use client";
import SplitFlapText from "./split-flap-text";

/** Cycles the three call phases on a split-flap board. Decorative: the real state lives in the workspace. */
export function FlapStatus() {
  return (
    <div role="img" aria-label="Call, review, done">
      <SplitFlapText words={["CALL", "REVIEW", "DONE"]} charset="alpha" padTo={6} fontSize={13} gap={2} tileRadius={3} tileColor="#355e4b" textColor="#ffffff" cycleDelay={2400} flipDuration={380} stagger={60} />
    </div>
  );
}
