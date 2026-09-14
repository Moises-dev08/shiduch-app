import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ConfirmationModal from '../../components/ConfirmationModal';
import InfoModal from '../../components/InfoModal';
import PromptModal from '../../components/PromptModal';
import { ProfileReport, reportService } from '../../lib/reportService';

export default function AdminReportsScreen() {
  const [reports, setReports] = useState<ProfileReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed'>('pending');
  
  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  const [promptModal, setPromptModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    onSubmit: (text: string) => void;
  }>({
    visible: false,
    title: '',
    message: '',
    onSubmit: () => {},
  });
  
  const [infoModal, setInfoModal] = useState<{
    visible: boolean;
    title: string;
    message: string;
    iconName?: keyof typeof Ionicons.glyphMap;
    iconColor?: string;
  }>({
    visible: false,
    title: '',
    message: '',
  });

  const loadReports = async () => {
    setLoading(true);
    const result = await reportService.getAllReports();
    if (result.success && result.reports) {
      setReports(result.reports);
    } else {
      setInfoModal({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to load reports',
        iconName: 'alert-circle',
        iconColor: '#F44336',
      });
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const handleUpdateStatus = async (
    reportId: string,
    status: 'reviewed' | 'dismissed' | 'actioned',
    statusLabel: string
  ) => {
    setConfirmModal({
      visible: true,
      title: `Mark as ${statusLabel}`,
      message: 'Would you like to update without notes or add notes?',
      onConfirm: async () => {
        setConfirmModal({ ...confirmModal, visible: false });
        // Update without notes
        const result = await reportService.updateReportStatus(reportId, status);
        if (result.success) {
          setInfoModal({
            visible: true,
            title: 'Success',
            message: `Report marked as ${statusLabel.toLowerCase()}`,
            iconName: 'checkmark-circle',
            iconColor: '#4CAF50',
          });
          loadReports();
        } else {
          setInfoModal({
            visible: true,
            title: 'Error',
            message: result.error || 'Failed to update report',
            iconName: 'alert-circle',
            iconColor: '#F44336',
          });
        }
      },
    });
    
    // Also show option to add notes
    setTimeout(() => {
      setConfirmModal((prev) => ({
        ...prev,
        visible: false,
      }));
      setPromptModal({
        visible: true,
        title: 'Admin Notes',
        message: 'Enter your notes (optional):',
        onSubmit: async (notes) => {
          setPromptModal({ ...promptModal, visible: false });
          const result = await reportService.updateReportStatus(reportId, status, notes || undefined);
          if (result.success) {
            setInfoModal({
              visible: true,
              title: 'Success',
              message: `Report marked as ${statusLabel.toLowerCase()}`,
              iconName: 'checkmark-circle',
              iconColor: '#4CAF50',
            });
            loadReports();
          } else {
            setInfoModal({
              visible: true,
              title: 'Error',
              message: result.error || 'Failed to update report',
              iconName: 'alert-circle',
              iconColor: '#F44336',
            });
          }
        },
      });
    }, 100);
  };

  const handleViewProfile = (profileId: string) => {
    router.push(`/admin/profile-review/${profileId}`);
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'pending') return report.status === 'pending';
    if (filter === 'reviewed') return report.status !== 'pending';
    return true;
  });

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1293DA" />
          <Text style={styles.loadingText}>Loading reports...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#666" />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Profile Reports</Text>
          <Text style={styles.subtitle}>
            {pendingCount} Pending {pendingCount === 1 ? 'Report' : 'Reports'}
          </Text>
        </View>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterButtonText, filter === 'pending' && styles.filterButtonTextActive]}>
            Pending ({pendingCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'reviewed' && styles.filterButtonActive]}
          onPress={() => setFilter('reviewed')}
        >
          <Text style={[styles.filterButtonText, filter === 'reviewed' && styles.filterButtonTextActive]}>
            Reviewed ({reports.length - pendingCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
            All ({reports.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={80} color="#4caf50" />
            <Text style={styles.emptyTitle}>No Reports</Text>
            <Text style={styles.emptyText}>
              {filter === 'pending' 
                ? 'No pending reports to review at the moment.'
                : 'No reports found with the selected filter.'}
            </Text>
          </View>
        ) : (
          filteredReports.map((report) => (
            <View key={report.id} style={styles.reportCard}>
              <View style={styles.reportHeader}>
                <View style={styles.reportInfo}>
                  <Text style={styles.reportedName}>
                    Reported: {report.reported_profile?.first_name} {report.reported_profile?.last_name}
                  </Text>
                  <Text style={styles.reporterName}>
                    By: {report.reporter?.first_name} {report.reporter?.last_name}
                  </Text>
                  <Text style={styles.reportDate}>
                    {new Date(report.created_at).toLocaleDateString()} at{' '}
                    {new Date(report.created_at).toLocaleTimeString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    report.status === 'pending' && styles.statusPending,
                    report.status === 'reviewed' && styles.statusReviewed,
                    report.status === 'dismissed' && styles.statusDismissed,
                    report.status === 'actioned' && styles.statusActioned,
                  ]}
                >
                  <Text style={styles.statusText}>
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </Text>
                </View>
              </View>

              <View style={styles.reasonsSection}>
                <Text style={styles.reasonsTitle}>Reasons:</Text>
                {report.reasons.map((reason, index) => (
                  <View key={index} style={styles.reasonItem}>
                    <Ionicons name="alert-circle" size={16} color="#f44336" />
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                ))}
              </View>

              {report.additional_details && (
                <View style={styles.detailsSection}>
                  <Text style={styles.detailsTitle}>Additional Details:</Text>
                  <Text style={styles.detailsText}>{report.additional_details}</Text>
                </View>
              )}

              {report.admin_notes && (
                <View style={styles.adminNotesSection}>
                  <Text style={styles.adminNotesTitle}>Admin Notes:</Text>
                  <Text style={styles.adminNotesText}>{report.admin_notes}</Text>
                  {report.reviewed_at && (
                    <Text style={styles.reviewedDate}>
                      Reviewed: {new Date(report.reviewed_at).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              )}

              <View style={styles.actionsSection}>
                <TouchableOpacity
                  style={styles.viewProfileButton}
                  onPress={() => handleViewProfile(report.reported_profile_id)}
                >
                  <Ionicons name="person" size={16} color="#1293DA" />
                  <Text style={styles.viewProfileText}>View Profile</Text>
                </TouchableOpacity>

                {report.status === 'pending' && (
                  <View style={styles.statusActions}>
                    <TouchableOpacity
                      style={[styles.statusButton, styles.dismissButton]}
                      onPress={() => handleUpdateStatus(report.id, 'dismissed', 'Dismissed')}
                    >
                      <Text style={styles.dismissButtonText}>Dismiss</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusButton, styles.reviewedButton]}
                      onPress={() => handleUpdateStatus(report.id, 'reviewed', 'Reviewed')}
                    >
                      <Text style={styles.reviewedButtonText}>Mark Reviewed</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusButton, styles.actionedButton]}
                      onPress={() => handleUpdateStatus(report.id, 'actioned', 'Actioned')}
                    >
                      <Text style={styles.actionedButtonText}>Take Action</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="No Notes"
        cancelText="Add Notes"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal({ ...confirmModal, visible: false })}
        iconName="document-text"
        iconColor="#1293DA"
      />

      {/* Prompt Modal */}
      <PromptModal
        visible={promptModal.visible}
        title={promptModal.title}
        message={promptModal.message}
        placeholder="Enter your notes here..."
        onSubmit={promptModal.onSubmit}
        onCancel={() => setPromptModal({ ...promptModal, visible: false })}
        iconName="create"
        iconColor="#1293DA"
      />

      {/* Info Modal */}
      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        iconName={infoModal.iconName}
        iconColor={infoModal.iconColor}
        onClose={() => setInfoModal({ visible: false, title: '', message: '' })}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
  },
  filterButtonActive: {
    backgroundColor: '#1293DA',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  filterButtonTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 8,
  },
  reportCard: {
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  reportInfo: {
    flex: 1,
  },
  reportedName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  reporterName: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
  },
  reportDate: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusPending: {
    backgroundColor: '#fff3e0',
  },
  statusReviewed: {
    backgroundColor: '#e3f2fd',
  },
  statusDismissed: {
    backgroundColor: '#f5f5f5',
  },
  statusActioned: {
    backgroundColor: '#e8f5e9',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  reasonsSection: {
    marginBottom: 12,
  },
  reasonsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  reasonText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '500',
  },
  detailsSection: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  detailsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  adminNotesSection: {
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  adminNotesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 6,
  },
  adminNotesText: {
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },
  reviewedDate: {
    fontSize: 12,
    color: '#1976d2',
    marginTop: 6,
    fontStyle: 'italic',
  },
  actionsSection: {
    gap: 12,
  },
  viewProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    gap: 6,
  },
  viewProfileText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1293DA',
  },
  statusActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  dismissButton: {
    backgroundColor: '#f5f5f5',
  },
  dismissButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  reviewedButton: {
    backgroundColor: '#e3f2fd',
  },
  reviewedButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1293DA',
  },
  actionedButton: {
    backgroundColor: '#e8f5e9',
  },
  actionedButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4caf50',
  },
});

