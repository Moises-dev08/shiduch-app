# Development Build Setup for Push Notifications

## Problem
Push notifications don't work in Expo Go (SDK 53+). You need to use a development build instead.

## Solution: Create a Development Build

### Option 1: Local Development Build (Recommended for Testing)

#### For iOS:
```bash
npx expo run:ios
```
This will:
- Build the app locally
- Install it on your connected iOS device or simulator
- Allow push notifications to work

#### For Android:
```bash
npx expo run:android
```
This will:
- Build the app locally
- Install it on your connected Android device or emulator
- Allow push notifications to work

**Requirements:**
- iOS: Xcode installed (Mac only)
- Android: Android Studio with Android SDK installed

---

### Option 2: EAS Development Build (Cloud Build)

If you don't have Xcode/Android Studio, use EAS to build in the cloud:

#### 1. Install EAS CLI (if not already installed):
```bash
npm install -g eas-cli
```

#### 2. Login to EAS:
```bash
eas login
```

#### 3. Configure EAS (if not already done):
```bash
eas build:configure
```

#### 4. Create Development Build:

**For iOS:**
```bash
eas build --profile development --platform ios
```

**For Android:**
```bash
eas build --profile development --platform android
```

#### 5. Install on Device:
- EAS will provide a download link or QR code
- Scan the QR code with your device to install
- Or download the `.ipa` (iOS) or `.apk` (Android) file directly

---

## Testing Push Notifications

Once you have a development build installed:

1. **Open the app** on your physical device
2. **Log in** - push token will be registered automatically
3. **Verify token** in Supabase:
   ```sql
   SELECT * FROM push_tokens ORDER BY created_at DESC;
   ```
4. **Test notifications** using the scenarios in `TESTING_PUSH_NOTIFICATIONS.md`

---

## Quick Commands Reference

```bash
# Local iOS build
npx expo run:ios

# Local Android build
npx expo run:android

# EAS iOS development build
eas build --profile development --platform ios

# EAS Android development build
eas build --profile development --platform android

# Check build status
eas build:list
```

---

## Notes

- Development builds include all native code and work like production apps
- Push notifications will work in development builds
- You can still use hot reload and fast refresh
- First build takes longer, subsequent builds are faster

---

## Troubleshooting

**"No devices found" (iOS):**
- Make sure your iPhone is connected via USB
- Trust the computer on your iPhone
- Check Xcode → Window → Devices and Simulators

**"No devices found" (Android):**
- Enable USB debugging on your Android device
- Run `adb devices` to verify connection
- Install Android SDK platform tools

**Build fails:**
- Check that all dependencies are installed: `npm install`
- Verify EAS project ID in `app.json`
- Check EAS build logs for specific errors
