import { useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UNREAD_COUNT_QUERY_KEY, useUnreadNotificationsCount } from '../hooks/useUnreadNotificationsCount';
import { getNavigationTarget } from '../lib/notificationRoutes';
import { notificationService } from '../lib/notificationService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_WIDTH = SCREEN_WIDTH * 0.88;
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

interface AppNotification {
  id: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

type IconConfig = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

function getIconConfig(type?: string): IconConfig {
  switch (type) {
    case 'matchmaker_request':
    case 'matchmaker_responded':
      return { name: 'people', color: '#1293DA', bg: '#E3F2FD' };
    case 'match_accepted':
    case 'intro_accepted':
    case 'requested_responded':
      return { name: 'heart', color: '#4CAF50', bg: '#E8F5E9' };
    case 'intro_rejected':
      return { name: 'close-circle', color: '#F59E0B', bg: '#FFF8E1' };
    case 'intro_request_from_matchmaker':
      return { name: 'people', color: '#1293DA', bg: '#E3F2FD' };
    case 'suggestion':
    case 'suggestion_reverted':
      return { name: 'sparkles', color: '#F4C430', bg: '#FFFDE7' };
    case 'suggestion_rejected':
      return { name: 'close-circle', color: '#F59E0B', bg: '#FFF8E1' };
    case 'matchmaker_selected':
      return { name: 'ribbon', color: '#DAA520', bg: '#FFF8E1' };
    case 'info_request':
    case 'info_request_approved':
      return { name: 'information-circle', color: '#1293DA', bg: '#E3F2FD' };
    case 'info_request_declined':
      return { name: 'close-circle', color: '#F59E0B', bg: '#FFF8E1' };
    case 'suggestion_both_accepted':
      return { name: 'heart', color: '#4CAF50', bg: '#E8F5E9' };
    case 'profile_approved':
    case 'profile_update_approved':
      return { name: 'checkmark-circle', color: '#4CAF50', bg: '#E8F5E9' };
    case 'profile_rejected':
    case 'profile_update_rejected':
      return { name: 'close-circle', color: '#F59E0B', bg: '#FFF8E1' };
    case 'admin_new_profile':
    case 'admin_profile_resubmitted':
      return { name: 'clipboard', color: '#7C3AED', bg: '#EDE9FE' };
    case 'engagement_news':
      return { name: 'heart', color: '#E91E8C', bg: '#FCE4EC' };
    case 'engagement_proposal':
      return { name: 'diamond', color: '#DAA520', bg: '#FFF8E1' };
    case 'engagement_confirmed':
    case 'engagement_confirmed_admin':
      return { name: 'heart-circle', color: '#DAA520', bg: '#FFF8E1' };
    default:
      return { name: 'notifications', color: '#1293DA', bg: '#E3F2FD' };
  }
}

function timeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

interface NotificationPanelProps {
  visible: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ visible, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { refresh: refreshBadge } = useUnreadNotificationsCount();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();

  const PANEL_TOP = STATUS_BAR_HEIGHT + insets.top + 56;
  const PANEL_BOTTOM = insets.bottom + 16;

