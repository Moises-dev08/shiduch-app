import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';
import {
  getSponsorImageUrl,
  sponsorService,
  SponsoredAd,
} from '../../lib/sponsorService';
import { CARD_GAP, CARD_WIDTH, styles } from './SponsoredAdsCarousel.styles';

/** Previous builds stored hide across visits. Clear it so ads return after a reload. */
const LEGACY_HIDDEN_KEY = 'sponsored_carousel_hidden';
const SNAP_INTERVAL = CARD_WIDTH + CARD_GAP;
const AUTO_ROTATE_MS = 3000;

export default function SponsoredAdsCarousel(): React.ReactElement | null {
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const [hidden, setHidden] = useState(false);
  const [ready, setReady] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const listRef = useRef<FlatList<SponsoredAd>>(null);
  const activeIndexRef = useRef(0);

  const loadAds = useCallback(async (): Promise<void> => {
    const result = await sponsorService.getActiveAds();
    if (result.success && result.ads) {
      setAds(result.ads);
    }
  }, []);

  useEffect(() => {
    AsyncStorage.removeItem(LEGACY_HIDDEN_KEY).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async (): Promise<void> => {
        await loadAds();
        setReady(true);
      };
      void load();
      return () => {
        // Hide lasts only while this screen is open.
        setHidden(false);
      };
    }, [loadAds])
  );

  useEffect(() => {
    activeIndexRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    if (hidden || isPaused || ads.length <= 1) {
      return;
    }

    const timer = setInterval(() => {
      const nextIndex = (activeIndexRef.current + 1) % ads.length;
      activeIndexRef.current = nextIndex;
      setActiveIndex(nextIndex);
      listRef.current?.scrollToOffset({
        offset: nextIndex * SNAP_INTERVAL,
        animated: true,
      });
    }, AUTO_ROTATE_MS);

    return () => clearInterval(timer);
  }, [ads.length, hidden, isPaused]);

  const toggleHidden = (): void => {
    setHidden((current) => !current);
  };

  const onScroll = (event: NativeSyntheticEvent<NativeScrollEvent>): void => {
    const index = Math.round(event.nativeEvent.contentOffset.x / SNAP_INTERVAL);
    const clamped = Math.min(Math.max(index, 0), ads.length - 1);
    setActiveIndex(clamped);
    activeIndexRef.current = clamped;
  };

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        const index = viewableItems[0].index;
        setActiveIndex(index);
        activeIndexRef.current = index;
      }
    }
  ).current;

  const openAdLink = async (ad: SponsoredAd): Promise<void> => {
    try {
      await Linking.openURL(ad.cta_url);
    } catch (error) {
      console.error('Error opening ad link:', error);
    }
  };

  if (!ready || ads.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrapper}>
      {hidden ? (
        <View style={styles.collapsedBar}>
          <Text style={styles.collapsedLabel}>Ads</Text>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={toggleHidden}
            accessibilityLabel="Show ads"
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
              <Text style={styles.title}>Ads</Text>
            </View>
            <TouchableOpacity
              style={styles.toggleButton}
              onPress={toggleHidden}
              accessibilityLabel="Hide ads"
            >
              <Ionicons name="chevron-down" size={16} color="#666" />
              <Text style={styles.toggleText}>Hide</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            ref={listRef}
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
            onScrollBeginDrag={() => setIsPaused(true)}
            onMomentumScrollEnd={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            scrollEventThrottle={16}
            contentContainerStyle={styles.listContent}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
            getItemLayout={(_, index) => ({
              length: SNAP_INTERVAL,
              offset: SNAP_INTERVAL * index,
              index,
            })}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.85}
                onPress={() => openAdLink(item)}
                accessibilityLabel={`Open ad: ${item.title}`}
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
    </View>
  );
}
