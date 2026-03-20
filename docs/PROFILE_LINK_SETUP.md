# Profile share links — what you need on your side

The app shares this URL:

**https://www.zivugmishamayim.com/profile/PROFILE-ID**

You make that URL:

1. Show a **download page** if the app is not installed (or user is in the browser).
2. Optionally **open the app directly** when the app is installed (Universal Links / App Links).

---

## Part 1 — Website (required)

Deploy the file **web/share-profile-landing.html** on **www.zivugmishamayim.com**.

**Netlify:** add a `_redirects` file:

```
/profile/*  /share-profile-landing.html  200
```

Use status **200** so the address bar still shows `/profile/UUID`.

**Other hosts:** rewrite `/profile/*` to that HTML file with HTTP 200.

Edit **share-profile-landing.html** and set **APP_STORE_URL** and **PLAY_STORE_URL** to your real App Store and Play Store links when you have them.

The page includes an **Open in app** button (uses `shiduchimapp://profile/ID`) and download buttons.

---

## Part 2 — Open app from Messages without Safari (optional)

Without this, tapping the link in iMessage often opens **Safari** first; your landing page still works.

**iOS Universal Links**

1. Get your Apple **Team ID**.
2. Host **apple-app-site-association** at:

   `https://www.zivugmishamayim.com/.well-known/apple-app-site-association`

   No file extension. Content-Type: application/json.

3. Example body (replace YOUR_TEAM_ID):

```json
{
  "applinks": {
    "apps": [],
    "details": [
      {
        "appID": "YOUR_TEAM_ID.com.zivugmishamayim",
        "paths": ["/profile/*"]
      }
    ]
  }
}
```

4. Rebuild the iOS app after **associatedDomains** is added in app.json.

**Android App Links**

Host **assetlinks.json** at:

`https://www.zivugmishamayim.com/.well-known/assetlinks.json`

Use Google's generator for package **com.zivugmishamayim** and your signing key. Rebuild Android after configuring intent filters (see Expo App Links docs).

---

## Quick checklist

- [ ] Upload share-profile-landing.html
- [ ] Redirect /profile/* to that file (200)
- [ ] Set real App Store and Play Store URLs in the HTML
- [ ] (Optional) apple-app-site-association + app rebuild for iOS
- [ ] (Optional) assetlinks.json + app rebuild for Android

The mobile app code already builds the correct https link and handles opens when the app receives the URL.
