import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTextInput } from '../../components/AppTextInput';
import ConfirmationModal from '../../components/ConfirmationModal';
import InfoModal from '../../components/InfoModal';
import {
  getSponsorImageUrl,
  isAdActive,
  pickSponsorImage,
  remainingDurationDays,
  sponsorService,
  SponsoredAd,
} from '../../lib/sponsorService';
import { styles } from './sponsors.styles';

interface AdFormState {
  title: string;
  ctaLabel: string;
  ctaUrl: string;
  durationDays: string;
  imageUri: string;
}

const EMPTY_FORM: AdFormState = {
  title: '',
  ctaLabel: 'Learn more',
  ctaUrl: '',
  durationDays: '7',
  imageUri: '',
};

export default function AdminSponsorsScreen(): React.ReactElement {
  const [ads, setAds] = useState<SponsoredAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formVisible, setFormVisible] = useState(false);
  const [editingAd, setEditingAd] = useState<SponsoredAd | null>(null);
  const [form, setForm] = useState<AdFormState>(EMPTY_FORM);
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

  const loadAds = useCallback(async (): Promise<void> => {
    const result = await sponsorService.getAllAds();
    if (result.success && result.ads) {
      setAds(result.ads);
    } else {
      setInfoModal({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to load sponsored ads',
        iconName: 'alert-circle',
        iconColor: '#F44336',
      });
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const load = async (): Promise<void> => {
        setLoading(true);
        await loadAds();
        setLoading(false);
      };
      void load();
    }, [loadAds])
  );

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await loadAds();
    setRefreshing(false);
  };

  const openCreate = (): void => {
    setEditingAd(null);
    setForm(EMPTY_FORM);
    setFormVisible(true);
  };

  const openEdit = (ad: SponsoredAd): void => {
    setEditingAd(ad);
    setForm({
      title: ad.title,
      ctaLabel: ad.cta_label,
      ctaUrl: ad.cta_url,
      durationDays: String(isAdActive(ad) ? Math.max(1, remainingDurationDays(ad)) : 7),
      imageUri: getSponsorImageUrl(ad.image_path),
    });
    setFormVisible(true);
  };

  const closeForm = (): void => {
    setFormVisible(false);
    setEditingAd(null);
    setForm(EMPTY_FORM);
  };

  const chooseImage = async (): Promise<void> => {
    const uri = await pickSponsorImage();
    if (uri) {
      setForm((current) => ({ ...current, imageUri: uri }));
    }
  };

  const handleSave = async (): Promise<void> => {
    const durationDays = parseInt(form.durationDays, 10);
    if (!form.title.trim() || !form.ctaLabel.trim() || !form.ctaUrl.trim()) {
      setInfoModal({
        visible: true,
        title: 'Missing fields',
        message: 'Please add a title, CTA title, and CTA link.',
        iconName: 'alert-circle',
        iconColor: '#FF9800',
      });
      return;
    }
    if (Number.isNaN(durationDays) || durationDays < 1) {
      setInfoModal({
        visible: true,
        title: 'Invalid duration',
        message: 'Duration must be at least 1 day.',
        iconName: 'alert-circle',
        iconColor: '#FF9800',
      });
      return;
    }
    if (!form.imageUri) {
      setInfoModal({
        visible: true,
        title: 'Picture required',
        message: 'Please add a picture for this sponsored ad.',
        iconName: 'image',
        iconColor: '#FF9800',
      });
      return;
    }

    setSaving(true);
    const result = editingAd
      ? await sponsorService.updateAd(editingAd.id, {
          title: form.title,
          ctaLabel: form.ctaLabel,
          ctaUrl: form.ctaUrl,
          durationDays,
          imageUri: form.imageUri,
        })
      : await sponsorService.createAd({
          title: form.title,
          ctaLabel: form.ctaLabel,
          ctaUrl: form.ctaUrl,
          durationDays,
          imageUri: form.imageUri,
        });
    setSaving(false);

    if (result.success) {
      closeForm();
      await loadAds();
    } else {
      setInfoModal({
        visible: true,
        title: 'Error',
        message: result.error || 'Failed to save sponsored ad',
        iconName: 'alert-circle',
        iconColor: '#F44336',
      });
    }
  };

  const handleDelete = (ad: SponsoredAd): void => {
    setConfirmModal({
      visible: true,
      title: 'Remove sponsored ad',
      message: `Remove "${ad.title}"? It will no longer appear on the home page.`,
      onConfirm: async () => {
        setConfirmModal((current) => ({ ...current, visible: false }));
        const result = await sponsorService.deleteAd(ad.id, ad.image_path);
        if (result.success) {
          await loadAds();
        } else {
          setInfoModal({
            visible: true,
            title: 'Error',
            message: result.error || 'Failed to remove sponsored ad',
            iconName: 'alert-circle',
            iconColor: '#F44336',
          });
        }
      },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1293DA" />
          <Text style={styles.loadingText}>Loading sponsored ads...</Text>
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
          <Text style={styles.title}>Sponsored ads</Text>
          <Text style={styles.subtitle}>
            {ads.length} {ads.length === 1 ? 'ad' : 'ads'}
          </Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openCreate}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {ads.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="megaphone-outline" size={72} color="#ccc" />
            <Text style={styles.emptyTitle}>No sponsored ads</Text>
            <Text style={styles.emptyText}>
              Add a sponsor with a picture, CTA, and duration to show it on the home page.
            </Text>
          </View>
        ) : (
          ads.map((ad) => {
            const active = isAdActive(ad);
            const daysLeft = remainingDurationDays(ad);
            return (
              <View key={ad.id} style={styles.card}>
                <Image
                  source={{ uri: getSponsorImageUrl(ad.image_path) }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{ad.title}</Text>
                  <Text style={styles.cardMeta}>{ad.cta_label}</Text>
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {ad.cta_url}
                  </Text>
                  <View style={styles.statusRow}>
                    <View
                      style={[
                        styles.badge,
                        active ? styles.badgeActive : styles.badgeExpired,
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          active ? styles.badgeTextActive : styles.badgeTextExpired,
                        ]}
                      >
                        {active ? 'Active' : 'Expired'}
                      </Text>
                    </View>
                    <Text style={styles.cardMeta}>
                      {active
                        ? `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`
                        : 'Not showing on home'}
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.cardAction}
                      onPress={() => openEdit(ad)}
                    >
                      <Ionicons name="create-outline" size={16} color="#555" />
                      <Text style={styles.cardActionText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.cardAction, styles.deleteAction]}
                      onPress={() => handleDelete(ad)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#f44336" />
                      <Text style={[styles.cardActionText, styles.deleteActionText]}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={formVisible}
        animationType="slide"
        transparent
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.formSheet}>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>
                {editingAd ? 'Edit sponsored ad' : 'Add sponsored ad'}
              </Text>
              <TouchableOpacity onPress={closeForm} accessibilityLabel="Close form">
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.formScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Picture</Text>
              <TouchableOpacity style={styles.imagePicker} onPress={chooseImage}>
                {form.imageUri ? (
                  <Image
                    source={{ uri: form.imageUri }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Ionicons name="image-outline" size={32} color="#aaa" />
                    <Text style={styles.imagePlaceholderText}>Add picture</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={styles.label}>Title</Text>
              <AppTextInput
                style={styles.input}
                value={form.title}
                onChangeText={(title) => setForm((current) => ({ ...current, title }))}
                placeholder="Sponsor name"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>CTA title</Text>
              <AppTextInput
                style={styles.input}
                value={form.ctaLabel}
                onChangeText={(ctaLabel) =>
                  setForm((current) => ({ ...current, ctaLabel }))
                }
                placeholder="Learn more"
                placeholderTextColor="#aaa"
              />

              <Text style={styles.label}>CTA link</Text>
              <AppTextInput
                style={styles.input}
                value={form.ctaUrl}
                onChangeText={(ctaUrl) => setForm((current) => ({ ...current, ctaUrl }))}
                placeholder="https://example.com"
                placeholderTextColor="#aaa"
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <Text style={styles.label}>Duration (days)</Text>
              <AppTextInput
                style={styles.input}
                value={form.durationDays}
                onChangeText={(durationDays) =>
                  setForm((current) => ({ ...current, durationDays }))
                }
                placeholder="7"
                placeholderTextColor="#aaa"
                keyboardType="number-pad"
              />

              <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>
                    {editingAd ? 'Save changes' : 'Add sponsored ad'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <ConfirmationModal
        visible={confirmModal.visible}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Remove"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((current) => ({ ...current, visible: false }))}
        iconName="trash"
        iconColor="#F44336"
      />

      <InfoModal
        visible={infoModal.visible}
        title={infoModal.title}
        message={infoModal.message}
        onClose={() => setInfoModal((current) => ({ ...current, visible: false }))}
        iconName={infoModal.iconName}
        iconColor={infoModal.iconColor}
      />
    </SafeAreaView>
  );
}
