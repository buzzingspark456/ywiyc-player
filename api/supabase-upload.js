export const config = {
  api: {
    bodyParser: false,
  },
};

const PROJECT_URL =
  process.env.storage_SUPABASE_URL ||
  process.env.NEXT_PUBLIC_storage_ywiycSUPABASE_URL ||
  "https://mehgmpyfexbzkmmzxpkk.supabase.co";

const SERVICE_KEY =
  process.env.storage_SUPABASE_SERVICE_ROLE_KEY ||
  process.env.storage_SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET = "ywiyc-audio";
const TOKEN = "ywiyc-upload-2026";

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function ensureBucket() {
  const response = await fetch(`${PROJECT_URL.replace(/\/$/, "")}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      authorization: `Bearer ${SERVICE_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      id: BUCKET,
      name: BUCKET,
      public: true,
      allowed_mime_types: ["audio/mpeg"],
      file_size_limit: 104857600,
    }),
  });

  if (response.ok || response.status === 400 || response.status === 409) return;
  throw new Error(`Bucket create failed: ${response.status} ${await response.text()}`);
}

export default async function handler(req, res) {
  try {
    if (req.headers["x-upload-token"] !== TOKEN) {
      res.status(401).json({ error: "unauthorized" });
      return;
    }

    if (!SERVICE_KEY) {
      res.status(500).json({ error: "missing_supabase_service_key" });
      return;
    }

    if (req.method === "GET" && req.query.action !== "sign") {
      res.status(200).json({
        ok: true,
        projectUrl: PROJECT_URL,
        hasServiceKey: Boolean(SERVICE_KEY),
      });
      return;
    }

    const fileName = req.query.name;
    if (!fileName || typeof fileName !== "string" || !fileName.endsWith(".mp3")) {
      res.status(400).json({ error: "missing_or_invalid_name" });
      return;
    }

    if (req.method === "GET" && req.query.action === "sign") {
      await ensureBucket();

      const signUrl = `${PROJECT_URL.replace(/\/$/, "")}/storage/v1/object/upload/sign/${BUCKET}/${encodeURIComponent(fileName)}`;
      const signed = await fetch(signUrl, {
        method: "POST",
        headers: {
          apikey: SERVICE_KEY,
          authorization: `Bearer ${SERVICE_KEY}`,
          "content-type": "application/json",
          "x-upsert": "true",
        },
        body: JSON.stringify({}),
      });

      if (!signed.ok) {
        res.status(signed.status).send(await signed.text());
        return;
      }

      const data = await signed.json();
      const relativeUrl = data.url || data.signedURL || data.signedUrl;
      const uploadUrl = relativeUrl?.startsWith("http")
        ? relativeUrl
        : `${PROJECT_URL.replace(/\/$/, "")}/storage/v1${relativeUrl}`;

      res.status(200).json({ ok: true, fileName, uploadUrl });
      return;
    }

    if (req.method !== "PUT") {
      res.status(405).json({ error: "method_not_allowed" });
      return;
    }

    await ensureBucket();

    const body = await readBody(req);
    const uploadUrl = `${PROJECT_URL.replace(/\/$/, "")}/storage/v1/object/${BUCKET}/${encodeURIComponent(fileName)}`;
    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        apikey: SERVICE_KEY,
        authorization: `Bearer ${SERVICE_KEY}`,
        "content-type": "audio/mpeg",
        "x-upsert": "true",
      },
      body,
    });

    if (!upload.ok) {
      res.status(upload.status).send(await upload.text());
      return;
    }

    res.status(200).json({ ok: true, fileName, bytes: body.length });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
