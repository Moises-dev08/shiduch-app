# Real-Time Updates - Quick Start Guide

## 🚀 Quick Setup (5 minutes)

### Step 1: Enable Realtime in Supabase
Run this SQL in your Supabase SQL Editor:

```sql
-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Enable realtime for intro_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE intro_requests;
```

**OR** via Dashboard:
1. Go to **Database** → **Replication**
2. Find `profiles` and click **Enable Replication**
3. Find `intro_requests` and click **Enable Replication**

### Step 2: Test It!

✅ **It's already working!** The app now has real-time updates on:

- **Home Screen** - Profile list updates automatically
- **Connect Tab** - Intro requests update instantly  
- **Tab Badges** - Notification counts update in real-time

### Step 3: Verify

1. Open the app on two devices/browsers
2. On Device A: Create or update a profile
3. On Device B: Watch the home screen update automatically! ✨

## 🎯 What You Get

### Automatic Updates - No Manual Refresh Needed!

| Screen | Updates When | Result |
|--------|-------------|--------|
| **Home** | Profile added/edited/deleted | List refreshes automatically |
| **Connect** | Intro request received/updated | Cards update instantly |
| **Tab Badge** | New action needed | Badge count updates |

### User Experience

**Before (Manual):**
```
User creates intro request → Other user must manually pull to refresh → Sees update
⏱️ Delay: Could be minutes/hours
```

**Now (Real-Time):**
```
User creates intro request → Other user sees update instantly → No action needed
⚡ Delay: < 1 second
```

## 📱 How To Use In Your Components

### Example 1: Add Real-Time to Any Screen

```typescript
import { useRealtimeProfiles } from '../hooks/useRealtimeProfiles';

function MyScreen() {
  const [profiles, setProfiles] = useState([]);

  const loadProfiles = useCallback(async () => {
    // Your existing fetch logic
    const data = await fetchProfiles();
    setProfiles(data);
  }, []);

  // ✨ Add this one line for real-time updates
  useRealtimeProfiles(loadProfiles);

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Rest of your component...
}
```

### Example 2: Real-Time Intro Requests

```typescript
import { useRealtimeIntroRequests } from '../hooks/useRealtimeIntroRequests';

function MyRequestsScreen() {
  const [requests, setRequests] = useState([]);
  const [profileId, setProfileId] = useState<string>();

  const loadRequests = useCallback(async () => {
    const data = await fetchMyRequests();
    setRequests(data);
  }, []);

  // ✨ Real-time updates filtered by user
  useRealtimeIntroRequests(loadRequests, profileId);

  // Component code...
}
```

## 🔍 Testing Real-Time

### Test Scenario 1: Profile Updates
1. Open app on Device A (logged in as User 1)
2. Open app on Device B (logged in as User 2)
3. On Device A: Edit User 1's profile
4. Watch Device B's home screen update automatically!

### Test Scenario 2: Intro Requests
1. Open app on two devices (different users)
2. User 1: Send intro request to User 2
3. Watch User 2's Connect tab badge update instantly!
4. User 2: Accept the request
5. Watch User 1's screen update in real-time!

### Test Scenario 3: Badge Counts
1. Open app with pending intro requests
2. Accept/reject requests
3. Watch tab badge count decrease automatically

## 🐛 Troubleshooting

### Updates Not Working?

**Check 1:** Realtime enabled?
```sql
-- Run this to check
SELECT tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```
Should show `profiles` and `intro_requests`

**Check 2:** Check browser console
Look for:
- ✅ `Setting up real-time [table] subscription`
- ❌ Connection errors or warnings

**Check 3:** RLS Policies
Ensure users have SELECT permission on the tables

### Still Having Issues?

1. Check Supabase dashboard → **Database** → **Replication**
2. Verify green checkmarks for both tables
3. Check browser Network tab for WebSocket connections
4. Look for `wss://` connections to Supabase

## 📊 Performance Tips

### Good Practice ✅
```typescript
// Use filtered subscriptions
useRealtimeIntroRequests(loadData, currentUserId); // Only user's data
```

### Avoid ⚠️
```typescript
// Don't subscribe to everything if you only need specific data
useRealtimeIntroRequests(loadAllData); // Loads all requests globally
```

## 🎓 When To Use

### Use Real-Time For:
- ✅ User notifications and updates
- ✅ Collaborative features
- ✅ Live status changes
- ✅ Chat/messaging
- ✅ Counter/badge updates

### Don't Use Real-Time For:
- ❌ Static content (FAQ, About pages)
- ❌ Rarely changing data
- ❌ Historical data

## 🚀 Production Checklist

Before deploying:
- [ ] Realtime enabled for `profiles` table
- [ ] Realtime enabled for `intro_requests` table
- [ ] RLS policies allow SELECT for authorized users
- [ ] Tested with multiple users
- [ ] Verified on both iOS and Android (if applicable)
- [ ] Checked WebSocket connections are allowed in production network
- [ ] Confirmed Supabase plan includes Realtime

## 📞 Support

If you need help:
1. Check `REALTIME_SETUP.md` for detailed documentation
2. Review console logs for subscription status
3. Check Supabase documentation: https://supabase.com/docs/guides/realtime

---

**That's it!** Your app now has real-time updates everywhere. No more manual refreshing! 🎉

