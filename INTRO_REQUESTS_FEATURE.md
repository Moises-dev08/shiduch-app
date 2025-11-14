# Ask for Intro Feature - Implementation Summary

## Overview
This feature implements a comprehensive "Ask for Intro" flow that allows single users to request introductions to other profiles through a middle person (facilitator). The feature includes complex logic for continuation choices and contact information sharing based on both parties' preferences.

## Feature Flow

### 1. Initiating an Intro Request
**Who:** Single profiles only (matchmakers cannot use this feature)

**Steps:**
1. User views a profile in the Home screen
2. Taps "Ask for Intro" button (visible only for singles)
3. Selects a middle person from a filterable list of all profiles
4. Chooses their continuation preference:
   - **By Themselves**: Share their direct contact info
   - **With Middle Person**: Continue through the selected middle person

### 2. Receiving an Intro Request
**Who:** The requested profile (can be single or matchmaker)

**Steps:**
1. Receives notification about the intro request
2. Views request in Connect tab → Action Needed section
3. Sees who is requesting (via which middle person)
4. Can respond:
   - **Decline**: Optional note to middle person
   - **Accept**: Must select their own middle person and continuation choice

### 3. Requester's Follow-up
**Who:** Original requester

**Steps:**
1. Receives notification when request is accepted
2. Must choose continuation preference (if not already set):
   - **By Themselves**: Share direct contact info
   - **With Middle Person**: Continue through their selected middle person

### 4. Contact Sharing Logic
Once both parties have made their continuation choices, contact information is automatically shared based on the following rules:

#### Both Choose "By Themselves"
- Direct contact info is shared between both parties
- Phone, WhatsApp, and email addresses are visible to both

#### One Chooses "By Themselves", Other Chooses "With Middle Person"
- The person who chose "by themselves" gets the other person's middle person's contact info
- The other person's middle person gets the direct contact info of the person who chose "by themselves"

#### Both Choose "With Middle Person"
- Requester's middle person contact info is shared with:
  - Requester
  - Requested person's middle person
- Requested person's middle person contact info is shared with:
  - Requested person
  - Requester's middle person

### 5. Important Rules
- A single profile initiating an intro request is **excluded** from being selected as a middle person by the other side
- Only one active intro request can exist between two profiles at a time
- Singles see both "Setup" and "Ask for Intro" buttons
- Matchmakers only see the "Setup" button

## Database Schema

### Tables Created

#### `intro_requests`
Main table tracking all intro requests.

**Columns:**
- `id` (UUID, PK): Unique identifier
- `requester_id` (UUID, FK → profiles): Who initiated the request
- `requested_profile_id` (UUID, FK → profiles): Who is being requested
- `requester_middle_person_id` (UUID, FK → profiles): Requester's chosen middle person
- `requested_middle_person_id` (UUID, FK → profiles, nullable): Requested person's chosen middle person
- `requester_continuation_choice` (TEXT, nullable): 'by_themselves' or 'with_middle_person'
- `requested_continuation_choice` (TEXT, nullable): 'by_themselves' or 'with_middle_person'
- `status` (TEXT): 'pending', 'accepted', 'rejected', or 'completed'
- `requested_note` (TEXT, nullable): Optional note when declining
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

**Constraints:**
- Unique constraint on (requester_id, requested_profile_id)
- Check constraints on choice fields and status

#### RLS Policies
- Users can view requests where they are requester, requested, or middle person
- Users can create requests as requester
- Users can update requests where they have involvement

## Frontend Implementation

### New Components

#### 1. `MiddlePersonSelectionModal` (`components/intro/MiddlePersonSelectionModal.tsx`)
**Purpose:** Modal for selecting a middle person from all available profiles

**Features:**
- Displays all profiles (singles and matchmakers)
- Search by name
- Filter by:
  - Age range
  - Gender
  - Role (single/matchmaker)
  - Hashkafa
- Excludes specified profiles (e.g., requester)
- Shows profile picture, name, age, and role

#### 2. `ContinuationChoiceModal` (`components/intro/ContinuationChoiceModal.tsx`)
**Purpose:** Modal for choosing continuation preference

**Options:**
- By Themselves: Continue with direct contact
- With Middle Person: Continue through facilitator

#### 3. `IntroRequestCard` (`components/intro/IntroRequestCard.tsx`)
**Purpose:** Displays intro request with all relevant actions and states

**Features:**
- Shows request status (pending, accepted, rejected, completed)
- Displays both profiles and middle person
- Action buttons based on status:
  - **Pending (Received)**: Accept or Decline with optional note
  - **Accepted (Requester)**: Choose continuation preference
  - **Completed**: Display contact information with quick actions
- Contact actions: SMS, WhatsApp, Email, Copy phone
- Handles all state transitions

### Updated Screens

