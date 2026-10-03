import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { StorageProvider } from "./types";

export class LocalStorage implements StorageProvider {
  readonly name = "local";
  constructor(private root: string) {}
  private resolve(p: string) {
    const full = path.resolve(this.root, p);
    if (!full.startsWith(path.resolve(this.root) + path.sep)) throw new Error("invalid storage path");
    return full;
  }
  async put(p: string, bytes: Uint8Array) {
    const f = this.resolve(p);
    await mkdir(path.dirname(f), { recursive: true });
    await writeFile(f, bytes);
  }
  async get(p: string) { return new Uint8Array(await readFile(this.resolve(p))); }
  async remove(p: string) { await rm(this.resolve(p), { force: true }); }
}

/** Private Supabase Storage bucket. Service-role key stays in trusted server processes. */
export class SupabaseStorage implements StorageProvider {
  readonly name = "supabase";
  private client;
  constructor(url: string, serviceRoleKey: string, private bucket: string) {
    this.client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  }
  async put(p: string, bytes: Uint8Array, contentType: string) {
    const { error } = await this.client.storage.from(this.bucket).upload(p, bytes, { contentType, upsert: true });
    if (error) throw new Error(`storage put failed: ${error.message}`);
  }
  async get(p: string) {
    const { data, error } = await this.client.storage.from(this.bucket).download(p);
    if (error || !data) throw new Error(`storage get failed: ${error?.message ?? "empty"}`);
    return new Uint8Array(await data.arrayBuffer());
  }
  async remove(p: string) {
    const { error } = await this.client.storage.from(this.bucket).remove([p]);
    if (error) throw new Error(`storage remove failed: ${error.message}`);
  }
}

export class MemoryStorage implements StorageProvider {
  readonly name = "memory";
  files = new Map<string, Uint8Array>();
  async put(p: string, b: Uint8Array) { this.files.set(p, b); }
  async get(p: string) { const f = this.files.get(p); if (!f) throw new Error("not found"); return f; }
  async remove(p: string) { this.files.delete(p); }
}
