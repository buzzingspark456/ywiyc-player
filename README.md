# YWIYC Player

Static audio player for the 14 lesson set.

## Audio hosting

The app plays MP3 files from a public Supabase Storage bucket.

Current base URL:

```js
window.YWIYC_AUDIO_BASE_URL = "https://mehgmpyfexbzkmmzxpkk.supabase.co/storage/v1/object/public/ywiyc-audio/";
```

The bucket must be named `ywiyc-audio` and configured for public read. The frontend does not use `SUPABASE_SERVICE_ROLE_KEY`; that key is only for server-side/local upload scripts.

The files must keep these names:

- `Your Wish Is Your Command Disk 1.mp3`
- `Your Wish Is Your Command Disk 2.mp3`
- `Your Wish Is Your Command Disk 3.mp3`
- `Your Wish Is Your Command Disk 4.mp3`
- `Your Wish Is Your Command Disk 5.mp3`
- `Your Wish Is Your Command Disk 6.mp3`
- `Your Wish Is Your Command Disk 7.mp3`
- `Your Wish Is Your Command Disk 8.mp3`
- `Your Wish Is Your Command Disk 9.mp3`
- `Your Wish Is Your Command Disk 10.mp3`
- `Your Wish Is Your Command Disk 11.mp3`
- `Your Wish Is Your Command Disk 12.mp3`
- `Your Wish Is Your Command Disk 13.mp3`
- `Your Wish is Your Command - How to Manifest Your Desires Disk 14.mp3`

The player saves the current lesson and exact resume time in the browser using `localStorage`.

## Upload audio to Supabase Storage

The upload script is local/server-side only. It uses the service role key to create a public bucket and upload the MP3s. Never expose the service role key in frontend code.

Set these environment variables, then run the upload script:

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
$env:SUPABASE_BUCKET="ywiyc-audio"
node upload-to-supabase.mjs
```

After upload, set `audio-config.js` to the public bucket URL printed by the script.

You can also do this manually in the Supabase dashboard:

1. Open Storage.
2. Create a bucket named `ywiyc-audio`.
3. Make the bucket public.
4. Upload all 14 MP3 files with the exact names above.
5. Check that Lesson 1 opens at:

```text
https://mehgmpyfexbzkmmzxpkk.supabase.co/storage/v1/object/public/ywiyc-audio/Your%20Wish%20Is%20Your%20Command%20Disk%201.mp3
```
