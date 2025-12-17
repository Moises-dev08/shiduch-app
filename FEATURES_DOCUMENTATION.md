 Zivug Mishamayim - Features Documentation

Table of Contents
1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Authentication & Onboarding](#authentication--onboarding)
4. [Profile Management](#profile-management)
5. [Discovery & Matching](#discovery--matching)
6. [Connection Features](#connection-features)
7. [Admin Panel](#admin-panel)
8. [Notifications System](#notifications-system)
9. [Settings & Account Management](#settings--account-management)
10. [Technical Features](#technical-features)

---

Overview

**Zivug Mishamayim** is a comprehensive matchmaking application designed for the Jewish community, facilitating connections between singles and matchmakers. The app provides a secure, user-friendly platform for profile discovery, intro requests, suggestions, and match facilitation.

Key Highlights
- **Dual User Types**: Supports both singles and matchmakers
- **Real-time Updates**: Live notifications and data synchronization
- **Admin Oversight**: Comprehensive administrative dashboard for profile approval and user management
- **Privacy Controls**: Granular privacy settings for profile information
- **Push Notifications**: Instant alerts for important events

---

User Roles

1. Singles
- Create detailed profiles with personal information, photos, and preferences
- Browse and discover other singles
- Request introductions and respond to intro requests
- Accept or decline suggestions from matchmakers
- Select matchmakers to facilitate connections
- View matches and manage connections

2. Matchmakers
- Create matchmaker profiles with contact information
- View singles who selected them as matchmakers
- Facilitate introductions between singles
- Make suggestions (setups) to pairs of singles
- Track match status and manage facilitated connections
- Access contact information for their clients

3. Admins
- Approve or reject new profile submissions
- Review and approve profile updates
- Manage user accounts (freeze, suspend, activate)
- View all users and filter by status
- Access detailed user information and activity logs

---

Authentication & Onboarding

Registration Process
1. **Sign Up**
   - Email and password registration
   - Email verification required
   - Terms and conditions acceptance

2. **Role Selection**
   - Choose between "Single" or "Matchmaker" role
   - Role selection determines available features

3. **Gender Selection** (for singles)
   - Male or Female selection
   - Affects profile form fields and matching options

4. **Profile Creation**
   - Comprehensive profile form based on role and gender
   - Profile must be approved by admin before app access

Login Features
- Email/password authentication
- Secure session management
- Automatic redirect based on user role:
  - Admins → Admin Dashboard
  - Regular users → Home/Profile screen
- Password reset functionality via email

Password Management
- **Forgot Password**: Email-based password reset
- **Reset Password**: Secure token-based password reset flow
- Deep linking support for password reset links

---

Profile Management

Profile Creation (Singles)

Personal Information
- **Basic Details**:
  - First Name, Last Name
  - Date of Birth (must be 18+ years old)
  - Gender
  - Marital Status (Single, Divorced, Divorced with kids, Widow/Widower, etc.)
  - Height (feet and inches)
  - Location (Country, State, City)

Contact Information
- **Phone Number** (Required, numeric only)
- **Personal Email** (Optional)
- **WhatsApp Number** (Optional)
- *Note: Contact information is only shared with matchmakers and matched profiles*

Religious & Cultural Background
- **Nationality**: Sefardi, Ashkenaz, Chassidic, Yemenite, Mixed Background, Other
- **Hashkafa** (Religious outlook): Yeshivish, Open-minded Yeshivish, Modern Yeshivish, Chareidi, Orthodox, Modern Orthodox, Other
- **Torah Learning**: Full day, Half day, Kovea Ittim, Attending Torah classes, Other
- **Praying**: Three times a day with minyan, Three times a day, Trying as much as possible, Other

Education & Career
- **Education Level**: High school, Seminary, Yeshiva, Bachelor's, Master's, etc.
- **Post-High School**: Seminary, College, Both, Non-traditional, etc.
- **Occupation**: Working, Part-working, Full-time Yeshiva, etc.
- **Future Plans**: Work full-time, Learn Torah, Homemaker, etc.

Lifestyle & Preferences
- **Dress Style**: Yeshivish, Modest modern, Modest fashionable, Casual, Black & white, Other
- **Head Covering** (for females): Wig/Sheitel, Mitpachat, Both, Other
- **Smoking**: Non-smoker, Smoking, Occasionally, Other
- **Alcohol**: Does not drink, Drinks very rarely, Occasionally, Moderately, Very often, Other
- **Languages**: English, Hebrew, Yiddish, Spanish, French, Russian, Arabic, Other

Additional Information
- **Bio/About Me**: Free text description
- **Has Children**: Yes/No
- **Resume/PDF**: Optional document upload
- **Pictures**: Multiple photo uploads with privacy controls

Privacy Settings
- **Picture Privacy**: 
  - None (visible to all)
  - Always (visible after match)
  - Private (visible only to matchmakers)
  - One-time (visible once per user)
- **Field Privacy**: Individual privacy settings for each profile field

Profile Creation (Matchmakers)

Basic Information
- **Name**: First Name, Last Name
- **Contact Information**:
  - Phone Number (Required)
  - Personal Email (Optional)
  - WhatsApp Number (Optional)
- **Bio/About**: Description of matchmaking services
- **Pictures**: Profile photos

Contact Information Sharing
- Contact details are shared with singles who select them as matchmakers
- Information visible to matched pairs they facilitate

Profile Status Management

Status Types
- **Pending**: Profile submitted, awaiting admin approval
- **Approved**: Profile approved, full app access granted
- **Rejected**: Profile rejected with reason provided

Profile Updates
- Any profile update sets status to "Pending"
- User cannot use app until updates are approved
- Admin sees what changed (e.g., "name was changed, 1 image was changed")
- Admin can approve or reject updates

Profile Blocking
- Users with pending/rejected profiles are blocked from app navigation
- Modal displayed explaining status
- Automatic redirect to profile screen
- Real-time status polling for approval

---

Discovery & Matching

Home Screen (Discover)

Profile Discovery
- **Browse Profiles**: Scroll through available singles
- **Search**: Text-based search across profiles
- **Filters**: Comprehensive filtering options:
  - Age range
  - Location (Country, State, City)
  - Nationality
  - Hashkafa
  - Marital status
  - Has children
  - Education level
  - Occupation
  - Height range

Profile Cards
- Display key information (name, age, location)
- Profile pictures (respecting privacy settings)
- Quick actions (View Profile, Ask for Info, Ask for Intro)

Profile Details View
- Full profile information
- Multiple photos with viewer
- Resume/PDF viewing
- Action buttons:
  - Ask for Info
  - Ask for Intro
  - Make Suggestion (matchmakers only)

---

Connection Features

Connect Screen

The Connect screen is organized into two main categories:

**For You** Category

1. Action Needed Tab
- **Received Info Requests**: Requests for additional information
- **Received Intro Requests**: Intro requests from other users
  - Pending requests requiring response
  - Accepted requests needing continuation choice
- **Sent Intro Requests**: Your sent requests needing continuation choice
- **Received Suggestions**: Suggestions from matchmakers requiring response
- **Notification Badge**: Shows count of items requiring action
- **Disappearing Notifications**: Notifications disappear after viewing

2. Matches Tab
- **Accepted Intro Requests**: Intro requests where both parties accepted
- **Completed Matches**: Successfully matched pairs
- **Received Suggestions**: Accepted suggestions
- **Notification Badge**: Shows count of new matches
- **Disappearing Notifications**: New match notifications disappear after viewing

3. You Liked Tab
- **Sent Intro Requests**: All intro requests you've sent (except completed)
- Shows response status of each request

4. Passed Tab
- **Rejected Requests**: Intro requests that were declined
- **Rejected Suggestions**: Suggestions that were declined

**For Others** Category

1. Awaiting Response Tab
- **Middle Person Requests**: Intro requests where you're the matchmaker
  - Pending requests
  - Accepted requests needing continuation choices
- **Made Suggestions**: Suggestions you've made awaiting response
- **Notification Badge**: Shows count of pending items
- **Disappearing Notifications**: Notifications disappear after viewing

2. Matched Tab
- **Completed Matches**: Successfully matched pairs you facilitated
- **Accepted Matches**: Both parties accepted with continuation choices
- **Notification Badge**: Shows count of new matches
- **Disappearing Notifications**: New match notifications disappear after viewing

3. Did Not Match Tab
- **Rejected Requests**: Intro requests that were declined
- **Rejected Suggestions**: Suggestions that were declined

4. My Singles Tab
- **Singles List**: All singles who selected you as their matchmaker
- **Contact Information**: 
  - Phone number
  - Email
  - WhatsApp
  - Quick actions (SMS, WhatsApp, Email, Copy)
- **Notification Badge**: Shows count of new singles
- **Disappearing Notifications**: Notifications disappear after viewing

Intro Request Flow

Requesting an Introduction
1. **Select Matchmaker** (Optional):
   - Choose a matchmaker to facilitate
   - Can select matchmaker for requester, requested, or both
   - Matchmaker receives notification

2. **Send Request**:
   - Request sent to the other party
   - Status: "Pending"

3. **Response**:
   - **Accepted**: Both parties can choose continuation method
   - **Rejected**: Request declined, moved to "Passed" tab

4. **Continuation Choice**:
   - Both parties select how to proceed:
     - Continue with matchmaker
     - Continue independently
   - Once both choose, match is complete

5. **Match Completion**:
   - Contact information shared (if both chose independently)
   - Match appears in "Matches" tab
   - Matchmaker can see contact info if facilitating

Suggestion Flow (Matchmakers)

Making a Suggestion
1. **Select Two Profiles**: Choose two singles to suggest
2. **Send Suggestion**: Both parties receive notification
3. **Response**:
   - Both parties can accept or decline
   - If both accept, suggestion becomes a match
   - Continuation choices available

Info Request Flow

Requesting Information
1. **Send Info Request**: Request additional information from a profile
2. **Response**: Profile owner can provide information
3. **Status Tracking**: Requests tracked in "Action Needed" tab

---

Admin Panel

Admin Dashboard

Profile Approval
- **New Profiles**: List of profiles awaiting initial approval
- **Updated Profiles**: List of profiles with pending updates
- **Change Summary**: Shows what changed in updated profiles
  - Text changes (e.g., "name was changed")
  - Image changes (e.g., "1 image was changed")
- **Actions**:
  - **Approve**: Approve profile/updates
  - **Reject**: Reject with reason
  - **View Details**: See full profile information

Filtering
- Filter by: All, New Profiles, Updated Profiles
- Search functionality

User Management

All Users Screen
- **User List**: Complete list of all registered users
- **Search**: Search by name, email, etc.
- **Quick Filters**:
  - All Users
  - Frozen Accounts
  - Suspended Accounts

User Actions
- **View Details**: See complete user profile and information
- **Freeze Account**: Temporarily disable user account
  - User cannot log in
  - Profile hidden from discovery
- **Suspend Account**: Permanently suspend with reason
  - Requires reason input
  - User cannot log in
  - Profile permanently disabled
- **Activate Account**: Reactivate frozen/suspended accounts

User Details Screen
- Complete profile information
- Account status
- Activity history
- Action buttons (Freeze, Suspend, Activate)

---

Notifications System

Push Notifications

Notification Scenarios
1. **Info Request**: When someone requests information from your profile
2. **Intro Request**: When someone requests an introduction
3. **Suggestion**: When a matchmaker makes a suggestion
4. **Matchmaker Selection**: When a single selects you as their matchmaker
5. **Match Updates**: When intro requests or suggestions are accepted/rejected

Notification Features
- **Real-time Delivery**: Instant notifications via Expo Push Notifications
- **Permission Management**: User consent required
- **Badge Counts**: Notification counts on tab icons
- **In-app Notifications**: Notification badges throughout the app

Notification Badges

Tab Badges
- **Connect Tab**: Total notifications across all sections
- **Category Tabs**: 
  - "For You" tab: Shows action items + new matches
  - "For Others" tab: Shows pending items + new matches + new singles

Section Badges
- **Action Needed**: Count of items requiring action
- **Matches**: Count of new matches
- **My Singles**: Count of new singles who selected you
- **Awaiting Response**: Count of pending matchmaker requests


Settings & Account Management

Settings Screen

Account Actions
- **Freeze Profile**: Temporarily hide profile from discovery
  - Profile remains in system
  - Can be unfrozen anytime
  - No data loss
- **Unfreeze Profile**: Reactivate frozen profile
- **Delete Account**: Permanently delete account and all data
  - Requires confirmation
  - Irreversible action

Information
- **How It Works**: Carousel explaining app features
- **Terms & Conditions**: View terms of service
- **Report Problem**: Contact support

Social Features
- **Invite a Friend**: Share the app with friends and family
  - Native share functionality
  - Pre-formatted invite message
  - App download link included
  - Available to all users

Account Management
- **Logout**: Sign out of account
- **Profile Status**: View current profile status
- **Account Status**: View account status (active, frozen, suspended)

Profile Sharing
- **PDF Export**: Export profile as PDF

---

Data Management

Profile Service
- Comprehensive profile CRUD operations
- Image upload and management
- Privacy settings management
- Profile status tracking

Intro Service
- Intro request creation and management
- Matchmaker assignment
- Continuation choice handling
- Status tracking

Suggestion Service
- Suggestion creation (matchmakers)
- Response handling
- Match completion

Info Request Service
- Info request creation
- Response management

Security Features

Authentication
- Secure email/password authentication
- Session management
- Token-based password reset
- Admin role verification

Data Privacy
- Row Level Security (RLS) in Supabase
- Field-level privacy controls
- Picture privacy settings
- Contact information protection

Admin Security
- Admin-only routes
- Admin user verification
- Secure admin actions

Image Management

Profile Pictures
- Multiple image uploads
- Image storage in Supabase Storage
- Privacy controls per image
- Picture viewer modal
- Image optimization

Resume/PDF
- PDF document upload
- Document viewing
- Privacy controls

Deep Linking

Supported Links
- Password reset: `shiduchimapp://reset-password`
- Tab navigation: `/(tabs)/connect?section=liked`
- Profile details: `/profile-details?id={profileId}`

Form Validation

Client-side Validation
- Age verification (18+ years)
- Email format validation
- Phone number (numeric only)
- Required field validation
- Date of birth validation


Additional Features

Donations Screen
- Support the platform
- Donation options
- Payment integration (if implemented)

How It Works
- Interactive carousel
- Step-by-step guide
- Feature explanations
- User onboarding

Terms & Conditions
- Legal information
- User agreement
- Privacy policy
- Terms acceptance required

---

Out of Scope Features

The following features are currently not implemented but may be considered for future development:

External Profile Sharing
- Web-based Profile Sharing: Similar to Loop app's external sharing functionality
  - Share profile through external website links
  - Public profile pages accessible via web browser
  - Shareable links that work outside the mobile app
  - Profile viewing without app installation

Communication Preferences
- Communication Method Selection: Allow users to choose preferred communication channel
  - SMS Option: Receive app notifications and communications via SMS
  - WhatsApp Option: Receive app notifications and communications via WhatsApp
  - User preference settings for communication method
  - Integration with SMS and WhatsApp APIs
  - Fallback mechanisms if preferred method unavailable

Support Team Management
- Multi-Admin Support System: Allow main admin to add additional support team members
  - Support Team Roles: Create support team member accounts with limited permissions
  - View Reports: Support team members can view user reports and issues
  - User Assistance: Support team members can assist with user issues
  - Permission Management: Main admin controls what support team members can access
  - Role-Based Access: Different permission levels for support team members vs. main admin

---

---




