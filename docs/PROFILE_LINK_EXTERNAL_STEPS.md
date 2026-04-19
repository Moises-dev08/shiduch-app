# Profile share deep links — external setup step by step

This guide covers everything you need to do **outside** the mobile app code to make the two profile-share features work end to end.

**Target stack:** landing page is a **Create React App** (CRA) project hosted on **Netlify**. The steps below are tailored to that setup.

---

## Step 1 — Collect the values you'll plug in

Gather these five items before editing anything:

| # | What | Where to find it |
|---|------|------------------|
| 1 | **Apple Team ID** (10 characters, e.g. `ABC12DEF34`) | Apple Developer portal → Membership Details |
| 2 | **Android SHA-256 signing fingerprint** | Run `eas credentials` → Android → production → Keystore → show fingerprint. Or Play Console → App integrity → App signing key certificate (SHA-256) |
| 3 | **App Store numeric ID** (e.g. `1234567890`) | App Store Connect → your app → App Information. If not published yet, use a placeholder and update later. |
| 4 | **App Store listing URL** (e.g. `https://apps.apple.com/app/id1234567890`) | App Store Connect, once listed |
| 5 | **Play Store listing URL** (e.g. `https://play.google.com/store/apps/details?id=com.zivugmishamayim`) | Play Console, once listed |

If items 3-5 aren't available yet because the app isn't published, use "coming soon" placeholders and revisit after launch.

---

## Step 2 — Create the Apple verification file in your CRA project

In the landing page repo, create the file at:

```
public/.well-known/apple-app-site-association
```

**Important:** no file extension, not `.json`. CRA copies everything in `public/` to the build output as-is.

Contents (replace `<APPLE_TEAM_ID>`):

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appIDs": ["<APPLE_TEAM_ID>.com.zivugmishamayim"],
        "components": [
          { "/": "/profile/*", "comment": "Matches any profile share URL" }
        ]
      }
    ]
  }
}
```

---

## Step 3 — Create the Android verification file

Create the file at:

```
public/.well-known/assetlinks.json
```

Contents (replace `<APP_SIGNING_SHA256>`):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.zivugmishamayim",
      "sha256_cert_fingerprints": ["<APP_SIGNING_SHA256>"]
    }
  }
]
```

If you have both an upload key and a Play App Signing key, include both fingerprints:

```json
"sha256_cert_fingerprints": ["AA:BB:...", "CC:DD:..."]
```

---

## Step 4 — Force the correct Content-Type on Netlify

Without this step, Netlify serves the extensionless AASA file as `application/octet-stream`, which iOS silently rejects and Universal Links will never verify.

Create or append to **`public/_headers`**:

```
/.well-known/apple-app-site-association
  Content-Type: application/json
  Cache-Control: public, max-age=3600

/.well-known/assetlinks.json
  Content-Type: application/json
  Cache-Control: public, max-age=3600
```

---

## Step 5 — Make sure the SPA redirect is in place

CRA on Netlify needs this so React Router can handle `/profile/:id` directly. Your **`public/_redirects`** should contain:

```
/*    /index.html   200
```

Netlify serves actual files in `.well-known/` before applying the SPA fallback, so the AASA and assetlinks URLs return the raw JSON files, not `index.html`.

---

## Step 6 — Add the React `ProfilePage` component

Create `src/pages/ProfilePage.tsx` (or `.jsx`) in the landing repo:

