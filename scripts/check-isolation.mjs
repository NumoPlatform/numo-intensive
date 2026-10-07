import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const root = process.cwd();
const roots = ["app", "lib", "middleware.ts", "package.json", "next.config.mjs", "vercel.json"];
const forbidden = [
  { pattern: /@\/lib\/advisor\b/i, label: "Advisor library import" },
  { pattern: /@\/components\/(?:Header|Footer|assistant)\b/i, label: "shared Advisor chrome import" },
  { pattern: /\bAssistantProvider\b|\bPremiumFloatingAssistant\b|\bNumoContactDock\b/i, label: "shared assistant UI" },
  { pattern: /\bTRUSTED_DEVICE_COOKIE\b|x-vercel-ip-country/i, label: "Advisor access middleware" },
  { pattern: /\bobservatory\b|\bmarصد\b/i, label: "Observatory dependency" },
  { pattern: /process\.env\.(?:SUPABASE_|NEXT_PUBLIC_SUPABASE_|NUMO_SUPABASE_)/, label: "non-dedicated Supabase environment variable" },
  { pattern: /rysxavefvizteeccksmj/i, label: "legacy Supabase project reference" },
  { pattern: /NumoPlatform\/aou-smart-guide|aou-smart-guide-green\.vercel\.app/i, label: "legacy project or repository reference" },
  { pattern: /\/rest\/v1\/rpc\/intensive_(?:start_exam|save_answer|submit_attempt)(?=[\"'])/, label: "direct base exam RPC bypass" },
  { pattern: /[\"'`]\/(?:api\/)?intensive(?:\/|[\"'`])/, label: "legacy /intensive route dependency" },
];

async function collect(target) {
  const full = join(root, target);
  const info = await stat(full);
  if (info.isFile()) return [full];

  const entries = await readdir(full, { withFileTypes: true });
  const nested = [];
  for (const entry of entries) {
    const child = join(full, entry.name);
    if (entry.isDirectory()) nested.push(...await collect(relative(root, child)));
    else if (/\.(?:ts|tsx|js|mjs|json)$/.test(entry.name)) nested.push(child);
  }
  return nested;
}

const files = [];
for (const target of roots) files.push(...await collect(target));

const violations = [];
for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const rule of forbidden) {
    if (rule.pattern.test(content)) {
      violations.push(`${relative(root, file)}: ${rule.label}`);
    }
  }
}

if (violations.length) {
  console.error("NUMO ACADEMIC SIMULATOR isolation check failed:");
  for (const item of violations) console.error(" - " + item);
  process.exit(1);
}

console.log(`NUMO ACADEMIC SIMULATOR isolation check passed for ${files.length} source files.`);
