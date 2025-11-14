# Real-Time Updates Setup Guide

This app now has **real-time updates** throughout using Supabase Realtime. Changes to profiles and intro requests will automatically update across all users' screens without requiring manual refresh.

## 🎯 What's Enabled

### Automatic Real-Time Updates
1. **Home Screen** - Profile list updates when:
   - New profiles are added
   - Profiles are edited/updated
   - Profiles are deleted or frozen

2. **Connect Tab** - Intro requests update when:
   - New intro requests are received
   - Requests are accepted/rejected
   - Continuation choices are made
   - Request status changes

3. **Tab Badges** - Notification counts update instantly when:
   - New intro requests arrive
   - Actions are needed on existing requests

## ⚙️ Supabase Configuration Required

### Enable Realtime for Tables

You need to enable Realtime replication for these tables in your Supabase dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Database** → **Replication**
3. Enable replication for these tables:
   - `profiles`
   - `intro_requests`

**Via SQL (Alternative):**
```sql
-- Enable realtime for profiles table
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- Enable realtime for intro_requests table
ALTER PUBLICATION supabase_realtime ADD TABLE intro_requests;
```

### Verify Setup

1. Open the Supabase dashboard
2. Go to **Database** → **Replication**
3. Confirm both tables show `✓` under "Realtime enabled"

## 🔧 How It Works

### Architecture

```
┌─────────────────────────────────────────────────────┐
│                realtimeService.ts                    │
│  (Centralized Realtime Subscription Manager)        │
│                                                      │
│  - subscribeToProfiles()                            │
│  - subscribeToIntroRequests()                       │
│  - subscribeToMyIntroRequests(profileId)            │
│  - subscribeToTable(tableName)                      │
└──────────────────┬──────────────────────────────────┘
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌──────────────┐      ┌──────────────────┐
│ useRealtime  │      │ useRealtime      │
│ Profiles     │      │ IntroRequests    │
│ (Hook)       │      │ (Hook)           │
└──────┬───────┘      └──────┬───────────┘
       │                     │
       ▼                     ▼
┌──────────────┐      ┌──────────────────┐
│ Home Screen  │      │ Connect Screen   │
│ useHome      │      │ Tab Layout       │
│ Profiles     │      │ (Badge Counter)  │
└──────────────┘      └──────────────────┘
```

### Files Created

1. **`lib/realtimeService.ts`**
   - Central service managing all Realtime subscriptions
   - Handles channel creation, subscription, and cleanup
   - Provides methods for different table subscriptions

2. **`hooks/useRealtimeProfiles.ts`**
   - React hook for profile updates
   - Auto-triggers callback when profiles change

3. **`hooks/useRealtimeIntroRequests.ts`**
   - React hook for intro request updates
   - Supports filtering by user profile ID
   - Auto-triggers callback when requests change

### Usage Examples

#### Subscribe to All Profile Changes
```typescript
import { useRealtimeProfiles } from '../hooks/useRealtimeProfiles';

function MyComponent() {
  const loadProfiles = useCallback(async () => {
    // Fetch profiles from database
  }, []);

  // Automatically reloads profiles when database changes
  useRealtimeProfiles(loadProfiles);
}
```

#### Subscribe to User's Intro Requests
```typescript
import { useRealtimeIntroRequests } from '../hooks/useRealtimeIntroRequests';

function ConnectScreen() {
  const [profileId, setProfileId] = useState<string>();
  
  const loadRequests = useCallback(async () => {
    // Fetch intro requests
  }, []);

  // Automatically reloads when user's intro requests change
  useRealtimeIntroRequests(loadRequests, profileId);
}
```

#### Direct Service Usage (Advanced)
```typescript
import { realtimeService } from '../lib/realtimeService';

// Subscribe to any table
const unsubscribe = realtimeService.subscribeToTable(
  'my_table',
  (payload) => {
    console.log('Change detected:', payload);
    // Handle update
  },
  'user_id=eq.123' // Optional filter
);

// Clean up when done
unsubscribe();
```

## 🎨 Current Implementations

### Home Screen (`app/(tabs)/index.tsx`)
- Uses `useHomeProfiles()` hook
- Which internally uses `useRealtimeProfiles()`
- Automatically updates profile list when database changes

### Connect Screen (`app/(tabs)/connect.tsx`)
- Uses `useRealtimeIntroRequests()` directly
- Filters by current user's profile ID
- Updates intro request lists in real-time

### Tab Layout (`app/(tabs)/_layout.tsx`)
- Uses `useRealtimeIntroRequests()` for badge counting
- Updates Connect tab badge when new actions are needed
- No manual polling required

## 📊 Events Monitored

The realtime service listens to these PostgreSQL events:

- **INSERT** - New records added
- **UPDATE** - Existing records modified
- **DELETE** - Records removed

All events trigger the registered callback functions, allowing components to refresh their data.

## 🔍 Debugging

### Check Active Subscriptions
```typescript
import { realtimeService } from '../lib/realtimeService';

// Get count of active subscriptions
const count = realtimeService.getActiveSubscriptionsCount();
console.log('Active subscriptions:', count);

// Check if specific channel is active
const isActive = realtimeService.isChannelActive('profiles-changes');
console.log('Profiles channel active:', isActive);
```

### View Console Logs
The service logs all subscription activities:
- `Setting up real-time [table] subscription` - When subscribing
- `[Table] change detected` - When changes occur
- `Cleaning up real-time [table] subscription` - When unsubscribing

### Troubleshooting

**Problem: Updates not appearing**
- Check Supabase Realtime is enabled for the table
- Verify RLS policies allow the user to see the changes
- Check browser console for connection errors

**Problem: Multiple subscriptions**
- The service automatically prevents duplicate subscriptions
- Each channel is uniquely named and replaced if recreated

**Problem: Memory leaks**
- All hooks automatically clean up on component unmount
- Use the returned unsubscribe function for manual cleanup

## 🚀 Performance

- **Efficient**: Only subscribes when needed
- **Automatic cleanup**: Unsubscribes when components unmount
- **Filtered subscriptions**: Can filter by user/criteria to reduce traffic
- **No polling**: Replaces polling intervals with event-driven updates

## 🔒 Security

- Subscriptions respect Row Level Security (RLS) policies
- Users only receive updates for data they have permission to see
- Filters ensure users only get relevant updates

## 🎓 Best Practices

1. **Always clean up subscriptions** - The hooks do this automatically
2. **Use filtered subscriptions** - Reduce unnecessary updates
3. **Batch updates** - Combine multiple state updates when possible
4. **Debounce if needed** - If updates are too frequent, add debouncing
5. **Test thoroughly** - Verify updates work across multiple devices

## 📝 Future Enhancements

Potential additions to the real-time system:

- Presence system (online/offline status)
- Typing indicators for messaging
- Live notification delivery
- Real-time chat/messaging
- Optimistic updates for faster UI

---

**Note**: Real-time subscriptions use WebSocket connections. Ensure your network allows WebSocket connections and that Supabase Realtime is included in your pricing plan.

