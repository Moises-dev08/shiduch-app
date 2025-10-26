# Supabase Authentication Setup Guide

This guide will help you configure Supabase authentication for your Shiduchim app.

## Prerequisites

- A Supabase account and project
- Your Supabase project URL (already configured)
- Your Supabase anonymous (anon) key

## Setup Steps

### 1. Get Your Supabase Anon Key

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **API**
3. Copy the **anon/public** key

### 2. Configure Environment Variables

Create a `.env` file in the root directory of your project (if it doesn't exist):

```bash
# Create .env file
touch .env
```

Add the following content to your `.env` file:

```env
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Replace `your_supabase_anon_key_here` with the actual anon key you copied from Supabase.

### 3. Enable Email Authentication in Supabase

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** → **Providers**
3. Enable **Email** provider
4. Configure email templates (optional but recommended):
   - Go to **Authentication** → **Email Templates**
   - Customize the confirmation and password reset emails

### 4. Configure Email Confirmation (Optional)

By default, Supabase requires email confirmation for new signups. You can change this:

1. Go to **Authentication** → **Settings**
2. Look for **Email Confirmation**
3. Toggle as needed:
   - **Enabled**: Users must verify their email before logging in
   - **Disabled**: Users can login immediately after signup

### 5. Configure Password Reset (Required for Forgot Password)

1. Go to **Authentication** → **URL Configuration**
2. Add your app's redirect URL:
   - For development: `shiduchim://reset-password`
   - For production: Add your production app scheme
3. Go to **Authentication** → **Email Templates**
4. Customize the "Reset Password" email template (optional)
5. Make sure the redirect URL matches your app's deep linking configuration

### 6. Test the Integration

1. Start your development server:
   ```bash
   npm start
   ```

2. Test the signup flow:
   - Create a new account
   - If email confirmation is enabled, check your email
   - Try logging in

3. Test the login flow:
   - Login with your credentials
   - Verify you're redirected to the main app

4. Test the forgot password flow:
   - Click "Forgot Password?" on the login screen
   - Enter your email address
   - Check your email for the reset link
   - Click the link (opens the app)
   - Enter a new password
   - Verify you can login with the new password

5. Test the logout flow:
   - Go to Settings
   - Click Logout
   - Verify you're redirected to the login screen

## Authentication Features Implemented

### Login Screen (`app/auth/login.tsx`)
- Email/password authentication
- Loading states
- Error handling
- Auto-redirect on success
- Forgot password link

### Signup Screen (`app/auth/signup.tsx`)
- Email/password registration
- Password confirmation
- Terms and conditions acceptance
- Email verification flow (if enabled)
- Loading states
- Error handling

### Forgot Password Screen (`app/auth/forgot-password.tsx`)
- Password reset request via email
- Email validation
- Success confirmation
- Resend option
- Loading states

### Reset Password Screen (`app/auth/reset-password.tsx`)
- New password entry
- Password confirmation
- Password strength requirements
- Visual feedback for requirements
- Auto-login after reset

### Auth Context (`lib/AuthContext.tsx`)
- Session management
- User state tracking
- Auto-login on app start
- Sign out functionality

### App Entry Point (`app/index.tsx`)
- Automatic auth check
- Redirect to login if not authenticated
- Redirect to main app if authenticated

### Settings Screen
- Logout functionality integrated

## Troubleshooting

### "Your account does not have the necessary privileges"
This error occurs when trying to access the Supabase anon key via MCP without proper permissions. You'll need to manually copy the key from your Supabase dashboard.

### Email Confirmation Not Working
1. Check your email spam folder
2. Verify email provider is enabled in Supabase
3. Check Supabase logs for email delivery errors

### Password Reset Email Not Received
1. Check your email spam folder
2. Verify the email address is correct
3. Check Supabase logs for email delivery errors
4. Verify password reset is enabled in Authentication settings

### Password Reset Link Not Working
1. Verify the redirect URL is configured correctly in Supabase
2. Check that your app's deep linking is set up properly
3. Make sure the link hasn't expired (1 hour expiration by default)
4. Check console logs for errors

### Authentication Errors
1. Verify your anon key is correct in `.env`
2. Check that `.env` file is in the root directory
3. Restart your development server after changing `.env`
4. Check Supabase dashboard for authentication logs

### Session Not Persisting
The app uses AsyncStorage to persist sessions. If sessions aren't persisting:
1. Clear app data/cache
2. Verify AsyncStorage is installed correctly
3. Check console for errors

## Security Notes

1. **Never commit `.env` file**: Add `.env` to your `.gitignore`
2. **Use environment variables**: The anon key is safe to use in client-side code
3. **Row Level Security (RLS)**: Configure RLS policies in Supabase for data security
4. **Rate Limiting**: Supabase has built-in rate limiting for auth endpoints

## Next Steps

After setting up authentication, you may want to:

1. Create user profiles in Supabase
2. Set up Row Level Security (RLS) policies
3. Add password reset functionality
4. Add social login providers (Google, Apple, etc.)
5. Customize email templates
6. Add profile completion flow after signup

## Additional Resources

- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/)
- [React Native AsyncStorage](https://react-native-async-storage.github.io/async-storage/)

