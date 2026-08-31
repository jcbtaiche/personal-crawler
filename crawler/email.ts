import { USER_AGENT } from "./util.ts";
import type { Item } from "./types.ts";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function list(items: Item[]): string {
  if (!items.length) return "<p>None.</p>";
  return `<ul>${items
    .map(
      (item) =>
        `<li><a href="${escapeHtml(item.url)}">${escapeHtml(item.title)}</a> — ${escapeHtml(item.source)} (${item.date}) [${item.kind}, ${item.status}]</li>`,
    )
    .join("")}</ul>`;
}

export async function sendDigest(newItems: Item[]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.NOTIFY_EMAIL;
  const from = process.env.NOTIFY_FROM || "Personal crawler <onboarding@resend.dev>";

  if (!apiKey || !to) {
    console.log("Skipping email (set RESEND_API_KEY and NOTIFY_EMAIL to enable).");
    return;
  }

  const published = newItems.filter((i) => i.status === "published");
  const inbox = newItems.filter((i) => i.status === "inbox");
  const subject = `New mentions: ${newItems.length} item${newItems.length === 1 ? "" : "s"}`;

  const html = `
    <p>${newItems.length} new item${newItems.length === 1 ? "" : "s"} added to the archive.</p>
    <h3>Published</h3>
    ${list(published)}
    <h3>Inbox (needs review)</h3>
    ${list(inbox)}
    <p>Promote or drop inbox items in <code>data/items.yaml</code> (<code>status: published</code> or delete the entry).</p>
  `;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed (${res.status}): ${body}`);
  }
  console.log(`Emailed digest to ${to}`);
}
