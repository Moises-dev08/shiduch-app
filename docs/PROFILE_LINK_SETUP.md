# Profile share links — what you need on the landing page

The app shares URLs shaped like:

**`https://www.zivugmishamayim.com/profile/<PROFILE_ID>`**

When a recipient taps that link one of three things should happen:

1. **App is installed + Universal/App Links are verified** → the phone opens the app straight to the profile, bypassing this website completely.
2. **App is installed but Universal Links are not verified (or user is on desktop / a browser that strips the link)** → this landing page loads and the user can tap "Open in app", which uses the `shiduchimapp://` custom scheme.
3. **App is not installed** → this landing page redirects them to the App Store / Play Store.

---

## Part 1 — Serve the landing page (required)

Deploy **`web/share-profile-landing.html`** (in this repo) on **www.zivugmishamayim.com**.

Rewrite `/profile/*` to that HTML file with HTTP **200** (not 301/302 — the URL must stay as `/profile/UUID`).

### Netlify

```
# _redirects
/profile/*  /share-profile-landing.html  200
```

### Vercel

```json
// vercel.json
{
  "rewrites": [{ "source": "/profile/:id*", "destination": "/share-profile-landing.html" }]
}
```

### Nginx

```
location ~ ^/profile/ {
  try_files /share-profile-landing.html =404;
}
```

Inside the HTML, set real values for these four constants at the top of the `<script>`:

- `APP_STORE_URL` → iOS App Store listing URL once published
- `PLAY_STORE_URL` → Google Play listing URL once published
- `ANDROID_PACKAGE` → `com.zivugmishamayim` (already set)
- `APP_SCHEME` → `shiduchimapp` (already set)

Also set `app-id=APP_STORE_ID` in the `apple-itunes-app` meta tag once you have the numeric App Store ID.

---

## Part 2 — iOS Universal Links (strongly recommended)

Without this, iOS may open Safari first and the user has to tap "Open in app" on the landing page. With this, the app opens directly.

Host an **`apple-app-site-association`** file (**no extension**, served as `application/json`, **no redirects**) at:

```
https://www.zivugmishamayim.com/.well-known/apple-app-site-association
```

File contents — replace `<APPLE_TEAM_ID>`:

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

Where to find the Team ID: Apple Developer portal → Membership.

**Verify with:**

```bash
curl -v https://www.zivugmishamayim.com/.well-known/apple-app-site-association
# Expect: HTTP/1.1 200, Content-Type: application/json, no redirects
```

Also verify in Apple's CDN cache (which iOS actually uses): `https://app-site-association.cdn-apple.com/a/v1/www.zivugmishamayim.com`.

The iOS app rebuild picks this up automatically (`associatedDomains` in `app.json` is already set to `applinks:www.zivugmishamayim.com`).

---

## Part 3 — Android App Links (strongly recommended)

Host an **`assetlinks.json`** file at:

```
https://www.zivugmishamayim.com/.well-known/assetlinks.json
```

File contents — replace `<APP_SIGNING_SHA256>`:

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

**How to get the SHA256:** The signing key is managed by EAS for you. Run:

```bash
eas credentials
# → Android → production → Keystore → show fingerprint
```

Or from Play Console → your app → Release → Setup → App integrity → App signing key certificate (SHA-256).

If you use more than one signing cert (e.g. upload key + Play App Signing key) add every SHA256 to the array.

**Verify with Google's tester:**

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://www.zivugmishamayim.com&relation=delegate_permission/common.handle_all_urls
```

---

## Part 4 — Optional: render Open Graph metadata dynamically

Currently the landing page has static OG tags. For nicer previews in Messages / WhatsApp / email, you can render the OG tags server-side with the actual profile's name and first picture:

```html
<meta property="og:title" content="<%= profile.first_name %> – Zivug Mishamayim" />
<meta property="og:image" content="<%= profile.public_picture_url %>" />
```

Fetch the profile by id from Supabase on the server. Only expose fields that are safe to show publicly (first name only, no private photos, etc.).

---

## Testing checklist

- [ ] The URL `https://www.zivugmishamayim.com/profile/00000000-0000-0000-0000-000000000000` loads the landing page.
- [ ] On iOS with the app installed and AASA hosted, tapping that URL in Messages opens the app directly to the profile.
- [ ] On Android with the app installed and assetlinks.json hosted, tapping the URL opens the app directly.
- [ ] On iOS without the app, tapping the URL shows the landing page → tapping "Open in app" does nothing but falls through to App Store after 2s (or tapping "Download for iPhone" works).
- [ ] On Android without the app, tapping the URL shows the landing page → tapping "Open in app" redirects to Play Store via the Intent fallback.
- [ ] After signing in (when a logged-out user opens a share link), the app navigates to the shared profile automatically.

---

## Notes

- **Universal Links and custom schemes do not work in Expo Go.** You must use a dev client (`eas build --profile development`) or a production build to test.
- The client app already stashes the target profile id in AsyncStorage when a logged-out user taps a share link, and resumes navigation after sign-in. No further work needed on that side.
- All share UI flows through `hooks/useProfileShare.ts` now, so the share message format is identical across the Profile tab and any profile-details screen.
