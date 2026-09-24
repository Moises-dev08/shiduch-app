/**
 * Server-rendered profile share page with Open Graph tags for WhatsApp / iMessage.
 * Query: ?id=<profile-uuid>
 */
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ebxvbyoqjhbnqkrddcxh.supabase.co';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const APP_WEB_BASE = 'https://app.zivugmishamayim.com';
const SITE_ORIGIN = 'https://app.zivugmishamayim.com';
const DEFAULT_IMAGE = `${SITE_ORIGIN}/logo-stores.png`;

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function publicImageUrl(path) {
  if (!path) return null;
  if (String(path).startsWith('http')) return path;
  return `${SUPABASE_URL}/storage/v1/object/public/profile-pictures/${path}`;
}

async function fetchProfile(id) {
  if (!SUPABASE_ANON_KEY) return null;
  const url = `${SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&status=eq.approved&select=id,first_name,last_name,bio,pictures,picture_privacy,location_city,location_state`;
  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  if (!res.ok) return null;
  const rows = await res.json();
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
}

exports.handler = async (event) => {
  const id =
    event.queryStringParameters?.id ||
    (event.path || '').match(/\/profile\/([^/]+)/)?.[1] ||
    '';

  let title = 'Zivug Mishamayim — View a profile';
  let description =
    'Someone shared a profile with you. Open it in Zivug Mishamayim.';
  let image = DEFAULT_IMAGE;
  let name = '';

  if (id) {
    const profile = await fetchProfile(id);
    if (profile) {
      name = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
      title = name ? `${name} — Zivug Mishamayim` : title;
      const location = [profile.location_city, profile.location_state]
        .filter(Boolean)
        .join(', ');
      description =
        (profile.bio && String(profile.bio).trim().slice(0, 160)) ||
        (location ? `View ${name || 'this profile'} from ${location} on Zivug Mishamayim.` : description);
      // Only a public photo may appear in WhatsApp / iMessage previews.
      // Private, one-time, and hidden photos stay off the link card.
      const photoIsPublic = profile.picture_privacy === 'always';
      if (photoIsPublic && Array.isArray(profile.pictures) && profile.pictures[0]) {
        image = publicImageUrl(profile.pictures[0]) || DEFAULT_IMAGE;
      }
    }
  }

  const publicUrl = id ? `${APP_WEB_BASE}/public-profile/${id}` : APP_WEB_BASE;
  // Must match PROFILE_SHARE_PREVIEW_VERSION in lib/profileShareUrls.ts
  const shareUrl = id ? `${SITE_ORIGIN}/profile/${id}?v=2` : SITE_ORIGIN;
  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safeImage = escapeHtml(image);
  const safeName = escapeHtml(name || 'Profile');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${safeTitle}</title>
  <meta property="og:title" content="${safeTitle}" />
  <meta property="og:description" content="${safeDescription}" />
  <meta property="og:type" content="profile" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta property="og:image" content="${safeImage}" />
  <meta property="og:image:width" content="600" />
  <meta property="og:image:height" content="600" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${safeTitle}" />
  <meta name="twitter:description" content="${safeDescription}" />
  <meta name="twitter:image" content="${safeImage}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(publicUrl)}" />
  <link rel="canonical" href="${escapeHtml(publicUrl)}" />
  <style>
    body{font-family:system-ui,-apple-system,sans-serif;margin:0;padding:40px 20px;text-align:center;background:#f5f9fc;color:#222}
    a{color:#1293DA;font-weight:600}
  </style>
</head>
<body>
  <p>Opening ${safeName}'s profile…</p>
  <p><a href="${escapeHtml(publicUrl)}">Continue</a></p>
  <script>window.location.replace(${JSON.stringify(publicUrl)});</script>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    },
    body: html,
  };
};
