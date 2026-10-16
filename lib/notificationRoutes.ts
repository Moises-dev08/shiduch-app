/**
 * Single mapping from notification `data.type` (+ payload shape) → in-app route.
 * Used by NotificationPanel and NotificationHandler (`app/_layout.tsx`).
 */

/** Intro counterpart FYI historically used only `{ requestId }` (no facilitator ids). */
function isLegacyCounterpartIntroMatchmakerPing(data?: Record<string, any>): boolean {
  return !!(
    data?.requestId &&
    !data?.requesterId &&
    !data?.requestedProfileId &&
    !data?.suggestionId
  );
}

/** Older suggestion payloads only had `suggestionId` for facilitator and counterpart alike. */
function looksLikePeerMatchmakerNoticeCopy(hints?: {
  title?: string;
  body?: string;
}): boolean {
  const t = `${hints?.title ?? ""} ${hints?.body ?? ""}`;
  return /proceed\s+through\s+(a\s+)?matchmaker/i.test(t);
}

export function getNavigationTarget(
  type: string | undefined,
  data?: Record<string, any>,
  hints?: { title?: string; body?: string }
): string {
  switch (type) {
    case 'engagement_news':
      return '/successful-matches';

    case 'profile_approved':
    case 'profile_rejected':
    case 'profile_update_approved':
    case 'profile_update_rejected':
      return '/(tabs)/profile';

    case 'info_request_approved':
    case 'info_request_declined':
      if (data?.requestedProfileId) {
        return `/profile-details?profileId=${data.requestedProfileId}`;
      }
      return '/(tabs)/connect';

    case 'matchmaker_request':
      return '/(tabs)/connect?category=for_others&forOthersSection=awaiting';

    case 'matchmaker_responded':
      return '/(tabs)/connect?section=liked';

    case 'matchmaker_selected':
      // Peer single FYI (“match will proceed…”) → Matches (already coordinated). Same type is sent to facilitator.
      if (
        data?.purpose === 'counterpart_notice' ||
        isLegacyCounterpartIntroMatchmakerPing(data) ||
        looksLikePeerMatchmakerNoticeCopy(hints)
      ) {
        return '/(tabs)/connect?category=for_you&section=matches';
      }
      return '/(tabs)/connect?category=for_others&forOthersSection=awaiting';

    case 'intro_request_from_matchmaker':
      return '/(tabs)/connect?section=action_needed';

    /** Cold-start pushes used this — land on actionable Connect tab */
    case 'continuation_choice':
      return '/(tabs)/connect?section=action_needed';

    case 'match_accepted':
      return '/(tabs)/connect?section=matches';

    case 'requested_responded':
      return '/(tabs)/connect?category=for_others&forOthersSection=matched';

    case 'suggestion':
    case 'info_request':
      return '/(tabs)/connect?section=action_needed';

    case 'suggestion_rejected':
    case 'suggestion_declined':
    case 'intro_declined':
    case 'suggestion_reverted':
    case 'engagement_proposal':
    case 'engagement_confirmed':
    case 'engagement_confirmed_admin':
      return '/(tabs)/connect';

    case 'suggestion_both_accepted':
    case 'intro_both_accepted':
      return '/(tabs)/connect?section=matches';

    case 'suggestion_other_side_yes':
      return '/(tabs)/connect?section=action_needed';

    case 'suggestion_accepted_one_side':
      return '/(tabs)/connect?category=for_others&forOthersSection=awaiting';

    case 'admin_new_profile':
    case 'admin_profile_resubmitted':
      if (data?.profileId) {
        return `/admin/profile-review/${data.profileId}`;
      }
      return '/admin/dashboard';

    default:
      return '/(tabs)/connect';
  }
}
