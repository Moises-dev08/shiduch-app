# Shiduchim App - Modular Architecture

## Overview
This document describes the modular architecture implemented for the profile suggestion and info request features.

## Architecture Principles
- **Separation of Concerns**: Business logic, UI components, and data services are separated
- **Reusability**: Components and hooks can be reused across the application
- **Maintainability**: Each module has a single responsibility
- **Testability**: Isolated components and hooks are easier to test

## Directory Structure

```
shiduchim-app/
├── app/
│   └── (tabs)/
│       ├── index.tsx              # Main home screen (uses modular components)
│       └── setup.tsx              # History screen (suggestions & info requests)
├── components/
│   ├── profile/
│   │   ├── NoMatchmakerModal.tsx           # Modal when user has no matchmaker
│   │   ├── SuggestionConfirmModal.tsx      # Confirmation modal for suggestions
│   │   └── ProfileActions.tsx              # Setup & Ask for Info buttons
│   └── setup/
│       ├── SuggestionHistoryItem.tsx       # Suggestion history card
│       └── InfoRequestHistoryItem.tsx      # Info request history card
├── hooks/
│   ├── useSuggestions.ts          # Custom hook for suggestion logic
│   └── useSetupHistory.ts         # Custom hook for fetching history data
├── lib/
│   ├── profileService.ts          # Profile data operations
│   ├── suggestionService.ts       # Suggestion & info request operations
│   └── supabase.ts                # Supabase client configuration
└── supabase/
    └── migrations/
        └── ...                    # Database migration files
```

## Module Descriptions

### 1. Components (`/components/profile/`)

#### `ProfileActions.tsx`
**Purpose**: Renders the action buttons at the bottom of the profile modal

**Props**:
- `onSetupPress`: Handler for Setup button
- `onAskForInfoPress`: Handler for Ask for Info button
- `isSubmittingInfoRequest`: Loading state for info request
- `showSetupButton`: Toggle Setup button visibility
- `showAskForInfoButton`: Toggle Ask for Info button visibility

**Features**:
- Responsive button layout
- Loading states
- Disabled states during submission

#### `SuggestionConfirmModal.tsx`
**Purpose**: Confirmation dialog before sending a suggestion to matchmaker

**Props**:
- `visible`: Modal visibility state
- `profileName`: Name of the profile being suggested
- `isLoading`: Loading state during submission
- `onConfirm`: Confirm action handler
- `onCancel`: Cancel action handler

**Features**:
- Clean modal UI with icon
- Loading indicator during submission
- Prevents duplicate submissions

#### `NoMatchmakerModal.tsx`
**Purpose**: Informative modal when user tries to suggest without a matchmaker

**Props**:
- `visible`: Modal visibility state
- `onClose`: Close handler

**Features**:
- Clear messaging
- Navigation to profile page to add matchmaker
- Cancel option

### 2. Custom Hook (`/hooks/useSuggestions.ts`)

#### `useSuggestions(currentUserProfile, selectedProfile)`
**Purpose**: Encapsulates all business logic for suggestions and info requests

**Parameters**:
- `currentUserProfile`: Current logged-in user's profile
- `selectedProfile`: The profile being viewed

**Returns**:
```typescript
{
  showSetupConfirmModal: boolean;
  setShowSetupConfirmModal: (show: boolean) => void;
  showNoMatchmakerModal: boolean;
  setShowNoMatchmakerModal: (show: boolean) => void;
  isSubmittingSuggestion: boolean;
  isSubmittingInfoRequest: boolean;
  handleSetupPress: () => void;
  handleConfirmSetup: () => Promise<void>;
  handleAskForInfo: () => Promise<void>;
}
```

**Business Rules**:
- Only single users can create suggestions
- User must have a matchmaker associated
- Validates profile state before actions
- Handles all API calls and error states

### 3. Services (`/lib/`)

#### `suggestionService.ts`
**Purpose**: Handles all database operations for suggestions and info requests

**Methods**:

##### `createSuggestion(suggestedProfileId, matchmakerId?, notes?)`
- Creates a new suggestion record
- Associates with user's matchmaker
- Returns success/error status

##### `getUserSuggestions()`
- Fetches all suggestions made by current user
- Ordered by creation date (newest first)

##### `createInfoRequest(requestedProfileId, message?)`
- Creates a new info request
- Links requester to requested profile
- Returns success/error status

##### `getUserInfoRequests()`
- Fetches all info requests made by current user
- Ordered by creation date (newest first)

**Error Handling**:
- Duplicate detection (23505 constraint violations)
- Authentication validation
- Profile existence checks

## Database Schema

### `suggestions` Table
```sql
- id: UUID (PK)
- suggester_id: UUID (FK -> profiles.id)
- suggested_profile_id: UUID (FK -> profiles.id)
- matchmaker_id: UUID (FK -> profiles.id, nullable)
- status: TEXT (pending, accepted, rejected, completed)
- notes: TEXT (nullable)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- UNIQUE(suggester_id, suggested_profile_id)
```

