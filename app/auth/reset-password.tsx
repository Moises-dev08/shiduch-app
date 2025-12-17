import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function ResetPasswordScreen() {
  const params = useLocalSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayPassword, setDisplayPassword] = useState('');
  const [displayConfirmPassword, setDisplayConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  // Handle the token from the email link
  useEffect(() => {
    const handlePasswordReset = async () => {
      // Check if we have access_token and refresh_token in the URL params
      // These are provided by Supabase when the user clicks the email link
      const accessToken = params.access_token as string | undefined;
      const refreshToken = params.refresh_token as string | undefined;
      const type = params.type as string | undefined;

      // If we have tokens from the email link, exchange them for a session
      if (accessToken && refreshToken && type === 'recovery') {
        setVerifying(true);
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            Alert.alert(
              'Invalid Link',
              'This password reset link is invalid or has expired. Please request a new one.',
              [
                {
                  text: 'OK',
                  onPress: () => router.replace('/auth/forgot-password'),
                },
              ]
            );
            return;
          }

          // Session is now set, user can reset password
          setVerifying(false);
        } catch (error) {
          console.error('Error setting session:', error);
          Alert.alert(
            'Error',
            'Failed to verify reset link. Please try again.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/auth/forgot-password'),
              },
            ]
          );
        }
      } else {
        // No tokens in URL - check if user already has a valid session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          Alert.alert(
            'No Reset Link',
            'Please use the link from your email to reset your password.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/auth/forgot-password'),
              },
            ]
          );
          return;
        }
        setVerifying(false);
      }
    };

    handlePasswordReset();
  }, [params]);

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (!showPassword) {
      setDisplayPassword('•'.repeat(text.length));
    } else {
      setDisplayPassword(text);
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (!showConfirmPassword) {
      setDisplayConfirmPassword('•'.repeat(text.length));
    } else {
      setDisplayConfirmPassword(text);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
    if (showPassword) {
      setDisplayPassword('•'.repeat(password.length));
    } else {
      setDisplayPassword(password);
    }
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
    if (showConfirmPassword) {
      setDisplayConfirmPassword('•'.repeat(confirmPassword.length));
    } else {
      setDisplayConfirmPassword(confirmPassword);
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      Alert.alert(
        'Success',
        'Your password has been reset successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)'),
          },
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'An unexpected error occurred');
      console.error('Password reset error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <ActivityIndicator size="large" color="#03a9f4" />
            <Text style={styles.title}>Verifying Reset Link</Text>
            <Text style={styles.subtitle}>Please wait...</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons name="key" size={60} color="#03a9f4" />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Enter your new password</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="New Password"
              value={displayPassword}
              onChangeText={handlePasswordChange}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              editable={!loading}
            />
            <TouchableOpacity 
              onPress={togglePasswordVisibility}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              value={displayConfirmPassword}
              onChangeText={handleConfirmPasswordChange}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              editable={!loading}
            />
            <TouchableOpacity 
              onPress={toggleConfirmPasswordVisibility}
              style={styles.eyeIcon}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-off" : "eye"} 
                size={20} 
                color="#666" 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.passwordRequirements}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirementItem}>
              <Ionicons 
                name={password.length >= 6 ? "checkmark-circle" : "radio-button-off"} 
                size={16} 
                color={password.length >= 6 ? "#4caf50" : "#999"} 
              />
              <Text style={[styles.requirementText, password.length >= 6 && styles.requirementMet]}>
                At least 6 characters
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons 
                name={password === confirmPassword && password.length > 0 ? "checkmark-circle" : "radio-button-off"} 
                size={16} 
                color={password === confirmPassword && password.length > 0 ? "#4caf50" : "#999"} 
              />
              <Text style={[styles.requirementText, password === confirmPassword && password.length > 0 && styles.requirementMet]}>
                Passwords match
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={[styles.resetButton, loading && styles.resetButtonDisabled]} 
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.resetButtonText}>Reset Password</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity onPress={() => router.replace('/auth/login')}>
            <Text style={styles.backToLoginText}>
              <Ionicons name="arrow-back" size={16} color="#03a9f4" /> Back to Login
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
  },
  eyeIcon: {
    padding: 4,
  },
  passwordRequirements: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 8,
  },
  requirementMet: {
    color: '#4caf50',
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: '#03a9f4',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    alignItems: 'center',
  },
  backToLoginText: {
    color: '#03a9f4',
    fontSize: 16,
    fontWeight: '600',
  },
});