#### 1. `profile-details.tsx`
**Changes:**
- Added "Ask for Intro" button (singles only)
- Added "Setup" button (matchmakers only)
- Integrated modals for middle person selection and continuation choice
- Handles complete intro request creation flow
- Navigates to Connect tab after successful request

#### 2. `connect.tsx` (Connect Tab)
**Changes:**
- Integrated with `introService` to fetch real intro requests
- **Action Needed section** displays:
  - Received requests needing response (status: pending)
  - Accepted requests where requester needs to choose continuation
- **Matches section** displays:
  - Completed requests with shared contact information
- Refreshes data on pull-to-refresh

### New Service

#### `introService` (`lib/introService.ts`)
**Purpose:** Handles all backend operations for intro requests

**Methods:**
- `createIntroRequest(requestedProfileId, requesterMiddlePersonId)`: Create new request
- `respondToIntroRequest(requestId, response, note?)`: Accept or reject request
- `setRequestedMiddlePerson(requestId, middlePersonId)`: Set requested person's middle person
- `setContinuationChoice(requestId, choice, isRequester)`: Set continuation preference
- `getMyIntroRequests()`: Fetch all sent and received requests
- `getContactInfo(request, isRequester)`: Calculate contact info to display based on choices

## Migration Applied

**Migration:** `012_create_intro_requests.sql`
**Version:** `20251114140413`
**Status:** ✅ Applied successfully

The migration created:
- `intro_requests` table with all columns and constraints
- Row Level Security policies for all operations
- Proper foreign key relationships to profiles table

## User Experience Flow Example

### Scenario: Yoni Asks to Meet Sara

1. **Yoni** views Sara's profile and taps "Ask for Intro"
2. **Yoni** selects Joel as middle person
3. **Yoni** chooses "With Middle Person" for continuation
4. **Sara** receives notification and sees request in Connect tab
5. **Sara** accepts and selects Rachel as her middle person
6. **Sara** chooses "By Themselves" for continuation
7. **Yoni** receives notification that Sara accepted
8. Both can now see contact info in Matches section:
   - **Yoni** sees Rachel's contact info (Sara's middle person)
   - **Sara** sees Joel's contact info (Yoni's middle person)
   - **Rachel** sees Joel's contact info
   - **Joel** sees Rachel's contact info

## Testing Checklist

### Basic Flow
- [ ] Single user can tap "Ask for Intro" on a profile
- [ ] Middle person selection modal opens and shows all profiles
- [ ] Search and filters work correctly
- [ ] Continuation choice modal appears after selecting middle person
- [ ] Intro request is created successfully
- [ ] Notification is sent to requested person

### Response Flow
- [ ] Requested person sees request in Action Needed
- [ ] Can decline with optional note
- [ ] Can accept and select their own middle person
- [ ] Requester sees accepted request in Action Needed
- [ ] Requester can choose continuation preference

### Contact Sharing
- [ ] Both "by themselves": Direct contact info shared
- [ ] One "by themselves", one "with middle person": Correct contacts shared
- [ ] Both "with middle person": Middle persons' contacts shared correctly
- [ ] Contact actions work: SMS, WhatsApp, Email, Copy

### Permissions & Rules
- [ ] Matchmakers only see "Setup" button
- [ ] Singles only see "Ask for Intro" button
- [ ] Requester cannot be selected as middle person by requested party
- [ ] Only one active request between two profiles
- [ ] RLS policies prevent unauthorized access

### UI/UX
- [ ] Loading states display correctly
- [ ] Error messages are user-friendly
- [ ] Pull-to-refresh updates data
- [ ] Status badges show correct states
- [ ] Empty states are informative

## Next Steps

1. **Notifications:** Integrate with notification service for:
   - New intro request received
   - Intro request accepted
   - Continuation choices completed
   - Contact info available

2. **Analytics:** Track:
   - Number of intro requests sent/received
   - Acceptance rate
   - Preferred continuation choices
   - Time to completion

3. **Testing:** Comprehensive testing with real users to validate the flow

4. **Improvements:**
   - Add ability to cancel pending requests
   - Add ability to block specific profiles from requesting
   - Add reporting functionality for inappropriate behavior
   - Add chat functionality instead of just contact sharing

## Files Modified/Created

### New Files
- `lib/introService.ts` - Intro request service
- `components/intro/MiddlePersonSelectionModal.tsx` - Middle person selection
- `components/intro/ContinuationChoiceModal.tsx` - Continuation choice
- `components/intro/IntroRequestCard.tsx` - Request display card
- `supabase/migrations/012_create_intro_requests.sql` - Database migration

### Modified Files
- `app/profile-details.tsx` - Added intro request buttons and flow
- `app/(tabs)/connect.tsx` - Integrated intro requests display
- `app/(tabs)/_layout.tsx` - Connect tab configuration

## Notes

- The feature uses proper TypeScript types throughout
- All database operations have error handling
- RLS policies ensure data security
- UI follows existing design patterns
- Component structure is modular and reusable
- All user-facing text is clear and descriptive

