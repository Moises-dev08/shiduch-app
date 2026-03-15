import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Dimensions, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';

const { width, height } = Dimensions.get('window');

interface EngagementCelebrationProps {
  visible: boolean;
  coupleName1: string;
  coupleName2: string;
  onClose: () => void;
}

export default function EngagementCelebration({ 
  visible, 
  coupleName1, 
  coupleName2, 
  onClose 
}: EngagementCelebrationProps) {
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (visible && confettiRef.current) {
      // Start the confetti
      confettiRef.current.start();
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      // Auto close after 8 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 8000);

      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Confetti Effect */}
        <ConfettiCannon
          ref={confettiRef}
          count={200}
          origin={{ x: width / 2, y: -10 }}
          autoStart={false}
          fadeOut={true}
          fallSpeed={3000}
          colors={['#FFD700', '#FF69B4', '#7ACDF5', '#98FB98', '#DDA0DD', '#F0E68C', '#FFA500', '#FF6B9D']}
        />

        {/* Close button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Ionicons name="close-circle" size={32} color="#fff" />
        </TouchableOpacity>

        {/* Celebration content */}
        <View style={styles.content}>
          <View style={styles.celebrationCard}>
            <Text style={styles.mazelTovEmoji}>💍</Text>
            <Text style={styles.mazelTovText}>Mazel Tov!</Text>
            <Text style={styles.toText}>to</Text>
            <Text style={styles.coupleName}>{coupleName1}</Text>
            <Text style={styles.andText}>&</Text>
            <Text style={styles.coupleName}>{coupleName2}</Text>
            <View style={styles.heartsContainer}>
              <Text style={styles.heartEmoji}>💕</Text>
              <Text style={styles.heartEmoji}>✨</Text>
              <Text style={styles.heartEmoji}>💕</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  celebrationCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
    maxWidth: width * 0.85,
  },
  mazelTovEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  mazelTovText: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#DAA520',
    marginBottom: 8,
    textShadowColor: 'rgba(218, 165, 32, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  toText: {
    fontSize: 20,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  coupleName: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginVertical: 4,
    textAlign: 'center',
  },
  andText: {
    fontSize: 24,
    color: '#DAA520',
    marginVertical: 8,
    fontWeight: '600',
  },
  heartsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  heartEmoji: {
    fontSize: 32,
  },
});
