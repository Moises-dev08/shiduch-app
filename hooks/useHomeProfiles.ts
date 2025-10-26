import { useCallback, useEffect, useState } from 'react';
import { Profile as DBProfile, profileService } from '../lib/profileService';
import { supabase } from '../lib/supabase';
import { FilterState, Profile } from '../types/homeTypes';

export function useHomeProfiles() {
  const [currentUserProfile, setCurrentUserProfile] = useState<DBProfile | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [filterState, setFilterState] = useState<FilterState>({
    selectedAgeOption: null,
    selectedHashkafa: [],
    selectedLocation: [],
  });

  // Transform database profile to display profile
  const transformProfile = (dbProfile: any): Profile => {
    console.log(`Converting profile ${dbProfile.first_name}:`, {
      hasPictures: !!dbProfile.pictures,
      picturesLength: dbProfile.pictures?.length || 0,
    });

    // Get images using profileService.getImageUrl
    const firstPicture = dbProfile.pictures && dbProfile.pictures.length > 0 
      ? profileService.getImageUrl(dbProfile.pictures[0])
      : 'https://via.placeholder.com/150';
    
    const allPictures = dbProfile.pictures && dbProfile.pictures.length > 0
      ? dbProfile.pictures.map((pic: string) => profileService.getImageUrl(pic))
      : ['https://via.placeholder.com/400'];

    // Build location string
    const location = dbProfile.address || 
      (dbProfile.city && dbProfile.state ? `${dbProfile.city}, ${dbProfile.state}` : 
       dbProfile.location_city || 
       dbProfile.location_street || 
       'Unknown');

    return {
      id: dbProfile.id,
      name: `${dbProfile.first_name} ${dbProfile.last_name}`,
      age: dbProfile.age || 0,
      picture: firstPicture,
      pictures: allPictures,
      hashkafa: dbProfile.hashkafa || 'Not specified',
      location,
      bio: dbProfile.bio || 'No bio available',
      role: dbProfile.role,
      gender: dbProfile.gender,
      phone: dbProfile.phone || undefined,
      email: dbProfile.email || undefined,
      whatsapp: dbProfile.whatsapp || undefined,
      school: dbProfile.school || undefined,
      occupation: dbProfile.occupation || undefined,
    };
  };

  // Filter profiles based on user role and gender
  const filterProfilesByUserType = useCallback((profiles: Profile[], userProfile: DBProfile | null): Profile[] => {
    console.log('Filtering profiles for user:', userProfile?.first_name, userProfile?.role);
    console.log('Total profiles before filtering:', profiles.length);
    
    if (!userProfile) {
      console.log('No user profile, returning empty array');
      return [];
    }

    // Only show single profiles on home page
    let filtered = profiles.filter(p => p.role === 'single');
    console.log('After role filter (only singles):', filtered.length);

    // If user is single, show opposite gender only
    if (userProfile.role === 'single') {
      filtered = filtered.filter(p => p.gender !== userProfile.gender);
      console.log(`Single ${userProfile.gender} user, showing opposite gender:`, filtered.length);
    }
    // If user is matchmaker, show all singles
    else if (userProfile.role === 'matchmaker') {
      console.log('Matchmaker user, showing all singles:', filtered.length);
    }

    // Don't show the current user
    filtered = filtered.filter(p => p.id !== userProfile.id);
    console.log('After removing current user:', filtered.length);

    return filtered;
  }, []);

  // Load profiles
  const loadProfiles = useCallback(async () => {
    try {
      setLoading(true);
      
      // Get current user profile
      const currentProfileResult = await profileService.getProfile();
      console.log('Current user profile:', currentProfileResult);
      
      if (currentProfileResult.success && currentProfileResult.profile) {
        setCurrentUserProfile(currentProfileResult.profile);
        console.log('Current user role:', currentProfileResult.profile.role);
        console.log('Current user gender:', currentProfileResult.profile.gender);
      }

      // Get all approved single profiles from database
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'approved')
        .eq('role', 'single'); // Only show single profiles

      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }

      console.log('Fetched profiles from database:', data?.length || 0);

      const transformedProfiles = data?.map(transformProfile) || [];
      console.log('Transformed profiles:', transformedProfiles.length);

      setAllProfiles(transformedProfiles);

      // Apply filters
      const filtered = filterProfilesByUserType(transformedProfiles, currentProfileResult.profile);
      setFilteredProfiles(filtered);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
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
      profile.hashkafa.toLowerCase().includes(searchLower) ||
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
        profile.hashkafa.toLowerCase().includes(searchLower) ||
        profile.location.toLowerCase().includes(searchLower)
      );
    }

    // Apply age filter
    if (filterState.selectedAgeOption) {
      const [min, max] = filterState.selectedAgeOption === '36+' 
        ? [36, 999]
        : filterState.selectedAgeOption.split('-').map(Number);
      
      filtered = filtered.filter(p => p.age >= min && p.age <= max);
    }

    // Apply hashkafa filter
    if (filterState.selectedHashkafa.length > 0) {
      filtered = filtered.filter(p => 
        filterState.selectedHashkafa.includes(p.hashkafa)
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
    loadProfiles();
  }, [loadProfiles]);

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