  const slideAnim = useRef(new Animated.Value(PANEL_WIDTH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const loadNotifications = useCallback(async () => {
    try {
      const data = await notificationService.getNotifications();
      setNotifications(data as AppNotification[]);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Animate in/out when visibility changes
  useEffect(() => {
    if (visible) {
      setLoading(true);
      loadNotifications();
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: PANEL_WIDTH,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, backdropAnim, loadNotifications]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: PANEL_WIDTH,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(backdropAnim, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      queryClient.invalidateQueries({ queryKey: UNREAD_COUNT_QUERY_KEY });
    }

    // Immediately refetch the relevant query so the data is ready by the time
    // the user lands on the destination screen (refetchQueries fires the network
    // request right away, unlike invalidateQueries which only marks as stale).
    const type = notification.data?.type as string | undefined;
    if (
      type === 'suggestion' ||
      type === 'suggestion_both_accepted' ||
      type === 'suggestion_rejected' ||
      type === 'suggestion_reverted'
    ) {
      queryClient.refetchQueries({ queryKey: ['suggestions'] });
    } else if (
      type === 'matchmaker_request' ||
      type === 'matchmaker_responded' ||
      type === 'matchmaker_selected' ||
      type === 'intro_request_from_matchmaker' ||
      type === 'intro_accepted' ||
      type === 'intro_rejected' ||
      type === 'match_accepted' ||
      type === 'requested_responded' ||
      type === 'continuation_choice'
    ) {
      queryClient.refetchQueries({ queryKey: ['intro_requests'] });
    } else if (
      type === 'info_request' ||
      type === 'info_request_approved' ||
      type === 'info_request_declined'
    ) {
      queryClient.refetchQueries({ queryKey: ['info_requests'] });
      // Also bust the specific profile's details cache so the requester
      // sees the newly approved/declined field immediately on opening the profile.
      const requestedProfileId = notification.data?.requestedProfileId;
      if (requestedProfileId) {
        queryClient.invalidateQueries({ queryKey: ['profile_details', requestedProfileId] });
      }
    } else if (
      type === 'profile_approved' ||
      type === 'profile_rejected' ||
      type === 'profile_update_approved' ||
      type === 'profile_update_rejected'
    ) {
      queryClient.refetchQueries({ queryKey: ['my_profile'] });
    }

    handleClose();
    const target = getNavigationTarget(notification.data?.type, notification.data, {
      title: notification.title,
      body: notification.body,
    });
    router.push(target as any);
  };

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead();
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    refreshBadge();
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const renderItem = ({ item }: { item: AppNotification }) => {
    const icon = getIconConfig(item.data?.type);
    return (
      <TouchableOpacity
        style={[styles.item, !item.read && styles.itemUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconWrapper, { backgroundColor: icon.bg }]}>
          <Ionicons name={icon.name} size={20} color={icon.color} />
        </View>
        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text
              style={[styles.itemTitle, !item.read && styles.itemTitleUnread]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.itemTime}>{timeAgo(item.created_at)}</Text>
          </View>
          <Text style={styles.itemBody} numberOfLines={2}>
            {item.body}
          </Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-off-outline" size={52} color="#ccc" />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtitle}>
        Updates about your matches and requests will appear here.
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      {/* Backdrop — tap to close */}
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View
          style={[
            styles.backdrop,
            { opacity: backdropAnim },
          ]}
        />
      </TouchableWithoutFeedback>

      {/* Sliding panel */}
      <Animated.View
        style={[
          styles.panel,
          {
            top: PANEL_TOP,
            bottom: PANEL_BOTTOM,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      >
        {/* Panel header */}
        <View style={styles.panelHeader}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color="#444" />
          </TouchableOpacity>
          <View style={styles.panelTitleRow}>
            <Text style={styles.panelTitle}>Notifications</Text>
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </View>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
              <Ionicons name="checkmark-done" size={14} color="#1293DA" />
              <Text style={styles.markAllText}>All read</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.markAllPlaceholder} />
          )}
        </View>

        {/* Divider */}
        <View style={styles.divider} />

        {/* List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <View style={styles.skeletonItem} />
            <View style={styles.skeletonItem} />
            <View style={styles.skeletonItem} />
          </View>
        ) : (
          <FlatList
            data={notifications}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmpty}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={['#1293DA']}
                tintColor="#1293DA"
              />
            }
            showsVerticalScrollIndicator={false}
            contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
          />
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  panel: {
    position: 'absolute',
    right: 12,
    width: PANEL_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 20,
    overflow: 'hidden',
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 14,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#282828',
  },
  headerBadge: {
    backgroundColor: '#E53935',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  markAllText: {
    fontSize: 12,
    color: '#1293DA',
    fontWeight: '600',
  },
  markAllPlaceholder: {
    width: 70,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  loadingContainer: {
    padding: 16,
    gap: 12,
  },
  skeletonItem: {
    height: 64,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: '#fff',
  },
  itemUnread: {
    backgroundColor: '#F5FAFF',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#555',
    flex: 1,
    marginRight: 6,
  },
  itemTitleUnread: {
    fontWeight: '700',
    color: '#282828',
  },
  itemTime: {
    fontSize: 11,
    color: '#aaa',
    flexShrink: 0,
  },
  itemBody: {
    fontSize: 12,
    color: '#777',
    lineHeight: 17,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#1293DA',
    flexShrink: 0,
  },
  separator: {
    height: 1,
    backgroundColor: '#f5f5f5',
    marginLeft: 68,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#444',
    marginTop: 14,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    lineHeight: 19,
  },
});
