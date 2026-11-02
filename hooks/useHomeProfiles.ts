import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useState } from 'react';

const PAGE_SIZE = 20;
import { pictureViewService } from '../lib/pictureViewService';
import { isPictureVisibleToViewer } from '../lib/profilePictureVisibility';
import { Profile as DBProfile, profileService } from '../lib/profileService';
import { supabase } from '../lib/supabase';
import { calculateAge } from '../lib/utils';
import { DirectoryFields, FilterState, Profile } from '../types/homeTypes';
import { useRealtimeProfiles } from './useRealtimeProfiles';
import { useViewedPictureIds } from './useViewedPictureIds';

/** Read a Supabase timestamp without Date.parse. Hermes rejects several of the formats PostgREST returns. */
function parseProfileTimestamp(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isNaN(time) ? null : time;
  }
  const raw = String(value).trim();
  if (!raw) return null;

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?([zZ]|[+-]\d{2}:?\d{2})?$/
  );
  if (!match) {
    const fallback = Date.parse(raw);
    return Number.isNaN(fallback) ? null : fallback;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const fraction = (match[7] ?? '').slice(0, 3).padEnd(3, '0');
  const milliseconds = Number(fraction);
  let offsetMinutes = 0;
  const zone = match[8];
  if (zone && zone.toLowerCase() !== 'z') {
    const sign = zone.startsWith('-') ? -1 : 1;
    const digits = zone.slice(1).replace(':', '');
    const zoneHours = Number(digits.slice(0, 2));
    const zoneMinutes = Number(digits.slice(2, 4) || '0');
    offsetMinutes = sign * (zoneHours * 60 + zoneMinutes);
  }

  const utc =
    Date.UTC(year, month - 1, day, hour, minute, second, milliseconds) -
    offsetMinutes * 60 * 1000;
  return Number.isNaN(utc) ? null : utc;
}

function timestampToString(value: unknown): string | undefined {
  if (parseProfileTimestamp(value) == null) return undefined;
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'number') return new Date(value).toISOString();
  return String(value);
}

/** Newest first uses when the profile was created in the app. */
function compareByCreatedTime(a: Profile, b: Profile): number {
  const aTime = parseProfileTimestamp(a.createdAt);
  const bTime = parseProfileTimestamp(b.createdAt);
  if (aTime == null && bTime == null) return a.id.localeCompare(b.id);
  if (aTime == null) return 1;
  if (bTime == null) return -1;
  if (aTime !== bTime) return aTime > bTime ? -1 : 1;
  return a.id.localeCompare(b.id);
}

function ageOf(profile: Profile): number | null {
  const dob = directoryOf(profile).dob ?? profile.dob;
  if (!dob) return null;
  const age = calculateAge(dob);
  return age > 0 ? age : null;
}

/** Oldest first is the higher age. Youngest first is the lower age. Missing ages go last. */
function compareByAge(a: Profile, b: Profile, oldestFirst: boolean): number {
  const aAge = ageOf(a);
  const bAge = ageOf(b);
  if (aAge == null && bAge == null) return a.id.localeCompare(b.id);
  if (aAge == null) return 1;
  if (bAge == null) return -1;
  if (aAge !== bAge) {
    const youngerFirst = aAge < bAge ? -1 : 1;
    return oldestFirst ? -youngerFirst : youngerFirst;
  }
  return a.id.localeCompare(b.id);
}

// Standalone fetch function — defined outside hook so it is stable across renders
async function fetchHomeData() {
  const [currentProfileResult, profilesQuery, viewedResult, adminUsersQuery] = await Promise.all([
    profileService.getProfile(),
    supabase
      .from('profiles')
      .select('*')
      .eq('status', 'approved')
      .eq('is_active', true)
      .eq('role', 'single'),
    pictureViewService.getViewedProfiles(),
    supabase.from('admin_users').select('user_id'),
  ]);
  return { currentProfileResult, profilesQuery, viewedResult, adminUsersQuery };
}

