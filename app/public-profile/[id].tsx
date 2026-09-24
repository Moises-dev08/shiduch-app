import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrivacyAwareImage } from '../../components/profile/PrivacyAwareImage';
import { getVisibleProfileImageUrl } from '../../lib/profilePictureVisibility';
import { profileService } from '../../lib/profileService';
import { supabase } from '../../lib/supabase';
import { calculateAge } from '../../lib/utils';
import { publicProfileStyles as styles } from '../../styles/publicProfile';

interface FieldPrivacyMap {
  [key: string]: boolean;
}

interface PublicProfileData {
  id: string;
  first_name: string;
  last_name: string;
  bio?: string | null;
  dob?: string | null;
  gender?: string | null;
  role?: string | null;
  hashkafa_type?: string | null;
  what_looking_for?: string | null;
  height?: string | null;
  has_children?: boolean | null;
  location_city?: string | null;
  location_state?: string | null;
  location_country?: string | null;
  languages?: string[] | null;
  nationality?: string[] | null;
  is_cohen?: boolean | null;
  torah_learning?: string | null;
  praying?: string | null;
  education_level?: string | null;
  post_high_school_path?: string | null;
  current_occupation_study?: string | null;
  plan_after_marriage?: string | null;
  marital_status?: string | null;
  dress_style?: string | null;
  wears_black_hat?: boolean | null;
  head_covering?: string | null;
  smoking?: string | null;
  alcohol_consumption?: string | null;
  pictures?: string[] | null;
  picture_privacy?: string | null;
  field_privacy?: FieldPrivacyMap | null;
  last_active_at?: string | null;
  status?: string | null;
}

