import { readFile, readdir } from "node:fs/promises";
import { extname, join } from "node:path";

const supabaseUrl = (
  process.env.SUPABASE_URL ||
  process.env.storage_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_storage_ywiycSUPABASE_URL ||
  "https://mehgmpyfexbzkmmzxpkk.supabase.co"
).replace(/\/$/, "");

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.storage_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.storage_SUPABASE_SECRET_KEY;
const bucket = process.env.SUPABASE_BUCKET || "ywiyc-audio";
const audioDir = process.env.AUDIO_DIR || "audio";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const headers = {
  apikey: serviceRoleKey,
  authorization: `Bearer ${serviceRoleKey}`,
};

async function ensureBucket() {
  const response = await fetch(`${supabaseUrl}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      ...headers,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: bucket,
      name: bucket,
      public: true,
      file_size_limit: 104857600,
      allowed_mime_types: ["audio/mpeg"],
    }),
  });

  if (response.ok || response.status === 409 || response.status === 400) return;

  const text = await response.text();
  throw new Error(`Could not create bucket: ${response.status} ${text}`);
}

async function uploadFile(fileName) {
  const filePath = join(audioDir, fileName);
  const bytes = await readFile(filePath);
  const objectPath = encodeURIComponent(fileName);
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${bucket}/${objectPath}`, {
    method: "PUT",
    headers: {
      ...headers,
      "content-type": "audio/mpeg",
      "x-upsert": "true",
    },
    body: bytes,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload failed for ${fileName}: ${response.status} ${text}`);
  }

  console.log(`Uploaded ${fileName}`);
}

await ensureBucket();

const files = (await readdir(audioDir))
  .filter((file) => extname(file).toLowerCase() === ".mp3")
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

for (const file of files) {
  await uploadFile(file);
}

console.log("");
console.log("Set this in audio-config.js:");
console.log(`window.YWIYC_AUDIO_BASE_URL = "${supabaseUrl}/storage/v1/object/public/${bucket}/";`);