// Transform database profile to display profile (outside hook — pure function)
function transformProfile(dbProfile: any, viewedProfileIds: string[]): Profile {
  const fieldPrivacy = dbProfile.field_privacy || {};
  const picturePrivacy = dbProfile.picture_privacy || 'none';
  const hasBeenViewed = viewedProfileIds.includes(dbProfile.id);
  const oneTimeAlreadyOpened = picturePrivacy === 'one_time' && hasBeenViewed;
  const showPictures =
    picturePrivacy === 'always' ||
    picturePrivacy === 'private' ||
    picturePrivacy === 'one_time';

  const firstPicture =
    showPictures && dbProfile.pictures?.length > 0
      ? profileService.getImageUrl(dbProfile.pictures[0])
      : '';
  const allPictures =
    showPictures && dbProfile.pictures?.length > 0
      ? dbProfile.pictures.map((pic: string) => profileService.getImageUrl(pic))
      : [];

  const locationString =
    dbProfile.location_country === 'United States'
      ? `${dbProfile.location_city}, ${dbProfile.location_state}${dbProfile.location_country ? ', ' + dbProfile.location_country : ''}`
      : dbProfile.location_country;
  const location =
    fieldPrivacy.location_city || fieldPrivacy.location_state ? 'Hidden' : locationString;

  return {
    id: dbProfile.id,
    first_name: dbProfile.first_name,
    last_name: dbProfile.last_name,
    name: `${dbProfile.first_name} ${dbProfile.last_name}`,
    dob: fieldPrivacy.dob ? undefined : dbProfile.dob,
    picture: firstPicture,
    pictures: allPictures,
    hashkafa_type: fieldPrivacy.hashkafa_type ? undefined : dbProfile.hashkafa_type,
    location,
    location_city: fieldPrivacy.location_city ? undefined : dbProfile.location_city,
    location_state: fieldPrivacy.location_state ? undefined : dbProfile.location_state,
    location_country: fieldPrivacy.location_country ? undefined : dbProfile.location_country,
    bio: dbProfile.bio || 'No bio available',
    role: dbProfile.role,
    gender: dbProfile.gender,
    phone: fieldPrivacy.phone ? undefined : dbProfile.phone,
    email: fieldPrivacy.email ? undefined : dbProfile.email,
    whatsapp: fieldPrivacy.whatsapp ? undefined : dbProfile.whatsapp,
    height: fieldPrivacy.height ? undefined : dbProfile.height,
    hasChildren: fieldPrivacy.hasChildren ? undefined : dbProfile.has_children,
    nationality: fieldPrivacy.nationality ? undefined : dbProfile.nationality,
    marital_status: fieldPrivacy.marital_status ? undefined : dbProfile.marital_status,
    education_level: fieldPrivacy.education_level ? undefined : dbProfile.education_level,
    current_occupation_study: fieldPrivacy.current_occupation_study
      ? undefined
      : dbProfile.current_occupation_study,
    picturePrivacy,
    picturesViewed: oneTimeAlreadyOpened,
    createdAt: timestampToString(dbProfile.created_at),
    approvedAt: timestampToString(dbProfile.approved_at),
    field_privacy: fieldPrivacy,
    directory: directoryFields(dbProfile),
  };
}

function storedBoolean(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  return null;
}

function directoryFields(dbProfile: {
  dob?: string | null;
  height?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  hashkafa_type?: string | null;
  nationality?: string[] | null;
  marital_status?: string | null;
  has_children?: boolean | null;
  education_level?: string | null;
  current_occupation_study?: string | null;
  torah_learning?: string | null;
  praying?: string | null;
  wears_black_hat?: boolean | null;
  head_covering?: string | null;
  post_high_school_path?: string | null;
}): DirectoryFields {
  return {
    dob: dbProfile.dob ?? null,
    height: dbProfile.height ?? null,
    location_city: dbProfile.location_city ?? null,
    location_state: dbProfile.location_state ?? null,
    location_country: dbProfile.location_country ?? null,
    hashkafa_type: dbProfile.hashkafa_type ?? null,
    nationality: Array.isArray(dbProfile.nationality) ? dbProfile.nationality : null,
    marital_status: dbProfile.marital_status ?? null,
    has_children: storedBoolean(dbProfile.has_children),
    education_level: dbProfile.education_level ?? null,
    current_occupation_study: dbProfile.current_occupation_study ?? null,
    torah_learning: dbProfile.torah_learning ?? null,
    praying: dbProfile.praying ?? null,
    wears_black_hat: storedBoolean(dbProfile.wears_black_hat),
    head_covering: dbProfile.head_covering ?? null,
    post_high_school_path: dbProfile.post_high_school_path ?? null,
  };
}

function directoryOf(profile: Profile): DirectoryFields {
  return profile.directory ?? {};
}

