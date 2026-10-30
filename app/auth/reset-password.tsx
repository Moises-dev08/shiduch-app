import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppTextInput } from "../../components/AppTextInput";
import { AuthFormShell } from "../../components/auth/AuthFormShell";
import { supabase } from "../../lib/supabase";
import {
  clearPasswordRecoveryPending,
  establishRecoverySessionFromUrl,
} from "../../lib/passwordRecovery";
import { authBrandLayout } from "../../styles/authScreens";

export default function ResetPasswordScreen(): React.JSX.Element {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    let settled = false;

    const succeed = (): void => {
      if (!active || settled) return;
      settled = true;
      setVerifying(false);
    };

    const fail = (): void => {
      if (!active || settled) return;
      settled = true;
      setVerifying(false);
      Alert.alert(
        "Invalid or expired link",
        "Please request a new password reset link.",
        [
          {
            text: "OK",
            onPress: () => {
              clearPasswordRecoveryPending();
              router.replace("/auth/forgot-password");
            },
          },
        ],
      );
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) return;
      if (
        event === "PASSWORD_RECOVERY" ||
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED"
      ) {
        succeed();
      }
    });

    const run = async (): Promise<void> => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!active) return;
      if (session) {
        succeed();
        return;
      }

      if (Platform.OS === "web" && typeof window !== "undefined") {
        const established = await establishRecoverySessionFromUrl(window.location.href);
        if (!active) return;
        if (established) {
          succeed();
          return;
        }
      } else {
        // Native deep links set the session slightly after this screen mounts.
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (!active) return;
        const {
          data: { session: laterSession },
        } = await supabase.auth.getSession();
        if (laterSession) {
          succeed();
          return;
        }
      }

      fail();
    };

    void run();
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const goToLogin = async (): Promise<void> => {
    clearPasswordRecoveryPending();
    await supabase.auth.signOut();
    router.replace("/auth/login");
  };

  const togglePasswordVisibility = (): void => setShowPassword((p) => !p);
  const toggleConfirmPasswordVisibility = (): void =>
    setShowConfirmPassword((p) => !p);

  const handleResetPassword = async (): Promise<void> => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      clearPasswordRecoveryPending();
      setShowSuccess(true);
    } catch (error) {
      Alert.alert("Error", "An unexpected error occurred");
      console.error("Password reset error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <AuthFormShell style={authBrandLayout.lightContent}>
          <View style={styles.header}>
            <ActivityIndicator size="large" color="#1293DA" />
            <Text style={styles.title}>Verifying reset link</Text>
            <Text style={styles.subtitle}>Please wait...</Text>
          </View>
        </AuthFormShell>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <Modal
        visible={showSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => {
          void goToLogin();
        }}
      >
        <View style={styles.successOverlay}>
          <View style={styles.successCard}>
            <Ionicons name="checkmark-circle" size={56} color="#4caf50" />
            <Text style={styles.successTitle}>Password updated</Text>
            <Text style={styles.successMessage}>
              Your password has been reset. Sign in with your new password.
            </Text>
            <TouchableOpacity
              style={[styles.resetButton, styles.successButton]}
              onPress={() => {
                void goToLogin();
              }}
              accessibilityRole="button"
            >
              <Text style={styles.resetButtonText}>Go to login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <AuthFormShell style={authBrandLayout.lightContent}>
        <View style={styles.header}>
          <Ionicons name="key" size={60} color="#1293DA" />
          <Text style={styles.title}>Reset password</Text>
          <Text style={styles.subtitle}>Enter your new password</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <AppTextInput
              style={styles.input}
              placeholder="New password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="oneTimeCode"
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
            <Ionicons
              name="lock-closed"
              size={20}
              color="#666"
              style={styles.inputIcon}
            />
            <AppTextInput
              style={styles.input}
              placeholder="Confirm new password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              textContentType="oneTimeCode"
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
            <Text style={styles.requirementsTitle}>Password requirements:</Text>
            <View style={styles.requirementItem}>
              <Ionicons
                name={
                  password.length >= 6 ? "checkmark-circle" : "radio-button-off"
                }
                size={16}
                color={password.length >= 6 ? "#4caf50" : "#999"}
              />
              <Text
                style={[
                  styles.requirementText,
                  password.length >= 6 && styles.requirementMet,
                ]}
              >
                At least 6 characters
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons
                name={
                  password === confirmPassword && password.length > 0
                    ? "checkmark-circle"
                    : "radio-button-off"
                }
                size={16}
                color={
                  password === confirmPassword && password.length > 0
                    ? "#4caf50"
                    : "#999"
                }
              />
              <Text
                style={[
                  styles.requirementText,
                  password === confirmPassword &&
                    password.length > 0 &&
                    styles.requirementMet,
                ]}
              >
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
              <Text style={styles.resetButtonText}>Reset password</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={() => {
              clearPasswordRecoveryPending();
              router.replace("/auth/login");
            }}
          >
            <Text style={styles.backToLoginText}>
              <Ionicons name="arrow-back" size={16} color="#1293DA" /> Back to
              login
            </Text>
          </TouchableOpacity>
        </View>
      </AuthFormShell>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginTop: 8,
  },
  form: {
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
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
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  requirementsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 8,
  },
  requirementMet: {
    color: "#4caf50",
    fontWeight: "500",
  },
  resetButton: {
    backgroundColor: "#1293DA",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  resetButtonDisabled: {
    opacity: 0.6,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  footer: {
    alignItems: "center",
  },
  backToLoginText: {
    color: "#1293DA",
    fontSize: 16,
    fontWeight: "600",
  },
  successOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  successCard: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    alignItems: "center",
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    marginTop: 12,
  },
  successMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 20,
  },
  successButton: {
    alignSelf: "stretch",
    marginTop: 0,
  },
});
