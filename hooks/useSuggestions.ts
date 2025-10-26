import { useState } from 'react';
import { Alert } from 'react-native';
import { Profile as DBProfile } from '../lib/profileService';
import { suggestionService } from '../lib/suggestionService';

interface Profile {
  id: string;
  name: string;
  [key: string]: any;
}

export function useSuggestions(
  currentUserProfile: DBProfile | null,
  selectedProfile: Profile | null
) {
  const [showSetupConfirmModal, setShowSetupConfirmModal] = useState(false);
  const [showNoMatchmakerModal, setShowNoMatchmakerModal] = useState(false);
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);
  const [isSubmittingInfoRequest, setIsSubmittingInfoRequest] = useState(false);

  // Handle Setup button press
  const handleSetupPress = () => {
    if (!currentUserProfile || !selectedProfile) return;
    
    // Check if user is single
    if (currentUserProfile.role !== 'single') {
      Alert.alert('Not Available', 'Only single users can create setup suggestions.');
      return;
    }
    
    // Check if user has matchmaker associated
    if (!currentUserProfile.matchmaker_id) {
      setShowNoMatchmakerModal(true);
      return;
    }
    
    // Show confirmation modal
    setShowSetupConfirmModal(true);
  };

  // Handle confirmed setup suggestion
  const handleConfirmSetup = async () => {
    if (!selectedProfile || !currentUserProfile) return;
    
    setIsSubmittingSuggestion(true);
    
    const result = await suggestionService.createSuggestion(
      selectedProfile.id,
      currentUserProfile.matchmaker_id || undefined
    );
    
    setIsSubmittingSuggestion(false);
    setShowSetupConfirmModal(false);
    
    if (result.success) {
      Alert.alert(
        'Success',
        `Your suggestion for ${selectedProfile.name} has been sent to your matchmaker.`,
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to send suggestion');
    }
  };

  // Handle Ask for Info button press
  const handleAskForInfo = async () => {
    if (!selectedProfile) return;
    
    setIsSubmittingInfoRequest(true);
    
    const result = await suggestionService.createInfoRequest(selectedProfile.id);
    
    setIsSubmittingInfoRequest(false);
    
    if (result.success) {
      Alert.alert(
        'Request Sent',
        'Your request for more information has been sent to this profile.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert('Error', result.error || 'Failed to send request');
    }
  };

  return {
    showSetupConfirmModal,
    setShowSetupConfirmModal,
    showNoMatchmakerModal,
    setShowNoMatchmakerModal,
    isSubmittingSuggestion,
    isSubmittingInfoRequest,
    handleSetupPress,
    handleConfirmSetup,
    handleAskForInfo,
  };
}

