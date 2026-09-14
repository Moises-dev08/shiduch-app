import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { AppTextInput } from '../../components/AppTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { adminService } from '../../lib/adminService';
import { supabase } from '../../lib/supabase';

interface AdminRow {
  id: string;
  user_id: string;
  email: string;
  is_super_admin: boolean;
  created_at: string;
}

export default function ManageAdminsScreen() {
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [adding, setAdding] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    load();
    adminService.isSuperAdmin().then(setIsSuperAdmin);
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: authData }, result] = await Promise.all([
      supabase.auth.getUser(),
      adminService.listAdmins(),
    ]);
    setCurrentUserId(authData.user?.id ?? null);
    if (result.success && result.admins) setAdmins(result.admins);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleAdd = async () => {
    const email = addEmail.trim().toLowerCase();
    if (!email) {
      Alert.alert('Email required', 'Please enter the email address of the user to promote.');
      return;
    }
    setAdding(true);
    const result = await adminService.addAdmin(email);
    setAdding(false);
    if (result.success) {
      setAddEmail('');
      setShowAddModal(false);
      await load();
      Alert.alert('Admin added', `${email} is now an admin.`);
    } else {
      Alert.alert('Error', result.error || 'Failed to add admin');
    }
  };

  const handleRemove = (admin: AdminRow) => {
    if (currentUserId && admin.user_id === currentUserId) {
      Alert.alert('Not allowed', 'You cannot remove yourself from the admin list.');
      return;
    }
    Alert.alert(
      'Remove admin',
      `Remove admin access for ${admin.email}? Their regular account will remain.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await adminService.removeAdmin(admin.id);
            if (result.success) {
              await load();
            } else {
              Alert.alert('Error', result.error || 'Failed to remove admin');
            }
          },
        },
      ]
    );
  };

  const handleDemoteSuper = (admin: AdminRow) => {
    if (!admin.is_super_admin) return;
    if (currentUserId && admin.user_id === currentUserId) {
      Alert.alert('Not allowed', 'You cannot remove your own super admin privileges.');
      return;
    }
    Alert.alert(
      'Demote super admin',
      `Remove super admin privileges from ${admin.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Demote',
          onPress: async () => {
            const result = await adminService.setSuperAdmin(admin.id, false);
            if (result.success) {
              await load();
            } else {
              Alert.alert('Error', result.error || 'Failed to update super admin status');
            }
          },
        },
      ]
    );
  };

  if (!isSuperAdmin && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Manage Admins</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.forbiddenContainer}>
          <Ionicons name="lock-closed" size={64} color="#ccc" />
          <Text style={styles.forbiddenText}>Super admin access required.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.title}>Manage Admins</Text>
        <TouchableOpacity onPress={() => setShowAddModal(true)}>
          <Ionicons name="person-add" size={24} color="#1293DA" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1293DA" />
        </View>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1293DA']} />}
          contentContainerStyle={styles.list}
        >
          {admins.map((admin) => {
            const isSelf = !!currentUserId && admin.user_id === currentUserId;
            return (
            <View key={admin.id} style={styles.adminRow}>
              <View style={styles.adminInfo}>
                <View style={styles.adminEmailRow}>
                  <Ionicons
                    name={admin.is_super_admin ? 'shield-checkmark' : 'person-circle'}
                    size={20}
                    color={admin.is_super_admin ? '#1293DA' : '#666'}
                  />
                  <Text style={styles.adminEmail} numberOfLines={1}>{admin.email}</Text>
                  {isSelf && (
                    <View style={styles.youBadge}>
                      <Text style={styles.youBadgeText}>You</Text>
                    </View>
                  )}
                  {admin.is_super_admin && (
                    <View style={styles.superBadge}>
                      <Text style={styles.superBadgeText}>Super</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.adminMeta}>
                  Added {new Date(admin.created_at).toLocaleDateString()}
                </Text>
              </View>
              {!isSelf && (
              <View style={styles.adminActions}>
                {admin.is_super_admin && (
                  <TouchableOpacity
                    style={styles.iconButton}
                    onPress={() => handleDemoteSuper(admin)}
                    accessibilityLabel="Demote super admin"
                  >
                    <Ionicons
                      name="arrow-down-circle-outline"
                      size={22}
                      color="#ff9800"
                    />
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.iconButton}
                  onPress={() => handleRemove(admin)}
                  accessibilityLabel="Remove admin"
                >
                  <Ionicons name="trash-outline" size={22} color="#f44336" />
                </TouchableOpacity>
              </View>
              )}
            </View>
            );
          })}
          {admins.length === 0 && (
            <Text style={styles.emptyText}>No admins found.</Text>
          )}
        </ScrollView>
      )}

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Admin</Text>
            <Text style={styles.modalSubtitle}>
              Enter the email of the user to promote to admin.
            </Text>
            <AppTextInput
              style={styles.input}
              placeholder="user@example.com"
              placeholderTextColor="#999"
              value={addEmail}
              onChangeText={setAddEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelBtn]}
                onPress={() => { setShowAddModal(false); setAddEmail(''); }}
                disabled={adding}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.addBtn, adding && styles.addBtnDisabled]}
                onPress={handleAdd}
                disabled={adding}
              >
                {adding ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.addBtnText}>Add</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e0e0e0',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#333' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  forbiddenContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  forbiddenText: { fontSize: 16, color: '#999', textAlign: 'center' },
  list: { padding: 16, gap: 12 },
  adminRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 12, padding: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 3, elevation: 2,
  },
  adminInfo: { flex: 1, gap: 4 },
  adminEmailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminEmail: { flex: 1, fontSize: 14, fontWeight: '600', color: '#333' },
  superBadge: {
    backgroundColor: '#1293DA', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  superBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  youBadge: {
    backgroundColor: '#eceff1', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  youBadgeText: { color: '#546e7a', fontSize: 11, fontWeight: '600' },
  adminMeta: { fontSize: 12, color: '#999' },
  adminActions: { flexDirection: 'row', gap: 8 },
  iconButton: { padding: 6 },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 15, marginTop: 40 },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 24,
  },
  modalBox: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 380 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#333', marginBottom: 8 },
  modalSubtitle: { fontSize: 14, color: '#666', marginBottom: 16, lineHeight: 20 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10,
    padding: 12, fontSize: 15, color: '#333',
    backgroundColor: '#f9f9f9', marginBottom: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#f0f0f0' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#666' },
  addBtn: { backgroundColor: '#1293DA' },
  addBtnDisabled: { backgroundColor: '#b0bec5' },
  addBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
