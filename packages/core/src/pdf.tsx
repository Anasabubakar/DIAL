import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ProfileInput } from "@dial/contracts";

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 54, fontFamily: "Helvetica", fontSize: 10, color: "#171918", lineHeight: 1.45 },
  name: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  headline: { fontSize: 11, color: "#355E4B", marginBottom: 2 },
  contact: { fontSize: 9, color: "#69706C", marginBottom: 14 },
  h: { fontSize: 9, fontFamily: "Helvetica-Bold", letterSpacing: 1.2, color: "#355E4B", textTransform: "uppercase", marginTop: 14, marginBottom: 6, borderBottomWidth: 0.75, borderBottomColor: "#E4E6E0", paddingBottom: 3 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  title: { fontFamily: "Helvetica-Bold", fontSize: 10.5 },
  dates: { color: "#69706C", fontSize: 9 },
  org: { color: "#69706C", marginBottom: 2 },
  bullet: { flexDirection: "row", marginTop: 2 },
  dot: { width: 10 },
  entry: { marginBottom: 8 },
  footer: { position: "absolute", bottom: 28, left: 54, right: 54, fontSize: 8, color: "#69706C", textAlign: "right" },
});

// Standard PDF fonts only cover Latin-1; strip control characters and anything unrenderable.
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").replace(/[^ -ÿ\n]/g, "?");

export interface CvInput { profile: ProfileInput; selectedEntryIds: string[]; wording: { entryId: string; bullets: string[] }[] }

const kindTitle: Record<string, string> = { experience: "Experience", project: "Projects", education: "Education", certification: "Certifications", skill: "Skills" };

/** Deterministic template. Selected entries come first and use the (validated) reworded bullets. */
export async function renderCvPdf({ profile, selectedEntryIds, wording }: CvInput): Promise<Uint8Array> {
  const w = new Map(wording.map((x) => [x.entryId, x.bullets]));
  const sel = new Set(selectedEntryIds);
  const order = ["experience", "project", "education", "certification", "skill"];
  const groups = order.map((k) => ({
    k,
    items: profile.entries.filter((e) => e.kind === k).sort((a, b) => Number(sel.has(b.id)) - Number(sel.has(a.id))),
  })).filter((g) => g.items.length);

  const doc = (
    <Document title={`${profile.fullName} — CV`} author={profile.fullName}>
      <Page size="A4" style={styles.page} wrap>
        <Text style={styles.name}>{clean(profile.fullName)}</Text>
        {profile.headline ? <Text style={styles.headline}>{clean(profile.headline)}</Text> : null}
        <Text style={styles.contact}>{clean(profile.email)}</Text>
        {profile.summary ? (<><Text style={styles.h}>Summary</Text><Text>{clean(profile.summary)}</Text></>) : null}
        {groups.map((g) => (
          <View key={g.k}>
            <Text style={styles.h}>{kindTitle[g.k]}</Text>
            {g.items.map((e) => {
              const bullets = sel.has(e.id) && w.get(e.id)?.length ? (w.get(e.id) as string[]) : e.bullets;
              return (
                <View key={e.id} style={styles.entry} wrap={false}>
                  <View style={styles.row}>
                    <Text style={styles.title}>{clean(e.title)}</Text>
                    {e.start || e.end ? <Text style={styles.dates}>{clean([e.start, e.end].filter(Boolean).join(" – "))}</Text> : null}
                  </View>
                  {e.organization ? <Text style={styles.org}>{clean(e.organization)}</Text> : null}
                  {bullets.map((b, i) => (
                    <View key={i} style={styles.bullet}><Text style={styles.dot}>•</Text><Text style={{ flex: 1 }}>{clean(b)}</Text></View>
                  ))}
                </View>
              );
            })}
          </View>
        ))}
        <Text style={styles.footer} fixed render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
      </Page>
    </Document>
  );
  return new Uint8Array(await renderToBuffer(doc));
}
