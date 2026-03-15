import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { notificationService } from '../../lib/notificationService';
import { useUnreadNotificationsCount } from '../../hooks/useUnreadNotificationsCount';

interface AppNotification {
  id: string;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

type NotificationIconConfig = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

function getIconConfig(type?: string): NotificationIconConfig {
  switch (type) {
    case 'matchmaker_request':
      return { name: 'people', color: '#1293DA', bg: '#E3F2FD' };
    case 'matchmaker_responded':
      return { name: 'people', color: '#1293DA', bg: '#E3F2FD' };
    case 'match_accepted':
    case 'intro_accepted':
      return { name: 'heart', color: '#4CAF50', bg: '#E8F5E9' };
    case 'requested_responded':
      return { name: 'heart', color: '#4CAF50', bg: '#E8F5E9' };
    case 'intro_rejected':
      return { name: 'close-circle', color: '#F59E0B', bg: '#FFF8E1' };
    case 'intro_request_from_matchmaker':
      return { name: 'people', color: '#1293DA', bg: '#E3F2FD' };
    case 'suggestion':
    case 'suggestion_reverted':
      return { name: 'sparkles', color: '#FEE706', bg: '#FFFDE7' };
    case 'suggestion_rejected':
      return { name: 'close-circle', color: '#F59E0B', bg: '#FFF8E1' };
    case 'suggestion_both_accepted':
      return { name: 'heart', color: '#4CAF50', bg: '#E8F5E9' };
    case 'matchmaker_selected':
      return { name: 'ribbon', color: '#DAA520', bg: '#FFF8E1' };
    case 'info_request':
    case 'info_request_approved':
      return { name: 'information-circle', color: '#1293DA', bg: '#E3F2FD' };
    case 'info_request_declined':
      return { name: 'close-circle', color: '#F59E0B', bg: '#FFF8E1' };
    case 'profile_approved':
      return { name: 'checkmark-circle', color: '#4CAF50', bg: '#E8F5E9' };
    case 'profile_rejected':
      return { name: 'close-circle', color: '#F59E0B', bg: '#FFF8E1' };
    default:
      return { name: 'notifications', color: '#1293DA', bg: '#E3F2FD' };
  }
}

function getNavigationTarget(type?: string): string {
  switch (type) {
    case 'profile_approved':
    case 'profile_rejected':
      return '/(tabs)/profile';
    default:
      return '/(tabs)/connect';
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

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { refresh: refreshBadge } = useUnreadNotificationsCount();

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

  // Refresh every time the tab is focused
  useFocusEffect(
    useCallback(() => {
      loadNotifications();
    }, [loadNotifications])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handleNotificationPress = async (notification: AppNotification) => {
    // Mark as read
    if (!notification.read) {
      await notificationService.markAsRead(notification.id);
      setNotifications(prev =>
        prev.map(n => n.id === notification.id ? { ...n, read: true } : n)
      );
      refreshBadge();
    }

    // Navigate to relevant screen
    const target = getNavigationTarget(notification.data?.type);
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
          <Ionicons name={icon.name} size={22} color={icon.color} />
        </View>

        <View style={styles.itemContent}>
          <View style={styles.itemHeader}>
            <Text style={[styles.itemTitle, !item.read && styles.itemTitleUnread]} numberOfLines={1}>
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
      <Ionicons name="notifications-off-outline" size={64} color="#ccc" />
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtitle}>
        You&apos;ll see updates about your matches, intro requests, and suggestions here.
      </Text>
    </View>
  );

  const renderHeader = () => (
    <View style={styles.listHeader}>
      {unreadCount > 0 && (
        <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
          <Ionicons name="checkmark-done" size={16} color="#1293DA" />
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1293DA" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#1293DA']}
              tintColor="#1293DA"
            />
          }
          contentContainerStyle={notifications.length === 0 ? styles.emptyList : undefined}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#282828',
  },
  headerBadge: {
    marginLeft: 10,
    backgroundColor: '#1293DA',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: 'center',
  },
  headerBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeader: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    alignItems: 'flex-end',
  },
  markAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#E3F2FD',
  },
  markAllText: {
    fontSize: 13,
    color: '#1293DA',
    fontWeight: '600',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 12,
  },
  itemUnread: {
    backgroundColor: '#F0F8FF',
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 14,
    fontWeight: '500',
    color: '#444',
    flex: 1,
    marginRight: 8,
  },
  itemTitleUnread: {
    fontWeight: '700',
    color: '#282828',
  },
  itemTime: {
    fontSize: 12,
    color: '#999',
    flexShrink: 0,
  },
  itemBody: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  unreadDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#1293DA',
    flexShrink: 0,
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginLeft: 72,
  },
  emptyList: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#444',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
});