function hasValue(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function formatList(value: string[] | null | undefined): string | null {
  if (!value || value.length === 0) return null;
  return value.join(', ');
}

function formatYesNo(value: boolean | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value ? 'Yes' : 'No';
}

export default function PublicProfileScreen(): React.ReactElement {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollBottomPadding =
    Math.max(insets.bottom, Platform.OS === 'web' ? 48 : 16) +
    (Platform.OS === 'web' ? 72 : 40);

  useEffect(() => {
    const load = async (): Promise<void> => {
      if (!id) {
        setError('Profile not found');
        setLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', id)
        .eq('status', 'approved')
        .maybeSingle();

      if (fetchError || !data) {
        setError('This profile is not available');
        setLoading(false);
        return;
      }

      setProfile(data as PublicProfileData);
      setLoading(false);
    };

    void load();
  }, [id]);

  const goJoin = (): void => {
    if (id) {
      AsyncStorage.setItem('pendingProfileDeepLink', id).catch(() => {});
    }
    router.push('/auth/signup');
  };

  const goLogin = (): void => {
    if (id) {
      AsyncStorage.setItem('pendingProfileDeepLink', id).catch(() => {});
    }
    router.push('/auth/login');
  };

  const isFieldPrivate = (privacyKey: string): boolean => {
    return Boolean(profile?.field_privacy?.[privacyKey]);
  };

  const renderDetailRow = (
    label: string,
    value: string | null | undefined,
    privacyKey: string
  ): React.ReactElement | null => {
    if (!hasValue(value) && !isFieldPrivate(privacyKey)) {
      return null;
    }

    // Private fields still show a row so guests know more exists after joining
    if (isFieldPrivate(privacyKey)) {
      return (
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>{label}:</Text>
          <View style={styles.privateValue}>
            <Ionicons name="lock-closed" size={14} color="#1293DA" />
            <Text style={styles.privateText}>Private — join to ask</Text>
          </View>
        </View>
      );
    }

    if (!hasValue(value)) return null;

    return (
      <View style={styles.detailRow}>
        <Text style={styles.detailLabel}>{label}:</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1293DA" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={64} color="#ccc" />
          <Text style={styles.errorTitle}>{error || 'Profile not found'}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={goJoin}>
            <Text style={styles.primaryButtonText}>Join Zivug Mishamayim</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const picturePrivacy = profile.picture_privacy || 'none';
  // A share link must not reveal a clear photo unless the owner chose Public.
  const isPhotoBlurred =
    picturePrivacy === 'private' || picturePrivacy === 'one_time';
  const showPictures = picturePrivacy === 'always' || isPhotoBlurred;
  const imageUrl = showPictures
    ? getVisibleProfileImageUrl(profile, { allowPrivateBlurred: true })
    : null;
  const allPictures =
    showPictures && Array.isArray(profile.pictures)
      ? profile.pictures.map((pic) => profileService.getImageUrl(pic))
      : [];
  const age = profile.dob ? calculateAge(profile.dob) : null;
  const location = [profile.location_city, profile.location_state, profile.location_country]
    .filter(Boolean)
    .join(', ');
  const genderLabel = profile.gender
    ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)
    : null;
  const roleLabel =
    profile.role === 'single'
      ? 'Single'
      : profile.role === 'matchmaker'
        ? 'Matchmaker'
        : profile.role;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: scrollBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.profileHeader}>
          <View style={styles.profileImageWrap}>
            {imageUrl ? (
              <>
                <PrivacyAwareImage
                  uri={imageUrl}
                  imageStyle={styles.profileImage}
                  blurred={isPhotoBlurred}
                  blurRadius={20}
                  borderRadius={50}
                />
                {isPhotoBlurred && (
                  <View style={styles.imageBlurOverlay}>
                    <Ionicons name="lock-closed" size={28} color="#fff" />
                  </View>
                )}
              </>
            ) : (
              <View style={[styles.profileImage, styles.photoPlaceholder]}>
                <Ionicons name="person" size={50} color="#ccc" />
              </View>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile.first_name} {profile.last_name}
            </Text>
            {age !== null && <Text style={styles.profileAge}>Age: {age}</Text>}
            {!!location && (
              <Text style={styles.profileLocation}>{location}</Text>
            )}
          </View>
        </View>

        {allPictures.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pictures</Text>
            <View style={styles.picturesGrid}>
              {allPictures.slice(0, 3).map((picture, index) => (
                <View key={`${picture}-${index}`} style={styles.pictureThumbnail}>
                  <PrivacyAwareImage
                    uri={picture}
                    imageStyle={styles.thumbnailImage}
                    blurred={isPhotoBlurred}
                    blurRadius={15}
                    borderRadius={10}
                  />
                  {isPhotoBlurred && (
                    <View style={styles.blurOverlay}>
                      <Ionicons name="lock-closed" size={20} color="#fff" />
                    </View>
                  )}
                </View>
              ))}
            </View>
            {picturePrivacy === 'private' && (
              <Text style={styles.pictureNote}>
                Photos are private. Join to request access.
              </Text>
            )}
            {picturePrivacy === 'one_time' && (
              <Text style={styles.pictureNote}>
                Photos can be viewed once in the app. Join to see them.
              </Text>
            )}
          </View>
        )}

        {!!profile.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{profile.bio}</Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic information</Text>
          {!!genderLabel && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gender:</Text>
              <Text style={styles.detailValue}>{genderLabel}</Text>
            </View>
          )}
          {!!roleLabel && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Role:</Text>
              <Text style={styles.detailValue}>{roleLabel}</Text>
            </View>
          )}
          {renderDetailRow(
            'Looking for',
            profile.what_looking_for,
            'what_looking_for'
          )}
          {renderDetailRow('Height', profile.height, 'height')}
          {renderDetailRow(
            'Has children',
            formatYesNo(profile.has_children),
            'hasChildren'
          )}
        </View>

        {(hasValue(profile.location_city) ||
          hasValue(profile.location_state) ||
          hasValue(profile.location_country) ||
          isFieldPrivate('location_city') ||
          isFieldPrivate('location_state') ||
          isFieldPrivate('location_country')) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Location</Text>
            {renderDetailRow('City', profile.location_city, 'location_city')}
            {renderDetailRow('State', profile.location_state, 'location_state')}
            {renderDetailRow(
              'Country',
              profile.location_country,
              'location_country'
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Languages & background</Text>
          {renderDetailRow(
            'Languages',
            formatList(profile.languages),
            'languages'
          )}
          {renderDetailRow(
            'Background',
            formatList(profile.nationality),
            'nationality'
          )}
          {profile.gender === 'male' &&
            renderDetailRow('Cohen', formatYesNo(profile.is_cohen), 'is_cohen')}
        </View>

        {(hasValue(profile.hashkafa_type) ||
          hasValue(profile.torah_learning) ||
          hasValue(profile.praying) ||
          isFieldPrivate('torahLearning') ||
          isFieldPrivate('praying')) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Religious outlook</Text>
            {!!profile.hashkafa_type && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Hashkafa:</Text>
                <Text style={styles.detailValue}>{profile.hashkafa_type}</Text>
              </View>
            )}
            {renderDetailRow(
              'Torah learning',
              profile.torah_learning,
              'torahLearning'
            )}
            {renderDetailRow('Praying', profile.praying, 'praying')}
          </View>
        )}

        {(hasValue(profile.education_level) ||
          hasValue(profile.post_high_school_path) ||
          isFieldPrivate('educationLevel')) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Education</Text>
            {renderDetailRow(
              'Education level',
              profile.education_level,
              'educationLevel'
            )}
            {!!profile.post_high_school_path && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Post-high school path:</Text>
                <Text style={styles.detailValue}>
                  {profile.post_high_school_path}
                </Text>
              </View>
            )}
          </View>
        )}

        {!!profile.current_occupation_study && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Occupation / study</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Current status:</Text>
              <Text style={styles.detailValue}>
                {profile.current_occupation_study}
              </Text>
            </View>
          </View>
        )}

        {!!profile.plan_after_marriage && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Plan after marriage</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plans:</Text>
              <Text style={styles.detailValue}>
                {profile.plan_after_marriage}
              </Text>
            </View>
          </View>
        )}

        {!!profile.marital_status && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Marital status</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={styles.detailValue}>{profile.marital_status}</Text>
            </View>
          </View>
        )}

        {(hasValue(profile.dress_style) ||
          (profile.gender === 'male' && profile.wears_black_hat !== null && profile.wears_black_hat !== undefined) ||
          (profile.gender === 'female' && hasValue(profile.head_covering))) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dress & appearance</Text>
            {!!profile.dress_style && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Dress style:</Text>
                <Text style={styles.detailValue}>{profile.dress_style}</Text>
              </View>
            )}
            {profile.gender === 'male' &&
              profile.wears_black_hat !== null &&
              profile.wears_black_hat !== undefined && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Black hat:</Text>
                  <Text style={styles.detailValue}>
                    {profile.wears_black_hat ? 'Yes' : 'No'}
                  </Text>
                </View>
              )}
            {profile.gender === 'female' && !!profile.head_covering && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Head covering:</Text>
                <Text style={styles.detailValue}>{profile.head_covering}</Text>
              </View>
            )}
          </View>
        )}

        {(hasValue(profile.smoking) || hasValue(profile.alcohol_consumption)) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lifestyle</Text>
            {!!profile.smoking && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Smoking:</Text>
                <Text style={styles.detailValue}>{profile.smoking}</Text>
              </View>
            )}
            {!!profile.alcohol_consumption && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Alcohol consumption:</Text>
                <Text style={styles.detailValue}>
                  {profile.alcohol_consumption}
                </Text>
              </View>
            )}
          </View>
        )}

        {!!profile.last_active_at && (
          <View style={styles.section}>
            <View style={styles.lastActiveContainer}>
              <Ionicons name="time-outline" size={18} color="#666" />
              <Text style={styles.lastActiveText}>
                Last active:{' '}
                {new Date(profile.last_active_at).toLocaleDateString()}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.joinCard}>
          <Text style={styles.joinTitle}>Want to connect?</Text>
          <Text style={styles.joinBody}>
            Create a free account to set up matches, ask for private info, and
            message through the app.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={goJoin}>
            <Text style={styles.primaryButtonText}>Join</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={goLogin}>
            <Text style={styles.secondaryButtonText}>
              I already have an account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
