# Testing Push Notifications Guide

## Prerequisites

1. **Physical Device Required**: Push notifications only work on physical devices (iOS/Android), not simulators/emulators
2. **EAS Project ID**: Already configured in `app.json` (`0d2eaa2a-00cd-4328-8139-54909431ed11`)
3. **Expo Go or Development Build**: Use Expo Go for quick testing, or a development build for production-like testing

## Step 1: Enable Push Notification Registration

First, make sure push notifications are registered when users log in. The code is currently commented out in `AuthContext.tsx`. You may want to uncomment it or add it to the app initialization.

## Step 2: Test Each Notification Scenario

### Test 1: Info Request Notification

**Setup:**
1. Create two user accounts (User A and User B)
2. Both users should have approved profiles
3. Both users should be logged in on physical devices

**Steps:**
1. As User A, view User B's profile
2. Click "Ask for Info" on any private field (e.g., phone, email)
3. Enter a message and submit

**Expected Result:**
- User B receives a push notification: "{User A Name} requested information about your {Field Name}"
- Notification appears even if User B's app is in background
- Tapping notification should open the app to the Connect tab

**Verify:**
- Check User B's device for the notification
- Check the `notifications` table in Supabase to see if notification was saved
- Check the `push_tokens` table to ensure User B has a registered token

---

### Test 2: Intro Request Notification

**Setup:**
1. User A (single) with a matchmaker selected
2. User B (single) - the person User A wants to request intro with
3. Matchmaker (User C) - selected as matchmaker

**Steps:**
1. As User A, view User B's profile
2. Click "Ask for Intro"
3. Select your matchmaker (User C)
4. Submit the intro request

**Expected Results:**
- **User B** receives: "{User A Name} requested an introduction with you"
- **User C (Matchmaker)** receives: "{User A Name} selected you as their matchmaker for an intro request"

**Verify:**
- Both User B and User C should receive notifications
- Check notifications table for both entries

---

### Test 3: Suggestion/Setup Notification

**Setup:**
1. User A (suggester) - can be single or matchmaker
2. User B and User C (the two profiles to suggest)

**Steps:**
1. As User A, go to Home tab
2. View User B's profile, then User C's profile
3. Create a suggestion between User B and User C
4. Add a note (optional) and submit

**Expected Results:**
- **User B** receives: "{User A Name} suggested a match with {User C Name}"
- **User C** receives: "{User A Name} suggested a match with {User B Name}"

**Verify:**
- Both users receive notifications
- Check notifications table

---

### Test 4: Matchmaker Selection Notification

**Test 4a: On Profile Creation**

**Setup:**
1. User A (single) - creating new profile
2. User B (matchmaker) - to be selected

**Steps:**
1. As User A, create a new profile
2. Enter matchmaker email (User B's signup email)
3. Complete and submit profile

**Expected Result:**
- **User B (Matchmaker)** receives: "{User A Name} selected you as their matchmaker"

**Test 4b: On Profile Update**

**Setup:**
1. User A (single) - has existing profile
2. User B (matchmaker) - to be newly selected
3. User A's current matchmaker is different or null

**Steps:**
1. As User A, edit profile
2. Change matchmaker email to User B's email
3. Save profile

**Expected Result:**
- **User B (Matchmaker)** receives: "{User A Name} selected you as their matchmaker"

**Verify:**
- Matchmaker receives notification
- Works for both new profiles and updates

---

## Step 3: Debugging & Verification

### Check Push Tokens

```sql
-- In Supabase SQL Editor
SELECT pt.user_id, pt.token, pt.device_name, pt.created_at, p.first_name, p.last_name
FROM push_tokens pt
JOIN profiles p ON p.user_id = pt.user_id
ORDER BY pt.created_at DESC;
```

### Check Notifications Sent

```sql
-- In Supabase SQL Editor
SELECT n.*, p.first_name, p.last_name
FROM notifications n
JOIN profiles p ON p.user_id = n.user_id
ORDER BY n.created_at DESC
LIMIT 50;
```

### Check Edge Function Logs

1. Go to Supabase Dashboard
2. Navigate to Edge Functions → `send-notification`
3. Check the logs tab for any errors

### Console Logs

Check your device console/logs for:
- "Push token saved successfully" - confirms token registration
- "Error sending notification" - indicates notification sending failed
- "No push tokens found for user" - user hasn't registered for notifications

---

## Step 4: Manual Testing Checklist

- [ ] User A and User B both have push tokens registered
- [ ] Both users granted notification permissions
- [ ] Test info request → User B receives notification
- [ ] Test intro request → User B and Matchmaker receive notifications
- [ ] Test suggestion → Both suggested users receive notifications
- [ ] Test matchmaker selection on profile creation → Matchmaker receives notification
- [ ] Test matchmaker selection on profile update → Matchmaker receives notification
- [ ] Verify notifications appear when app is in background
- [ ] Verify notifications appear when app is closed
- [ ] Verify tapping notification opens the app correctly

---

## Step 5: Testing with Expo Push Notification Tool

You can also test manually using Expo's push notification tool:

1. Get a user's push token from the `push_tokens` table
2. Go to: https://expo.dev/notifications
3. Enter the token and send a test notification

---

## Common Issues

1. **No notifications received:**
   - Check if user has push token registered
   - Check if notification permissions are granted
   - Check Edge Function logs for errors
   - Verify user_id is correct in notification call

2. **Notifications work in foreground but not background:**
   - This is normal - check notification settings
   - Ensure app has proper notification permissions

3. **"Must use physical device" error:**
   - Push notifications don't work on simulators
   - Use a real iOS/Android device

4. **Token not saving:**
   - Check Supabase RLS policies on `push_tokens` table
   - Verify user is authenticated when registering

---

## Quick Test Script

To quickly test all scenarios, you can:

1. Create test accounts for each scenario
2. Use two physical devices (or have a friend help)
3. Follow each test case above
4. Check Supabase logs and database to verify

---

## Next Steps

If notifications aren't working:
1. Check that `registerForPushNotifications()` is being called on login
2. Verify EAS project ID is correct
3. Check Supabase Edge Function is deployed and active
4. Review Edge Function logs for errors
5. Verify push_tokens table has entries for test users
