import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { profileService } from "../../lib/profileService";
import { supabase } from "../../lib/supabase";
import { calculateAge } from "../../lib/utils";
import { FilterState, Profile } from "../../types/homeTypes";
import FilterModal from "../home/FilterModal";
import ProfileCard from "../home/ProfileCard";

interface ProfileGridSelectionModalProps {
  visible: boolean;
  currentUserGender?: string; // To show opposite gender only
  excludedProfileId?: string; // Exclude current user's profile
  onSelect: (profile: Profile) => void;
  onCancel: () => void;
}

// Local interface for database profile structure
interface DatabaseProfile {
  id: string;
  first_name: string;
  last_name: string;
  dob?: string;
  gender: "male" | "female";
  role: "single" | "matchmaker";
  hashkafa_type?: string;
  pictures?: string[];
  picture_privacy?: "none" | "always" | "private" | "one_time";
}

const DEFAULT_FILTER_STATE: FilterState = {
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
  selectedTorahLearning: [],
  selectedPraying: [],
  selectedHeadCovering: [],
  selectedPostHighSchool: [],
  wearsBlackHat: null,
};

export default function ProfileGridSelectionModal({
  visible,
  currentUserGender,
  excludedProfileId,
  onSelect,
  onCancel,
}: ProfileGridSelectionModalProps) {
  const [profiles, setProfiles] = useState<DatabaseProfile[]>([]);
  const [filteredProfiles, setFilteredProfiles] = useState<DatabaseProfile[]>(
    [],
  );
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const [filterState, setFilterState] = useState<FilterState>(DEFAULT_FILTER_STATE);

  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("profiles")
        .select(
          "id, first_name, last_name, dob, gender, role, hashkafa_type, pictures, picture_privacy, location_country, location_state, location_city, nationality, marital_status, has_children, education_level, current_occupation_study, height",
        )
        .eq("status", "approved")
        .eq("is_active", true)
        .eq("role", "single"); // Only singles can be set up

      // Exclude the current user
      if (excludedProfileId) {
        query = query.neq("id", excludedProfileId);
      }

      // Filter by opposite gender
      if (currentUserGender) {
        const oppositeGender = currentUserGender === "male" ? "female" : "male";
        query = query.eq("gender", oppositeGender);
      }

      const { data, error } = await query;

      if (error) throw error;

      setProfiles((data as DatabaseProfile[]) || []);
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setLoading(false);
    }
  }, [excludedProfileId, currentUserGender]);

  const applyFilters = useCallback(() => {
    let filtered = [...profiles];

    // Search by name
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p) =>
        `${p.first_name} ${p.last_name}`.toLowerCase().includes(query),
      );
    }

    // Age filter
    if (filterState.selectedAgeOption) {
      const [min, max] =
        filterState.selectedAgeOption === "36+"
          ? [36, 999]
          : filterState.selectedAgeOption.split("-").map(Number);

      filtered = filtered.filter((p) => {
        if (!p.dob) return false;
        const age = calculateAge(p.dob);
        return age >= min && age <= max;
      });
    } else if (filterState.exactAge !== null) {
      filtered = filtered.filter((p) => {
        if (!p.dob) return false;
        const age = calculateAge(p.dob);
        return age === filterState.exactAge;
      });
    } else if (filterState.minAge !== null || filterState.maxAge !== null) {
      filtered = filtered.filter((p) => {
        if (!p.dob) return false;
        const age = calculateAge(p.dob);
        const min = filterState.minAge ?? 0;
        const max = filterState.maxAge ?? 999;
        return age >= min && age <= max;
      });
    }

    // Location filters
    if (filterState.selectedCountries.length > 0) {
      filtered = filtered.filter((p) => {
        const country = (p as any).location_country;
        return country && filterState.selectedCountries.includes(country);
      });
    }

    if (filterState.selectedStates.length > 0) {
      filtered = filtered.filter((p) => {
        const state = (p as any).location_state;
        return state && filterState.selectedStates.includes(state);
      });
    }

    if (filterState.selectedCities.length > 0) {
      filtered = filtered.filter((p) => {
        const city = (p as any).location_city?.toLowerCase();
        return (
          city &&
          filterState.selectedCities.some((c) => city.includes(c.toLowerCase()))
        );
      });
    }

    // Hashkafa filter
    if (filterState.selectedHashkafa.length > 0) {
      filtered = filtered.filter(
        (p) =>
          p.hashkafa_type &&
          filterState.selectedHashkafa.includes(p.hashkafa_type),
      );
    }

    // Nationality filter
    if (filterState.selectedNationality.length > 0) {
      filtered = filtered.filter((p) => {
        const nationality = (p as any).nationality;
        if (!nationality || !Array.isArray(nationality)) return false;
        return filterState.selectedNationality.some((nat) =>
          nationality.includes(nat),
        );
      });
    }

    // Marital Status filter
    if (filterState.selectedMaritalStatus.length > 0) {
      filtered = filtered.filter((p) => {
        const maritalStatus = (p as any).marital_status;
        return (
          maritalStatus &&
          filterState.selectedMaritalStatus.includes(maritalStatus)
        );
      });
    }

    // Has Children filter
    if (filterState.hasChildren !== null) {
      filtered = filtered.filter((p) => {
        const hasChildren = (p as any).has_children;
        if (filterState.hasChildren === true) {
          return hasChildren === true;
        } else {
          return hasChildren === false || hasChildren === undefined;
        }
      });
    }

    // Education filter
    if (filterState.selectedEducation.length > 0) {
      filtered = filtered.filter((p) => {
        const educationLevel = (p as any).education_level;
        if (!educationLevel) return false;
        const educationLevels = educationLevel
          .split(",")
          .map((e: string) => e.trim());
        return filterState.selectedEducation.some((edu) =>
          educationLevels.includes(edu),
        );
      });
    }

    // Occupation filter
    if (filterState.selectedOccupation.length > 0) {
      filtered = filtered.filter((p) => {
        const occupation = (p as any).current_occupation_study;
        return (
          occupation && filterState.selectedOccupation.includes(occupation)
        );
      });
    }

    // Height filter
    if (
      filterState.minHeightFeet !== null ||
      filterState.minHeightInches !== null ||
      filterState.maxHeightFeet !== null ||
      filterState.maxHeightInches !== null
    ) {
      filtered = filtered.filter((p) => {
        const height = (p as any).height;
        if (!height) return false;
        const match = height.match(/(\d+)'(\d+)"/);
        if (!match) return false;
        const profileFeet = parseInt(match[1]);
        const profileInches = parseInt(match[2]);
        const profileTotalInches = profileFeet * 12 + profileInches;

        const minFeet = filterState.minHeightFeet ?? 0;
        const minInches = filterState.minHeightInches ?? 0;
        const minTotalInches = minFeet * 12 + minInches;

        const maxFeet = filterState.maxHeightFeet ?? 8;
        const maxInches = filterState.maxHeightInches ?? 11;
        const maxTotalInches = maxFeet * 12 + maxInches;

        const actualMin =
          filterState.minHeightFeet !== null ||
          filterState.minHeightInches !== null
            ? minTotalInches
            : 0;
        const actualMax =
          filterState.maxHeightFeet !== null ||
          filterState.maxHeightInches !== null
            ? maxTotalInches
            : 999;

        return (
          profileTotalInches >= actualMin && profileTotalInches <= actualMax
        );
      });
    }

    setFilteredProfiles(filtered);
  }, [profiles, searchQuery, filterState]);

  useEffect(() => {
    if (visible) {
      loadProfiles();
    }
  }, [visible, loadProfiles]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const clearFilters = () => {
    setFilterState(DEFAULT_FILTER_STATE);
    setSearchQuery("");
  };

  // Get active filters for display
  const getActiveFilters = useMemo(() => {
    const activeFilters: { label: string; removeKey: string }[] = [];

    // Age filters
    if (filterState.selectedAgeOption) {
      activeFilters.push({
        label: `Age: ${filterState.selectedAgeOption}`,
        removeKey: "selectedAgeOption",
      });
    } else if (filterState.exactAge !== null) {
      activeFilters.push({
        label: `Age: ${filterState.exactAge}`,
        removeKey: "exactAge",
      });
    } else if (filterState.minAge !== null || filterState.maxAge !== null) {
      const min = filterState.minAge ?? "";
      const max = filterState.maxAge ?? "";
      activeFilters.push({
        label: `Age: ${min}-${max}`,
        removeKey: "customAge",
      });
    }

    // Location filters
    if (filterState.selectedCountries.length > 0) {
      activeFilters.push({
        label: `Country: ${filterState.selectedCountries[0]}`,
        removeKey: "selectedCountries",
      });
    }
    if (filterState.selectedStates.length > 0) {
      filterState.selectedStates.forEach((state) => {
        activeFilters.push({
          label: `State: ${state}`,
          removeKey: `state_${state}`,
        });
      });
    }
    if (filterState.selectedCities.length > 0) {
      filterState.selectedCities.forEach((city) => {
        activeFilters.push({
          label: `City: ${city}`,
          removeKey: `city_${city}`,
        });
      });
    }

    // Hashkafa
    filterState.selectedHashkafa.forEach((hashkafa) => {
      activeFilters.push({
        label: hashkafa,
        removeKey: `hashkafa_${hashkafa}`,
      });
    });

    // Nationality
    filterState.selectedNationality.forEach((nationality) => {
      activeFilters.push({
        label: nationality,
        removeKey: `nationality_${nationality}`,
      });
    });

    // Marital Status
    filterState.selectedMaritalStatus.forEach((status) => {
      activeFilters.push({
        label: status,
        removeKey: `maritalStatus_${status}`,
      });
    });

    // Has Children
    if (filterState.hasChildren !== null) {
      activeFilters.push({
        label: filterState.hasChildren ? "Has Children" : "No Children",
        removeKey: "hasChildren",
      });
    }

    // Education
    filterState.selectedEducation.forEach((education) => {
      activeFilters.push({
        label: education,
        removeKey: `education_${education}`,
      });
    });

    // Occupation
    filterState.selectedOccupation.forEach((occupation) => {
      activeFilters.push({
        label: occupation,
        removeKey: `occupation_${occupation}`,
      });
    });

    // Height
    if (
      filterState.minHeightFeet !== null ||
      filterState.minHeightInches !== null ||
      filterState.maxHeightFeet !== null ||
      filterState.maxHeightInches !== null
    ) {
      const minHeight =
        filterState.minHeightFeet !== null &&
        filterState.minHeightInches !== null
          ? `${filterState.minHeightFeet}'${filterState.minHeightInches}"`
          : filterState.minHeightFeet !== null
            ? `${filterState.minHeightFeet}'`
            : "";
      const maxHeight =
        filterState.maxHeightFeet !== null &&
        filterState.maxHeightInches !== null
          ? `${filterState.maxHeightFeet}'${filterState.maxHeightInches}"`
          : filterState.maxHeightFeet !== null
            ? `${filterState.maxHeightFeet}'`
            : "";
      const heightLabel =
        minHeight && maxHeight
          ? `Height: ${minHeight}-${maxHeight}`
          : minHeight
            ? `Height: ${minHeight}+`
            : maxHeight
              ? `Height: up to ${maxHeight}`
              : "Height";
      activeFilters.push({ label: heightLabel, removeKey: "height" });
    }

    return activeFilters;
  }, [filterState]);

  // Remove a specific filter
  const removeFilter = (removeKey: string) => {
    const newFilterState = { ...filterState };

    if (removeKey === "selectedAgeOption") {
      newFilterState.selectedAgeOption = null;
    } else if (removeKey === "exactAge") {
      newFilterState.exactAge = null;
    } else if (removeKey === "customAge") {
      newFilterState.minAge = null;
      newFilterState.maxAge = null;
    } else if (removeKey === "selectedCountries") {
      newFilterState.selectedCountries = [];
    } else if (removeKey.startsWith("state_")) {
      const state = removeKey.replace("state_", "");
      newFilterState.selectedStates = newFilterState.selectedStates.filter(
        (s) => s !== state,
      );
    } else if (removeKey.startsWith("city_")) {
      const city = removeKey.replace("city_", "");
      newFilterState.selectedCities = newFilterState.selectedCities.filter(
        (c) => c !== city,
      );
    } else if (removeKey.startsWith("hashkafa_")) {
      const hashkafa = removeKey.replace("hashkafa_", "");
      newFilterState.selectedHashkafa = newFilterState.selectedHashkafa.filter(
        (h) => h !== hashkafa,
      );
    } else if (removeKey.startsWith("nationality_")) {
      const nationality = removeKey.replace("nationality_", "");
      newFilterState.selectedNationality =
        newFilterState.selectedNationality.filter((n) => n !== nationality);
    } else if (removeKey.startsWith("maritalStatus_")) {
      const status = removeKey.replace("maritalStatus_", "");
      newFilterState.selectedMaritalStatus =
        newFilterState.selectedMaritalStatus.filter((s) => s !== status);
    } else if (removeKey === "hasChildren") {
      newFilterState.hasChildren = null;
    } else if (removeKey.startsWith("education_")) {
      const education = removeKey.replace("education_", "");
      newFilterState.selectedEducation =
        newFilterState.selectedEducation.filter((e) => e !== education);
    } else if (removeKey.startsWith("occupation_")) {
      const occupation = removeKey.replace("occupation_", "");
      newFilterState.selectedOccupation =
        newFilterState.selectedOccupation.filter((o) => o !== occupation);
    } else if (removeKey === "height") {
      newFilterState.minHeightFeet = null;
      newFilterState.minHeightInches = null;
      newFilterState.maxHeightFeet = null;
      newFilterState.maxHeightInches = null;
    }

    setFilterState(newFilterState);
  };

  // Transform database profile to Profile type
  const transformProfile = useCallback(
    (dbProfile: DatabaseProfile): Profile => {
      const firstPicture =
        Array.isArray(dbProfile.pictures) && dbProfile.pictures.length > 0
          ? dbProfile.pictures[0]
          : "";

      return {
        id: dbProfile.id,
        first_name: dbProfile.first_name,
        last_name: dbProfile.last_name,
        name: `${dbProfile.first_name} ${dbProfile.last_name}`,
        picture: firstPicture ? profileService.getImageUrl(firstPicture) : "",
        pictures: dbProfile.pictures || [],
        location: "",
        bio: "",
        role: dbProfile.role,
        gender: dbProfile.gender,
        dob: dbProfile.dob,
        hashkafa_type: dbProfile.hashkafa_type,
        picturePrivacy: dbProfile.picture_privacy || "none",
      };
    },
    [],
  );

  const handleSelectProfile = (profile: Profile) => {
    onSelect(profile);
    clearFilters();
  };

  const handleViewProfile = (profile: Profile) => {
    onCancel(); // Close the modal first
    setTimeout(() => {
      router.push(`/profile-details?id=${profile.id}&hideActions=true`);
    }, 100);
  };

  const handleCancel = () => {
    clearFilters();
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleCancel}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleCancel}
            accessibilityLabel="Close"
            hitSlop={8}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Select a profile</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="words"
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilters(!showFilters)}
          >
            <Ionicons
              name="options"
              size={22}
              color={showFilters ? "#1293DA" : "#666"}
            />
          </TouchableOpacity>
        </View>

        {/* Active Filters Summary */}
        {getActiveFilters.length > 0 && (
          <View style={styles.filtersSummary}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filtersScrollContent}
            >
              {getActiveFilters.map((filter, index) => (
                <View key={index} style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{filter.label}</Text>
                  <TouchableOpacity
                    onPress={() => removeFilter(filter.removeKey)}
                    style={styles.filterBadgeRemove}
                  >
                    <Ionicons name="close-circle" size={16} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Results Count */}
        <View style={styles.resultsCount}>
          <Text style={styles.resultsText}>
            {filteredProfiles.length} profiles available
          </Text>
        </View>

        {/* Profile Grid */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1293DA" />
          </View>
        ) : filteredProfiles.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateTitle}>No profiles found</Text>
            <Text style={styles.emptyStateMessage}>
              Try adjusting your search or filters.
            </Text>
          </View>
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.profilesGrid}
            showsVerticalScrollIndicator={false}
          >
            {filteredProfiles.map((dbProfile) => {
              const profile = transformProfile(dbProfile);
              return (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  onPress={handleSelectProfile}
                  renderOverlay={
                    <TouchableOpacity
                      style={styles.viewPill}
                      onPress={(e) => {
                        e.stopPropagation();
                        handleViewProfile(profile);
                      }}
                      activeOpacity={0.8}
                      hitSlop={4}
                      accessibilityLabel={`View ${profile.name}'s profile`}
                    >
                      <Ionicons name="eye-outline" size={14} color="#fff" />
                    </TouchableOpacity>
                  }
                />
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Filter Modal */}
      {showFilters && (
        <FilterModal
          visible={showFilters}
          filterState={filterState}
          onClose={() => setShowFilters(false)}
          onFilterChange={setFilterState}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#222",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
  },
  filterButton: {
    padding: 8,
  },
  resultsCount: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  resultsText: {
    fontSize: 14,
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  scrollView: {
    flex: 1,
  },
  profilesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 16,
  },
  viewPill: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  emptyState: {
    width: "100%",
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
  },
  emptyStateMessage: {
    fontSize: 14,
    color: "#666",
    marginTop: 8,
    textAlign: "center",
  },
  filtersSummary: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 12,
  },
  filtersScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    gap: 6,
  },
  filterBadgeText: {
    fontSize: 13,
    color: "#333",
    fontWeight: "500",
  },
  filterBadgeRemove: {
    padding: 2,
  },
});