**RLS Policies**:
- Users can view their own suggestions
- Users can create suggestions
- Matchmakers can view their assigned suggestions

### `info_requests` Table
```sql
- id: UUID (PK)
- requester_id: UUID (FK -> profiles.id)
- requested_profile_id: UUID (FK -> profiles.id)
- status: TEXT (pending, approved, rejected)
- message: TEXT (nullable)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
- UNIQUE(requester_id, requested_profile_id)
```

**RLS Policies**:
- Users can view their own requests (both sent and received)
- Users can create info requests
- Profile owners can update request status

## User Flows

### Setup Suggestion Flow
1. User taps profile card → Profile modal opens
2. User taps "Setup" button
3. System checks:
   - Is user a single? → If not, show error
   - Does user have matchmaker? → If not, show `NoMatchmakerModal`
4. If checks pass → Show `SuggestionConfirmModal`
5. User confirms → Create suggestion record
6. Success notification displayed

### Ask for Info Flow
1. User taps profile card → Profile modal opens
2. User taps "Ask for Info" button
3. System creates info request record
4. Success notification displayed

## Benefits of This Architecture

1. **Maintainability**: Each component/hook has a single, clear purpose
2. **Reusability**: Components can be used in other parts of the app
3. **Testability**: Isolated modules are easier to unit test
4. **Scalability**: Easy to add new features without modifying existing code
5. **Readability**: Clear separation makes code easier to understand
6. **Type Safety**: TypeScript interfaces ensure type correctness

### 4. History Components (`/components/setup/`)

#### `SuggestionHistoryItem.tsx`
**Purpose**: Displays a single suggestion in the history list

**Props**:
- `profileName`: Name of the suggested profile
- `profilePicture`: Profile picture URL
- `status`: Current status (pending, accepted, rejected, completed)
- `createdAt`: Date when suggestion was created
- `matchmakerName`: Name of the matchmaker (optional)

**Features**:
- Color-coded status badges
- Profile image with fallback
- Formatted date display
- Matchmaker attribution

#### `InfoRequestHistoryItem.tsx`
**Purpose**: Displays a single info request in the history list

**Props**:
- `profileName`: Name of the requested profile
- `profilePicture`: Profile picture URL
- `status`: Current status (pending, approved, rejected)
- `createdAt`: Date when request was created
- `message`: Optional message with the request

**Features**:
- Color-coded status badges
- Profile image with fallback
- Formatted date display
- Message preview

### 5. History Hook (`/hooks/useSetupHistory.ts`)

#### `useSetupHistory()`
**Purpose**: Fetches and manages history data for suggestions and info requests

**Returns**:
```typescript
{
  suggestions: SuggestionWithDetails[];
  infoRequests: InfoRequestWithDetails[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => void;
}
```

**Features**:
- Parallel data fetching for performance
- Pull-to-refresh support
- Loading and error states
- Auto-load on mount

### 6. Setup Screen (`/app/(tabs)/setup.tsx`)

**Purpose**: Displays user's history of suggestions and info requests

**Features**:
- Tab navigation between suggestions and info requests
- Badge counts for each tab
- Pull-to-refresh functionality
- Empty states with helpful messaging
- Loading and error states
- Profile pictures with fallback icons

**Status Labels**:
- **Suggestions**: Pending, Answered (accepted), Rejected, Completed
- **Info Requests**: Pending, Approved, Rejected

## Enhanced Service Methods

### `suggestionService.ts`

#### New Methods:

##### `getUserSuggestionsWithDetails()`
- Fetches suggestions with full profile information
- Includes suggested profile name and picture
- Includes matchmaker name if associated
- Ordered by creation date (newest first)

##### `getUserInfoRequestsWithDetails()`
- Fetches info requests with full profile information
- Includes requested profile name and picture
- Ordered by creation date (newest first)

## Status Workflow

### Suggestion Statuses:
1. **pending** - Initial state when suggestion is created
2. **accepted** - Matchmaker or profile owner accepted the suggestion (shown as "Answered")
3. **rejected** - Suggestion was declined
4. **completed** - Suggestion led to a successful match

### Info Request Statuses:
1. **pending** - Initial state when request is created
2. **approved** - Profile owner approved sharing information
3. **rejected** - Profile owner declined to share information

## Future Enhancements

- Add unit tests for `useSuggestions` and `useSetupHistory` hooks
- Create a `ProfileModal` wrapper component
- Add analytics tracking to button actions
- Implement notification system for matchmakers
- Add info request approval UI for profile owners
- Add detailed view for each suggestion/request
- Add filtering and search in history
- Add export functionality for matchmakers

