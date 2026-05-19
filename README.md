# YWIYC Player

Static audio player for the 14 lesson set.

## Why audio may not work on Vercel

The app plays MP3 files from `audio/*.mp3` by default. This repository currently ignores the `audio/` folder, so Vercel deploys the player but not the MP3 files.

To make audio work online, host the MP3 files somewhere you are allowed to use, then set the base URL in `audio-config.js`.

```js
window.YWIYC_AUDIO_BASE_URL = "https://your-audio-host.example.com/ywiyc/";
```

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

Set these environment variables, then run the upload script:

```powershell
$env:SUPABASE_URL="https://YOUR_PROJECT_REF.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="YOUR_SERVICE_ROLE_KEY"
$env:SUPABASE_BUCKET="ywiyc-audio"
node upload-to-supabase.mjs
```

After upload, set `audio-config.js` to the public bucket URL printed by the script.
