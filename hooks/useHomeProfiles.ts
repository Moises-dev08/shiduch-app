import { useCallback, useEffect, useRef, useState } from 'react';
import { pictureViewService } from '../lib/pictureViewService';
import { Profile as DBProfile, profileService } from '../lib/profileService';
import { supabase } from '../lib/supabase';
import { calculateAge } from '../lib/utils';
import { FilterState, Profile } from '../types/homeTypes';
import { useRealtimeProfiles } from './useRealtimeProfiles';

export function useHomeProfiles() {
  const [currentUserProfile, setCurrentUserProfile] = useState<DBProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isSilentRefetchRef = useRef(false);

  const [filterState, setFilterState] = useState<FilterState>({
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
    selectedTorahLearning: [],
    selectedPraying: [],
    selectedHeadCovering: [],
    wearsBlackHat: null,
  });

  // Transform database profile to display profile
  const transformProfile = (dbProfile: any, viewedProfileIds?: string[]): Profile => {
    const fieldPrivacy = dbProfile.field_privacy || {};
    
    const picturePrivacy = dbProfile.picture_privacy || 'none';
    
    // Check if this profile's one-time pictures have been viewed
    const hasBeenViewed = viewedProfileIds?.includes(dbProfile.id) || false;
    
    // Show pictures based on privacy and view status
    const showPictures = picturePrivacy === 'always' || picturePrivacy === 'private' ||
                        (picturePrivacy === 'one_time' && !hasBeenViewed);

    // Get images using profileService.getImageUrl - show for always, private, and unviewed one-time
    const firstPicture = showPictures && dbProfile.pictures && dbProfile.pictures.length > 0 
      ? profileService.getImageUrl(dbProfile.pictures[0])
      : '';
    
    const allPictures = showPictures && dbProfile.pictures && dbProfile.pictures.length > 0
      ? dbProfile.pictures.map((pic: string) => profileService.getImageUrl(pic))
      : [];

    // Build location string - hide if marked private
    const locationString = dbProfile.location_country === "United States"
      ? `${dbProfile.location_city}, ${dbProfile.location_state}${dbProfile.location_country ? ', ' + dbProfile.location_country : ''}`
      : dbProfile.location_country;
    const location = fieldPrivacy.location_city || fieldPrivacy.location_state ? 'Hidden' : locationString;

    return {
      id: dbProfile.id,
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
      current_occupation_study: fieldPrivacy.current_occupation_study ? undefined : dbProfile.current_occupation_study,
      picturePrivacy,
      field_privacy: fieldPrivacy,
    };
  };

  // Filter profiles based on user role and gender
  const filterProfilesByUserType = useCallback((profiles: Profile[], userProfile: DBProfile | null): Profile[] => {

    
    if (!userProfile) {

      return [];
    }

    // Show single profiles on home page (exclude matchmaker-only profiles)
    let filtered = profiles.filter(p => p.role === 'single');


    // If user is single, show opposite gender only (for dating)
    if (userProfile.role === 'single') {
      // Singles see opposite gender profiles for dating
      filtered = filtered.filter(p => p.gender !== userProfile.gender);

    }
    // If user is matchmaker only, show all singles
    else if (userProfile.role === 'matchmaker') {
      filtered = filtered.filter(p => p.role === 'single');
    }

    // Don't show the current user
    filtered = filtered.filter(p => p.id !== userProfile.id);


    return filtered;
  }, []);

  // Load profiles with optional silent mode
  const loadProfiles = useCallback(async (silent: boolean = false) => {
    try {
      // Only show loading state if not silent refresh
      if (!silent) {
        setLoading(true);
      } else {
        isSilentRefetchRef.current = true;
      }
      
      // Parallelize independent operations: profile fetch, profiles query, and viewed profiles
      const [currentProfileResult, profilesQuery, viewedResult] = await Promise.all([
        profileService.getProfile(),
        supabase
          .from('profiles')
          .select('*')
          .eq('status', 'approved')
          .eq('is_active', true) // Only show active (not frozen) profiles
          .eq('role', 'single'), // Show single profiles only
        pictureViewService.getViewedProfiles(),
      ]);

      if (currentProfileResult.success && currentProfileResult.profile) {
        setCurrentUserProfile(currentProfileResult.profile);
      }

      const { data, error } = profilesQuery;

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      const viewedProfileIds = viewedResult.success ? viewedResult.viewedProfileIds : [];

      const transformedProfiles = data?.map(p => transformProfile(p, viewedProfileIds)) || [];

      setAllProfiles(transformedProfiles);

      // Apply filters
      const filtered = filterProfilesByUserType(transformedProfiles, currentProfileResult.profile || null);
      setFilteredProfiles(filtered);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      if (!silent) {
        setLoading(false);
      }
      isSilentRefetchRef.current = false;
    }
  }, [filterProfilesByUserType]);

  // Refresh profiles
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProfiles();
    setRefreshing(false);
  }, [loadProfiles]);

  // Search profiles
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      const filtered = filterProfilesByUserType(allProfiles, currentUserProfile);
      setFilteredProfiles(filtered);
      return;
    }

    const searchLower = query.toLowerCase();
    const baseFiltered = filterProfilesByUserType(allProfiles, currentUserProfile);
    
    const filtered = baseFiltered.filter(profile =>
      profile.name.toLowerCase().includes(searchLower) ||
      (profile.hashkafa_type && profile.hashkafa_type.toLowerCase().includes(searchLower)) ||
      profile.location.toLowerCase().includes(searchLower)
    );
    
    setFilteredProfiles(filtered);
  }, [allProfiles, currentUserProfile, filterProfilesByUserType]);

  // Apply filters
  useEffect(() => {
    const baseFiltered = filterProfilesByUserType(allProfiles, currentUserProfile);
    
    let filtered = [...baseFiltered];

    // Apply search
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(profile =>
        profile.name.toLowerCase().includes(searchLower) ||
        (profile.hashkafa_type && profile.hashkafa_type.toLowerCase().includes(searchLower)) ||
        profile.location.toLowerCase().includes(searchLower)
      );
    }

    // Apply age filter
    if (filterState.selectedAgeOption) {
      const [min, max] = filterState.selectedAgeOption === '36+' 
        ? [36, 999]
        : filterState.selectedAgeOption.split('-').map(Number);
      
      filtered = filtered.filter(p => {
        if (!p.dob) return false;
        const age = calculateAge(p.dob);
        return age >= min && age <= max;
      });
    } else if (filterState.exactAge !== null) {
      filtered = filtered.filter(p => {
        if (!p.dob) return false;
        const age = calculateAge(p.dob);
        return age === filterState.exactAge;
      });
    } else if (filterState.minAge !== null || filterState.maxAge !== null) {
      filtered = filtered.filter(p => {
        if (!p.dob) return false;
        const age = calculateAge(p.dob);
        const min = filterState.minAge ?? 0;
        const max = filterState.maxAge ?? 999;
        return age >= min && age <= max;
      });
    }

    // Apply location filters
    if (filterState.selectedCountries.length > 0) {
      filtered = filtered.filter(p => {
        const country = p.location_country;
        return country && filterState.selectedCountries.includes(country);
      });
    }

    if (filterState.selectedStates.length > 0) {
      filtered = filtered.filter(p => {
        const state = p.location_state;
        return state && filterState.selectedStates.includes(state);
      });
    }

    if (filterState.selectedCities.length > 0) {
      filtered = filtered.filter(p => {
        const city = p.location_city?.toLowerCase();
        return city && filterState.selectedCities.some(c => city.includes(c.toLowerCase()));
      });
    }

    // Apply hashkafa filter
    if (filterState.selectedHashkafa.length > 0) {
      filtered = filtered.filter(p => 
        p.hashkafa_type && filterState.selectedHashkafa.includes(p.hashkafa_type)
      );
    }

    // Apply nationality filter
    if (filterState.selectedNationality.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.nationality || !Array.isArray(p.nationality)) return false;
        return filterState.selectedNationality.some(nat => p.nationality!.includes(nat));
      });
    }

    // Apply marital status filter
    if (filterState.selectedMaritalStatus.length > 0) {
      filtered = filtered.filter(p => 
        p.marital_status && filterState.selectedMaritalStatus.includes(p.marital_status)
      );
    }

    // Apply has children filter
    if (filterState.hasChildren !== null) {
      filtered = filtered.filter(p => {
        if (filterState.hasChildren === true) {
          return p.hasChildren === true;
        } else {
          return p.hasChildren === false || p.hasChildren === undefined;
        }
      });
    }

    // Apply education filter
    if (filterState.selectedEducation.length > 0) {
      filtered = filtered.filter(p => {
        if (!p.education_level) return false;
        // Education level can be comma-separated, so check if any selected education matches
        const educationLevels = p.education_level.split(',').map(e => e.trim());
        return filterState.selectedEducation.some(edu => educationLevels.includes(edu));
      });
    }

    // Apply occupation filter
    if (filterState.selectedOccupation.length > 0) {
      filtered = filtered.filter(p => 
        p.current_occupation_study && filterState.selectedOccupation.includes(p.current_occupation_study)
      );
    }

    // Apply height filter
    if (filterState.minHeightFeet !== null || filterState.minHeightInches !== null ||
        filterState.maxHeightFeet !== null || filterState.maxHeightInches !== null) {
      filtered = filtered.filter(p => {
        if (!p.height) return false;
        // Parse height from format like "5'10""
        const match = p.height.match(/(\d+)'(\d+)"/);
        if (!match) return false;
        const profileFeet = parseInt(match[1]);
        const profileInches = parseInt(match[2]);
        const profileTotalInches = profileFeet * 12 + profileInches;

        // Calculate min and max total inches
        const minFeet = filterState.minHeightFeet ?? 0;
        const minInches = filterState.minHeightInches ?? 0;
        const minTotalInches = minFeet * 12 + minInches;

        const maxFeet = filterState.maxHeightFeet ?? 8;
        const maxInches = filterState.maxHeightInches ?? 11;
        const maxTotalInches = maxFeet * 12 + maxInches;

        // If no min specified, use 0. If no max specified, use a very high number
        const actualMin = (filterState.minHeightFeet !== null || filterState.minHeightInches !== null) 
          ? minTotalInches 
          : 0;
        const actualMax = (filterState.maxHeightFeet !== null || filterState.maxHeightInches !== null)
          ? maxTotalInches
          : 999;

        return profileTotalInches >= actualMin && profileTotalInches <= actualMax;
      });
    }

    // Apply "Ask Me" filter - show profiles with at least one private field
    if (filterState.hasAskMeFields) {
      filtered = filtered.filter(p => {
        if (!p.field_privacy) return false;
        // Check if any field is marked as private (value is true)
        return Object.values(p.field_privacy).some(isPrivate => isPrivate === true);
      });
    }

    // Apply photo filter
    if (filterState.hasPhoto !== null) {
      filtered = filtered.filter(p => {
        // Check if profile has a picture (not empty string and not "none" privacy)
        const hasPhoto = p.picture && p.picture.length > 0 && p.picturePrivacy !== 'none';
        if (filterState.hasPhoto === true) {
          return hasPhoto;
        } else {
          return !hasPhoto || p.picturePrivacy === 'none';
        }
      });
    }

    // Apply gender-specific filters
    // Torah Learning (for males - shown to female users)
    if (filterState.selectedTorahLearning.length > 0) {
      filtered = filtered.filter(p => {
        // This filter should only apply to male profiles
        // Access torah_learning from the original allProfiles data
        const originalProfile = allProfiles.find(op => op.id === p.id);
        return originalProfile && (originalProfile as any).torah_learning && 
               filterState.selectedTorahLearning.includes((originalProfile as any).torah_learning);
      });
    }

    // Praying (for males - shown to female users)
    if (filterState.selectedPraying.length > 0) {
      filtered = filtered.filter(p => {
        const originalProfile = allProfiles.find(op => op.id === p.id);
        return originalProfile && (originalProfile as any).praying && 
               filterState.selectedPraying.includes((originalProfile as any).praying);
      });
    }

    // Wears Black Hat (for males - shown to female users)
    if (filterState.wearsBlackHat !== null) {
      filtered = filtered.filter(p => {
        const originalProfile = allProfiles.find(op => op.id === p.id);
        return originalProfile && (originalProfile as any).wears_black_hat === filterState.wearsBlackHat;
      });
    }

    // Head Covering (for females - shown to male users)
    if (filterState.selectedHeadCovering.length > 0) {
      filtered = filtered.filter(p => {
        const originalProfile = allProfiles.find(op => op.id === p.id);
        return originalProfile && (originalProfile as any).head_covering && 
               filterState.selectedHeadCovering.includes((originalProfile as any).head_covering);
      });
    }

    // Apply sorting
    if (filterState.sortBy === 'newest') {
      // Sort by creation date (newest first)
      filtered.sort((a, b) => {
        const aProfile = allProfiles.find(p => p.id === a.id);
        const bProfile = allProfiles.find(p => p.id === b.id);
        const aDate = (aProfile as any)?.created_at ? new Date((aProfile as any).created_at).getTime() : 0;
        const bDate = (bProfile as any)?.created_at ? new Date((bProfile as any).created_at).getTime() : 0;
        return bDate - aDate; // Newest first
      });
    } else if (filterState.sortBy === 'youngest') {
      // Sort by age (youngest first)
      filtered.sort((a, b) => {
        if (!a.dob || !b.dob) return 0;
        const ageA = calculateAge(a.dob);
        const ageB = calculateAge(b.dob);
        return ageA - ageB; // Youngest first
      });
    }

    setFilteredProfiles(filtered);
  }, [searchQuery, filterState, allProfiles, currentUserProfile, filterProfilesByUserType]);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles(false); // Initial load with loading state
  }, []);

  // Silent refresh callback for realtime updates
  const silentRefresh = useCallback(() => {
    loadProfiles(true); // Realtime updates without loading state
  }, [loadProfiles]);

  // Set up real-time subscription for profile updates (using silent refresh)
  useRealtimeProfiles(silentRefresh);

  return {
    currentUserProfile,
    filteredProfiles,
    loading,
    refreshing,
    searchQuery,
    filterState,
    setSearchQuery: handleSearch,
    setFilterState,
    onRefresh,
  };
}

