"use client";
import { useState, useTransition } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./ui/dialog";
import { deleteAccount } from "@/lib/actions";

export function DeleteAccount() {
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <Dialog>
      <DialogTrigger asChild><Button variant="secondary" className="border-danger/40 text-danger">Delete my data</Button></DialogTrigger>
      <DialogContent title="Delete all your data?" description="This removes your profile, CV, roles, applications, documents and delivery records. It can't be undone. Emails already sent can't be recalled.">
        {err && <p role="alert" className="mb-3 text-sm text-danger">{err}</p>}
        <div className="flex justify-end gap-3">
          <DialogClose asChild><Button variant="ghost">Keep my data</Button></DialogClose>
          <Button variant="danger" disabled={pending} onClick={() => start(async () => { const r = await deleteAccount(); if (r && !r.ok) setErr(r.error); })}>{pending ? "Deleting…" : "Delete everything"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
