import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  getSponsorImageUrl,
  sponsorService,
  SponsoredAd,
} from '../../lib/sponsorService';
import SponsoredAdModal from './SponsoredAdModal';
import { CARD_GAP, CARD_WIDTH, styles } from './SponsoredAdsCarousel.styles';

const HIDDEN_KEY = 'sponsored_carousel_hidden';
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;

export default function SponsoredAdsCarousel(): React.ReactElement | null {
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [selectedAd, setSelectedAd] = useState<SponsoredAd | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const loadAds = useCallback(async (): Promise<void> => {
    const result = await sponsorService.getActiveAds();
    if (result.success && result.ads) {
      setAds(result.ads);
    }
  }, []);

  useEffect(() => {
    const loadHidden = async (): Promise<void> => {
      try {
        const stored = await AsyncStorage.getItem(HIDDEN_KEY);
        setHidden(stored === 'true');
      } catch (error) {
        console.error('Error reading sponsored carousel preference:', error);
      }
    };
    void loadHidden();
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async (): Promise<void> => {
        await loadAds();
        setReady(true);
      };
      void load();
    }, [loadAds])
  );

  const toggleHidden = async (): Promise<void> => {
    const next = !hidden;
    setHidden(next);
    try {
      await AsyncStorage.setItem(HIDDEN_KEY, next ? 'true' : 'false');
    } catch (error) {
      console.error('Error saving sponsored carousel preference:', error);
    }
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    setActiveIndex(Math.min(Math.max(index, 0), ads.length - 1));
  };

  if (!ready || ads.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {hidden ? (
        <View style={styles.collapsedBar}>
          <Text style={styles.collapsedLabel}>Sponsored</Text>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={toggleHidden}
            accessibilityLabel="Show sponsored ads"
          >
            <Ionicons name="chevron-up" size={16} color="#666" />
            <Text style={styles.toggleText}>Show</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="pricetag-outline" size={14} color="#888" />
              <Text style={styles.title}>Sponsored</Text>
            </View>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleHidden}
              accessibilityLabel="Hide sponsored ads"
            >
              <Ionicons name="chevron-down" size={16} color="#666" />
              <Text style={styles.toggleText}>Hide</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            style={styles.list}
            data={ads}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            snapToInterval={SNAP_INTERVAL}
            snapToAlignment="start"
            decelerationRate="fast"
            disableIntervalMomentum
            onScroll={onScroll}
            scrollEventThrottle={16}
            contentContainerStyle={styles.listContent}
            getItemLayout={(_, index) => ({
              length: SNAP_INTERVAL,
              offset: SNAP_INTERVAL * index,
              index,
            })}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => setSelectedAd(item)}
                accessibilityLabel={`Sponsored: ${item.title}`}
              >
                <View style={styles.cardImageWrap}>
                  <Image
                    source={{ uri: getSponsorImageUrl(item.image_path) }}
                    style={styles.cardImage}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
              </TouchableOpacity>
            )}
          />

          {ads.length > 1 && (
            <View style={styles.dots}>
              {ads.map((ad, index) => (
                <View
                  key={ad.id}
                  style={[styles.dot, index === activeIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}
        </>
      )}

      <SponsoredAdModal
        visible={selectedAd !== null}
        ad={selectedAd}
        onClose={() => setSelectedAd(null)}
      />
    </View>
  );
}