function heightInInches(height: string | null | undefined): number | null {
  if (!height) return null;
  const match = height.match(/(\d+)\s*'\s*(\d+)/);
  if (!match) return null;
  return parseInt(match[1], 10) * 12 + parseInt(match[2], 10);
}

function answerIncludes(value: string | null | undefined, selected: string[]): boolean {
  if (!value) return false;
  const parts = value.split(',').map((part) => part.trim());
  return selected.some((item) => parts.includes(item));
}

/** Yes when they said yes or their marital status includes kids. No when they answered otherwise. */
function hasChildrenAnswer(profile: Profile): boolean | null {
  const directory = directoryOf(profile);
  if (directory.has_children === true) return true;
  if (directory.has_children === false) return false;
  const status = directory.marital_status ?? '';
  if (/with kids/i.test(status)) return true;
  if (status.trim()) return false;
  return null;
}

export function useHomeProfiles() {
  const queryClient = useQueryClient();
  const { viewedIds } = useViewedPictureIds();

  // ── React Query fetch ────────────────────────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['home_profiles'],
    queryFn: fetchHomeData,
    staleTime: 2 * 60 * 1000,
  });

  // ── Derived / processed state ────────────────────────────────────────────
  const [currentUserProfile, setCurrentUserProfile] = useState<DBProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [filterState, setFilterState] = useState<FilterState>({
    genderFilter: 'all',
    selectedAgeOption: null,
    minAge: null,
    maxAge: null,
    exactAge: null,
    selectedCountries: [],
    selectedStates: [],
    selectedCities: [],
    selectedHashkafa: [],
    selectedNationality: [],
    selectedMaritalStatus: [],
    hasChildren: null,
    selectedEducation: [],
    selectedOccupation: [],
    minHeightFeet: null,
    minHeightInches: null,
    maxHeightFeet: null,
    maxHeightInches: null,
    sortBy: null,
    hasAskMeFields: false,
    hasPhoto: null,
    hasOneTimePhoto: false,
    hasPrivatePhoto: false,
    selectedTorahLearning: [],
    selectedPraying: [],
    selectedHeadCovering: [],
    selectedPostHighSchool: [],
    wearsBlackHat: null,
  });

  // ── Sync query result → local state ─────────────────────────────────────
  useEffect(() => {
    if (!data) return;
    const { currentProfileResult, profilesQuery, viewedResult, adminUsersQuery } = data;

    if (currentProfileResult.success && currentProfileResult.profile) {
      setCurrentUserProfile(currentProfileResult.profile);
    }

    const { data: profilesData, error } = profilesQuery;
    if (!error && profilesData) {
      const fetchedViewedIds = viewedResult.success ? viewedResult.viewedProfileIds ?? [] : [];
      const viewedProfileIds = Array.from(new Set([...fetchedViewedIds, ...viewedIds]));
      const adminUserIds = new Set(
        (adminUsersQuery.data ?? []).map((a: { user_id: string }) => a.user_id)
      );
      const nonAdminProfiles = profilesData.filter((p) => !adminUserIds.has(p.user_id));
      const transformed = nonAdminProfiles.map((p) => transformProfile(p, viewedProfileIds));
      setAllProfiles(transformed);
    }
  }, [data, viewedIds]);

  // ── Filter profiles based on user role / gender ──────────────────────────
  const filterProfilesByUserType = useCallback(
    (profiles: Profile[], userProfile: DBProfile | null): Profile[] => {
      if (!userProfile) return [];

      let filtered = profiles.filter((p) => p.role === 'single');

      if (userProfile.role === 'single') {
        filtered = filtered.filter((p) => p.gender !== userProfile.gender);
      } else if (userProfile.role === 'matchmaker') {
        filtered = filtered.filter((p) => p.role === 'single');
        if (filterState.genderFilter !== 'all') {
          filtered = filtered.filter((p) => p.gender === filterState.genderFilter);
        }
      }

      return filtered.filter((p) => p.id !== userProfile.id);
    },
    [filterState.genderFilter]
  );

  // ── Search helper ─────────────────────────────────────────────────────────
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // ── Full filter + sort effect ─────────────────────────────────────────────
  useEffect(() => {
    const baseFiltered = filterProfilesByUserType(allProfiles, currentUserProfile);
    let filtered = [...baseFiltered];

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (profile) =>
          profile.name.toLowerCase().includes(searchLower) ||
          (profile.hashkafa_type &&
            profile.hashkafa_type.toLowerCase().includes(searchLower)) ||
          profile.location.toLowerCase().includes(searchLower)
      );
    }

    if (filterState.selectedAgeOption) {
      const [min, max] =
        filterState.selectedAgeOption === '36+'
          ? [36, 999]
          : filterState.selectedAgeOption.split('-').map(Number);
      filtered = filtered.filter((p) => {
        const dob = directoryOf(p).dob;
        if (!dob) return false;
        const age = calculateAge(dob);
        return age >= min && age <= max;
      });
    } else if (filterState.exactAge !== null) {
      filtered = filtered.filter((p) => {
        const dob = directoryOf(p).dob;
        if (!dob) return false;
        return calculateAge(dob) === filterState.exactAge;
      });
    } else if (filterState.minAge !== null || filterState.maxAge !== null) {
      filtered = filtered.filter((p) => {
        const dob = directoryOf(p).dob;
        if (!dob) return false;
        const age = calculateAge(dob);
        return age >= (filterState.minAge ?? 0) && age <= (filterState.maxAge ?? 999);
      });
    }

    if (filterState.selectedCountries.length > 0) {
      filtered = filtered.filter((p) => {
        const country = directoryOf(p).location_country;
        return !!country && filterState.selectedCountries.includes(country);
      });
    }
    if (filterState.selectedStates.length > 0) {
      filtered = filtered.filter((p) => {
        const state = directoryOf(p).location_state;
        return !!state && filterState.selectedStates.includes(state);
      });
    }
    if (filterState.selectedCities.length > 0) {
      filtered = filtered.filter((p) => {
        const city = directoryOf(p).location_city?.toLowerCase();
        return !!city && filterState.selectedCities.some((c) => city.includes(c.toLowerCase()));
      });
    }

    if (filterState.selectedHashkafa.length > 0) {
      filtered = filtered.filter((p) => {
        const hashkafa = directoryOf(p).hashkafa_type;
        return !!hashkafa && filterState.selectedHashkafa.includes(hashkafa);
      });
    }
    if (filterState.selectedNationality.length > 0) {
      filtered = filtered.filter((p) => {
        const nationality = directoryOf(p).nationality;
        if (!nationality) return false;
        return filterState.selectedNationality.some((nat) => nationality.includes(nat));
      });
    }
    if (filterState.selectedMaritalStatus.length > 0) {
      filtered = filtered.filter((p) => {
        const status = directoryOf(p).marital_status;
        return !!status && filterState.selectedMaritalStatus.includes(status);
      });
    }
    if (filterState.hasChildren !== null) {
      filtered = filtered.filter(
        (p) => hasChildrenAnswer(p) === filterState.hasChildren
      );
    }

    if (filterState.selectedEducation.length > 0) {
      filtered = filtered.filter((p) =>
        answerIncludes(directoryOf(p).education_level, filterState.selectedEducation)
      );
    }
    if (filterState.selectedOccupation.length > 0) {
      filtered = filtered.filter((p) => {
        const occupation = directoryOf(p).current_occupation_study;
        return !!occupation && filterState.selectedOccupation.includes(occupation);
      });
    }

    if (
      filterState.minHeightFeet !== null ||
      filterState.minHeightInches !== null ||
      filterState.maxHeightFeet !== null ||
      filterState.maxHeightInches !== null
    ) {
      filtered = filtered.filter((p) => {
        const profileTotal = heightInInches(directoryOf(p).height);
        if (profileTotal == null) return false;
        const minTotal =
          filterState.minHeightFeet !== null || filterState.minHeightInches !== null
            ? (filterState.minHeightFeet ?? 0) * 12 + (filterState.minHeightInches ?? 0)
            : 0;
        const maxTotal =
          filterState.maxHeightFeet !== null || filterState.maxHeightInches !== null
            ? (filterState.maxHeightFeet ?? 8) * 12 + (filterState.maxHeightInches ?? 11)
            : 999;
        return profileTotal >= minTotal && profileTotal <= maxTotal;
      });
    }

    if (filterState.hasAskMeFields) {
      filtered = filtered.filter((p) => {
        if (!p.field_privacy) return false;
        const vals = Object.values(p.field_privacy);
        return vals.length > 0 && vals.some((v) => v === true);
      });
    }
    // Photo filters — OR logic within the group, AND with other filter categories
    const photoFiltersActive =
      filterState.hasPhoto !== null ||
      filterState.hasOneTimePhoto ||
      filterState.hasPrivatePhoto;

    if (photoFiltersActive) {
      filtered = filtered.filter((p) => {
        const hasVisiblePhoto =
          !!p.picture &&
          isPictureVisibleToViewer(p.picturePrivacy, !!p.picturesViewed);
        const hasNoPhoto =
          p.picturePrivacy === 'none' ||
          ((!p.picture || p.picture.length === 0) &&
            p.picturePrivacy !== 'one_time' &&
            p.picturePrivacy !== 'private');

        if (filterState.hasPhoto === true && hasVisiblePhoto) return true;
        if (filterState.hasPhoto === false && hasNoPhoto) return true;
        if (filterState.hasOneTimePhoto && p.picturePrivacy === 'one_time') return true;
        if (filterState.hasPrivatePhoto && p.picturePrivacy === 'private') return true;

        return false;
      });
    }

    if (filterState.selectedTorahLearning.length > 0) {
      filtered = filtered.filter((p) => {
        const value = directoryOf(p).torah_learning;
        return !!value && filterState.selectedTorahLearning.includes(value);
      });
    }
    if (filterState.selectedPraying.length > 0) {
      filtered = filtered.filter((p) => {
        const value = directoryOf(p).praying;
        return !!value && filterState.selectedPraying.includes(value);
      });
    }
    if (filterState.wearsBlackHat !== null) {
      filtered = filtered.filter((p) => {
        if (p.gender !== 'male') return false;
        const wearsHat = directoryOf(p).wears_black_hat === true;
        return filterState.wearsBlackHat === true ? wearsHat : !wearsHat;
      });
    }
    if (filterState.selectedHeadCovering.length > 0) {
      filtered = filtered.filter((p) => {
        const value = directoryOf(p).head_covering;
        return !!value && filterState.selectedHeadCovering.includes(value);
      });
    }
    if (filterState.selectedPostHighSchool.length > 0) {
      filtered = filtered.filter((p) => {
        const value = directoryOf(p).post_high_school_path;
        return !!value && filterState.selectedPostHighSchool.includes(value);
      });
    }

    if (filterState.sortBy === 'newest') {
      filtered.sort(compareByCreatedTime);
    } else if (filterState.sortBy === 'oldest') {
      filtered.sort((a, b) => compareByAge(a, b, true));
    } else if (filterState.sortBy === 'youngest') {
      filtered.sort((a, b) => compareByAge(a, b, false));
    } else if (filterState.sortBy === 'pictures_to_none') {
      const order: Record<string, number> = { always: 0, one_time: 1, private: 2, none: 3 };
      filtered.sort((a, b) => (order[a.picturePrivacy] ?? 3) - (order[b.picturePrivacy] ?? 3));
    } else if (filterState.sortBy === 'none_to_pictures') {
      const order: Record<string, number> = { none: 0, private: 1, one_time: 2, always: 3 };
      filtered.sort((a, b) => (order[a.picturePrivacy] ?? 0) - (order[b.picturePrivacy] ?? 0));
    }

    setFilteredProfiles(filtered);
    // Reset visible window whenever the filtered set changes
    setVisibleCount(PAGE_SIZE);
  }, [searchQuery, filterState, allProfiles, currentUserProfile, filterProfilesByUserType]);

  // ── Infinite scroll ───────────────────────────────────────────────────────
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + PAGE_SIZE, filteredProfiles.length));
  }, [filteredProfiles.length]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  // ── Realtime: invalidate cache instead of silent-refetch ─────────────────
  const silentRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['home_profiles'] });
  }, [queryClient]);

  useRealtimeProfiles(silentRefresh);

  // ── Realtime: also invalidate when picture_views changes for the current user ─
  // This ensures the "Opened" overlay on one-time photos updates immediately
  // after viewing a profile, without needing a manual pull-to-refresh.
  useEffect(() => {
    let channelName: string | null = null;

    const setup = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the viewer's profile id
      const { data: viewerProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (!viewerProfile) return;

      channelName = `picture_views_viewer_${viewerProfile.id}`;
      supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'picture_views',
            filter: `viewer_profile_id=eq.${viewerProfile.id}`,
          },
          () => {
            queryClient.invalidateQueries({ queryKey: ['home_profiles'] });
          }
        )
        .subscribe();
    };

    setup();

    return () => {
      if (channelName) {
        const ch = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
        if (ch) supabase.removeChannel(ch);
      }
    };
  }, [queryClient]);

  const visibleProfiles = filteredProfiles.slice(0, visibleCount);
  const hasMore = visibleCount < filteredProfiles.length;

  return {
    currentUserProfile,
    filteredProfiles,
    visibleProfiles,
    hasMore,
    loadMore,
    loading: isLoading,   // false on every tab revisit — data serves from cache
    refreshing,
    searchQuery,
    filterState,
    setSearchQuery: handleSearch,
    setFilterState,
    onRefresh,
  };
}