```tsx
import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

// === Update these when stores are live ===
const APP_STORE_URL  = 'https://apps.apple.com/app/idYOUR_APP_ID';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.zivugmishamayim';
const ANDROID_PACKAGE = 'com.zivugmishamayim';
const APP_SCHEME = 'shiduchimapp';
// ==========================================

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();

  const openApp = () => {
    if (!id) return;
    const ua = navigator.userAgent || '';
    const isAndroid = /Android/i.test(ua);
    const isIOS = /iPhone|iPad|iPod/i.test(ua);

    if (isAndroid) {
      // Intent URL with automatic Play Store fallback.
      const intentUrl =
        `intent://profile/${id}#Intent;scheme=${APP_SCHEME};` +
        `package=${ANDROID_PACKAGE};` +
        `S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;
      window.location.href = intentUrl;
      return;
    }

    // iOS + desktop: try the custom scheme; if still here after 2s on iOS,
    // assume app not installed and send to App Store.
    const started = Date.now();
    window.location.href = `${APP_SCHEME}://profile/${id}`;
    if (isIOS) {
      setTimeout(() => {
        if (Date.now() - started < 2200 && !document.hidden) {
          window.location.href = APP_STORE_URL;
        }
      }, 2000);
    }
  };

  useEffect(() => {
    if (!id) return;
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent || '');
    if (isMobile) {
      const t = setTimeout(openApp, 150);
      return () => clearTimeout(t);
    }
  }, [id]);

  if (!id) {
    return <div style={{ padding: 24 }}>Invalid link.</div>;
  }

  return (
    <div style={{ fontFamily: 'system-ui', textAlign: 'center', padding: 24, maxWidth: 360, margin: '0 auto' }}>
      <h1 style={{ color: '#0d4f8a' }}>Zivug Mishamayim</h1>
      <p style={{ color: '#555' }}>
        Someone shared a profile with you. Open it in the app, or download the app first.
      </p>

      <button
        onClick={openApp}
        style={{ width: '100%', padding: 14, borderRadius: 12, background: '#1293da', color: '#fff', border: 'none', fontWeight: 600, fontSize: 16, margin: '10px 0', cursor: 'pointer' }}
      >
        Open in app
      </button>

      <div style={{ marginTop: 28, paddingTop: 24, borderTop: '1px solid #ddd' }}>
        <h2 style={{ fontSize: 16 }}>Don't have the app yet?</h2>
        <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer"
           style={{ display: 'block', width: '100%', padding: 14, borderRadius: 12, border: '2px solid #1293da', color: '#1293da', margin: '10px 0', fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box' }}>
          Download for iPhone
        </a>
        <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer"
           style={{ display: 'block', width: '100%', padding: 14, borderRadius: 12, border: '2px solid #1293da', color: '#1293da', margin: '10px 0', fontWeight: 600, textDecoration: 'none', boxSizing: 'border-box' }}>
          Download for Android
        </a>
      </div>
    </div>
  );
}
```

Register the route in your router, e.g. in `src/App.tsx`:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProfilePage from './pages/ProfilePage';

<BrowserRouter>
  <Routes>
    {/* ...existing routes... */}
    <Route path="/profile/:id" element={<ProfilePage />} />
  </Routes>
</BrowserRouter>
```

---

## Step 7 — Add static OG meta tags

Bots (iMessage, WhatsApp, Facebook, Slack) **do not execute JavaScript**, so `react-helmet` tags from the React tree never reach them. Use static tags in **`public/index.html`** `<head>`:

```html
<meta property="og:title" content="Zivug Mishamayim — View a profile" />
<meta property="og:description" content="Someone shared a profile with you. Open it in the Zivug Mishamayim app." />
<meta property="og:type" content="website" />
<meta property="og:image" content="https://www.zivugmishamayim.com/logo-stores.png" />
```

Also add an iOS Smart App Banner (helps when the user lands on the page in Safari even if Universal Links didn't fire):

```html
<meta name="apple-itunes-app" content="app-id=YOUR_APP_STORE_ID" />
```

Replace `YOUR_APP_STORE_ID` with your numeric App Store ID once published.

For **per-profile** previews (showing the actual person's name/photo in link cards), see the Optional section at the bottom.

---

## Step 8 — Deploy to Netlify

Commit and push; Netlify auto-builds. Final deployed file structure:

```
https://www.zivugmishamayim.com/
├── /.well-known/apple-app-site-association   (JSON, no extension)
├── /.well-known/assetlinks.json              (JSON)
├── /profile/:id                              (React route → ProfilePage)
└── ...rest of the landing page
```

---

## Step 9 — Verify everything

Run these three checks after deploy:

1. **iOS AASA** — must return 200 with `Content-Type: application/json`:

   ```bash
   curl -I https://www.zivugmishamayim.com/.well-known/apple-app-site-association
   ```

2. **Apple's CDN cache** (what iOS actually reads) — may take a few hours to populate after first deploy:

   ```
   https://app-site-association.cdn-apple.com/a/v1/www.zivugmishamayim.com
   ```

3. **Android assetlinks** — Google's tester:

   ```
   https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.zivugmishamayim.com&relation=delegate_permission/common.handle_all_urls
   ```

   Should return your package and SHA-256.

---

## Step 10 — Build the mobile app (not Expo Go)

Universal Links and custom schemes **do not work in Expo Go**. From the mobile app repo root:

```bash
# Dev build you can iterate with
eas build --profile development --platform ios
eas build --profile development --platform android

# Or a production build
eas build --profile production --platform all
```

Install the resulting build on a **real device** — iOS simulators don't reliably verify AASA, so Universal Links testing requires a physical iPhone.

---

## Step 11 — End-to-end smoke test

On a real device with the app installed:

1. Open the app, go to your own profile, tap the share icon.
2. Send the message to yourself via iMessage / WhatsApp / email.
3. Tap the link.
   - **iOS + verified:** app opens straight to the profile.
   - **Android + verified:** app opens straight to the profile.
   - **Anywhere else:** landing page loads → auto-attempts the app → falls back to the store after 2 s.
4. Log out of the app, tap the share link again: you should land on the login screen. After signing in, you should be dropped on the shared profile automatically (this uses the `pendingProfileDeepLink` flow in `app/_layout.tsx`).

---

## Step 12 — Once the stores are live

Come back to the landing page and update:

- `APP_STORE_URL` in `ProfilePage.tsx` with the real `apps.apple.com/app/idXXXXXXX` link.
- `PLAY_STORE_URL` in `ProfilePage.tsx` with the real `play.google.com/...` link.
- The `apple-itunes-app` meta tag `app-id=` value in `public/index.html`.

If you ever rotate your Android signing key, you **must** regenerate and redeploy `assetlinks.json` with the new SHA-256 or Android link verification will fail silently on upgrade.

---

## Optional follow-ups (not required for it to work)

### Per-profile OG preview cards

To show the actual person's name/photo in link previews (Messages, WhatsApp, Slack), you need to render OG tags server-side for bot user-agents. CRA is client-only, so options are:

1. **Netlify Edge Function** that intercepts `/profile/:id` requests from known bots (`facebookexternalhit`, `WhatsApp`, `Twitterbot`, `Slackbot`, `LinkedInBot`, etc.), fetches the profile from Supabase, and returns a minimal HTML page with per-profile OG tags. Humans still get the React app. Example:

   ```
   // netlify/edge-functions/profile-og.ts
   export default async (request, context) => {
     const ua = request.headers.get('user-agent') || '';
     const isBot = /facebookexternalhit|WhatsApp|Twitterbot|Slackbot|LinkedInBot|Discordbot/i.test(ua);
     if (!isBot) return; // let normal SPA serve it
     const id = new URL(request.url).pathname.split('/').pop();
     const profile = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${id}&select=first_name,pictures`, {
       headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` }
     }).then(r => r.json());
     const p = profile[0];
     return new Response(
       `<!DOCTYPE html><html><head>
          <meta property="og:title" content="${p.first_name} — Zivug Mishamayim" />
          <meta property="og:image" content="${p.pictures?.[0] ?? ''}" />
          <meta property="og:type" content="profile" />
        </head></html>`,
       { headers: { 'content-type': 'text/html' } }
     );
   };
   ```

   Register it in `netlify.toml`:

   ```toml
   [[edge_functions]]
     function = "profile-og"
     path = "/profile/*"
   ```

   Be mindful of privacy — only expose fields that are safe to make public (first name, maybe first picture only if the profile's privacy allows).

2. **Migrate to Next.js App Router** where you can render OG tags server-side for every request via `generateMetadata`. Bigger change, but cleaner long-term.

### Authenticate-then-open

The current landing page assumes anyone can visit a profile id in the browser. If you want privacy enforced even on the landing page, require login there before showing any profile data. The mobile app already enforces privacy rules once the user is authenticated in-app.

---

## Quick reference

| Task | File / URL |
|------|------------|
| Apple verification | `public/.well-known/apple-app-site-association` |
| Android verification | `public/.well-known/assetlinks.json` |
| Content-Type headers | `public/_headers` |
| SPA rewrite | `public/_redirects` |
| Landing page route | `src/pages/ProfilePage.tsx` + `<Route path="/profile/:id" />` |
| Static OG tags | `public/index.html` |
| Detailed technical notes | `docs/PROFILE_LINK_SETUP.md` |
