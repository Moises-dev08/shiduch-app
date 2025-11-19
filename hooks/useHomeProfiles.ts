import { useCallback, useEffect, useRef, useState } from 'react';
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
    selectedHashkafa: [],
    selectedLocation: [],
  });

  // Transform database profile to display profile
  const transformProfile = (dbProfile: any): Profile => {
    const fieldPrivacy = dbProfile.field_privacy || {};
    
  

    const picturePrivacy = dbProfile.picture_privacy || 'none';
    const showPictures = picturePrivacy === 'public' || picturePrivacy === 'private';

    // Get images using profileService.getImageUrl - show for public and private (blur applied in UI)
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
      bio: dbProfile.bio || 'No bio available',
      role: dbProfile.role,
      gender: dbProfile.gender,
      phone: fieldPrivacy.phone ? undefined : dbProfile.phone,
      email: fieldPrivacy.email ? undefined : dbProfile.email,
      whatsapp: fieldPrivacy.whatsapp ? undefined : dbProfile.whatsapp,
      height: fieldPrivacy.height ? undefined : dbProfile.height,
      hasChildren: fieldPrivacy.hasChildren ? undefined : dbProfile.has_children,
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
      
      // Get current user profile
      const currentProfileResult = await profileService.getProfile();

      
      if (currentProfileResult.success && currentProfileResult.profile) {
        setCurrentUserProfile(currentProfileResult.profile);

      }

      // Get all approved single profiles from database (exclude matchmaker-only and frozen)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved')
        .eq('is_active', true) // Only show active (not frozen) profiles
        .eq('role', 'single'); // Show single profiles only

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }



      const transformedProfiles = data?.map(transformProfile) || [];


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
        const age = calculateAge(p.dob);
        return age >= min && age <= max;
      });
    }

    // Apply hashkafa filter
    if (filterState.selectedHashkafa.length > 0) {
      filtered = filtered.filter(p => 
        p.hashkafa_type && filterState.selectedHashkafa.includes(p.hashkafa_type)
      );
    }

    // Apply location filter
    if (filterState.selectedLocation.length > 0) {
      filtered = filtered.filter(p => 
        filterState.selectedLocation.some(loc => p.location.includes(loc))
      );
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

