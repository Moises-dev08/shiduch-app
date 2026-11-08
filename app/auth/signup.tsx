import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppTextInput } from "../../components/AppTextInput";
import { AuthFormShell } from "../../components/auth/AuthFormShell";
import TermsModal from "../../components/TermsModal";
import { supabase } from "../../lib/supabase";
import { authBrandLayout } from "../../styles/authScreens";

interface SignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

interface SignupNotice {
  title: string;
  message: string;
  buttonText: string;
  goToLogin: boolean;
}

const EXISTING_EMAIL_NOTICE: SignupNotice = {
  title: "This email already has an account",
  message:
    "Sign in with this email, or enter a different one to create a new account.",
  buttonText: "Go to login",
  goToLogin: true,
};

function readAuthError(error: unknown): {
  message: string;
  code: string;
  status?: number;
} {
  if (typeof error !== "object" || error === null) {
    return { message: "", code: "" };
  }

  const record = error as {
    message?: unknown;
    code?: unknown;
    status?: unknown;
  };

  return {
    message: typeof record.message === "string" ? record.message : "",
    code: typeof record.code === "string" ? record.code : "",
    status: typeof record.status === "number" ? record.status : undefined,
  };
}

function isExistingAccountError(error: unknown): boolean {
  const { message, code, status } = readAuthError(error);
  const normalized = message.toLowerCase();
  const normalizedCode = code.toLowerCase();
  return (
    normalizedCode === "user_already_exists" ||
    normalizedCode === "email_exists" ||
    normalized.includes("already registered") ||
    normalized.includes("already been registered") ||
    normalized.includes("user already exists") ||
    normalized.includes("email address is already") ||
    (status === 422 && normalized.includes("already"))
  );
}

function isExistingAccountUser(
  user: { identities?: unknown[] | null } | null,
): boolean {
  return Array.isArray(user?.identities) && user.identities.length === 0;
}

export default function SignupScreen(): React.JSX.Element {
  const [formData, setFormData] = useState<SignupFormData>({
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [notice, setNotice] = useState<SignupNotice | null>(null);
  const [loading, setLoading] = useState(false);

  const handleInputChange = (
    field: keyof SignupFormData,
    value: string,
  ): void => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const togglePasswordVisibility = (): void => setShowPassword((prev) => !prev);
  const toggleConfirmPasswordVisibility = (): void =>
    setShowConfirmPassword((prev) => !prev);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSignup = (): void => {
    const { email, password, confirmPassword } = formData;

    if (!email || !password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    if (!validateEmail(email.trim())) {
      Alert.alert("Invalid email", "Please enter a valid email address");
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

    setShowTermsModal(true);
  };

  const handleAcceptTerms = async (): Promise<void> => {
    setShowTermsModal(false);
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email.trim(),
        password: formData.password,
      });

      if (error) {
        setNotice(
          isExistingAccountError(error)
            ? EXISTING_EMAIL_NOTICE
            : {
                title: "Signup failed",
                message: error.message || "An unexpected error occurred",
                buttonText: "OK",
                goToLogin: false,
              },
        );
        return;
      }

      if (isExistingAccountUser(data.user)) {
        setNotice(EXISTING_EMAIL_NOTICE);
        return;
      }

      let session = data.session;
      if (!session) {
        const { data: refreshed } = await supabase.auth.getSession();
        session = refreshed.session;
      }

      if (session) {
        router.replace("/(tabs)/profile");
      } else if (data.user) {
        Alert.alert(
          "Verify your email",
          "Please check your email to verify your account before logging in.",
          [{ text: "OK", onPress: () => router.replace("/auth/login") }],
        );
      }
    } catch (error) {
      console.error("Signup error:", error);
      setNotice(
        isExistingAccountError(error)
          ? EXISTING_EMAIL_NOTICE
          : {
              title: "Signup failed",
              message: "An unexpected error occurred",
              buttonText: "OK",
              goToLogin: false,
            },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={["#7ACDF5", "#1293DA", "#0d3b8e"]}
      locations={[0, 0.45, 1]}
      style={styles.gradient}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentContainerStyle={authBrandLayout.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <AuthFormShell style={authBrandLayout.scrollInner}>
            <View style={styles.header}>
              <Image
                source={require("../../logo-original.png")}
                style={authBrandLayout.logo}
                contentFit="contain"
              />
              <Text style={styles.title}>Create your account</Text>
              <Text style={styles.subtitle}>Join our community</Text>
            </View>

            <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="mail"
                  size={20}
                  color="#1293DA"
                  style={styles.inputIcon}
                />
                <AppTextInput
                  style={styles.input}
                  placeholder="Email"
                  placeholderTextColor="#aaa"
                  value={formData.email}
                  onChangeText={(value) => handleInputChange("email", value)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color="#1293DA"
                  style={styles.inputIcon}
                />
                <AppTextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#aaa"
                  value={formData.password}
                  onChangeText={(value) => handleInputChange("password", value)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  secureTextEntry={!showPassword}
                  textContentType="oneTimeCode"
                />
                <TouchableOpacity
                  onPress={togglePasswordVisibility}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#1293DA"
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="lock-closed"
                  size={20}
                  color="#1293DA"
                  style={styles.inputIcon}
                />
                <AppTextInput
                  style={styles.input}
                  placeholder="Confirm password"
                  placeholderTextColor="#aaa"
                  value={formData.confirmPassword}
                  onChangeText={(value) =>
                    handleInputChange("confirmPassword", value)
                  }
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="off"
                  secureTextEntry={!showConfirmPassword}
                  textContentType="oneTimeCode"
                />
                <TouchableOpacity
                  onPress={toggleConfirmPasswordVisibility}
                  style={styles.eyeIcon}
                >
                  <Ionicons
                    name={showConfirmPassword ? "eye-off" : "eye"}
                    size={20}
                    color="#1293DA"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.signupButton, loading && styles.buttonDisabled]}
                onPress={handleSignup}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#282828" />
                ) : (
                  <Text style={styles.signupButtonText}>Create account</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push("/auth/login")}>
                <Text style={styles.loginLink}>Login here</Text>
              </TouchableOpacity>
            </View>
          </AuthFormShell>
        </ScrollView>
      </KeyboardAvoidingView>

      <TermsModal
        visible={showTermsModal}
        onAccept={handleAcceptTerms}
        onDecline={() => setShowTermsModal(false)}
      />
      {notice ? (
        <View style={styles.noticeOverlay}>
          <View style={styles.noticeCard}>
            <View style={styles.noticeIcon}>
              <Ionicons name="mail" size={48} color="#1293DA" />
            </View>
            <Text style={styles.noticeTitle}>{notice.title}</Text>
            <Text style={styles.noticeMessage}>{notice.message}</Text>
            <TouchableOpacity
              style={styles.noticeButton}
              onPress={() => {
                const shouldGoToLogin = notice.goToLogin;
                setNotice(null);
                if (shouldGoToLogin) {
                  router.replace("/auth/login");
                }
              }}
            >
              <Text style={styles.noticeButtonText}>{notice.buttonText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  noticeOverlay: {
    ...StyleSheet.absoluteFillObject,
    ...(Platform.OS === "web" ? { position: "fixed" as const } : null),
    zIndex: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noticeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  noticeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(18, 147, 218, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  noticeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 12,
  },
  noticeMessage: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 24,
  },
  noticeButton: {
    width: "100%",
    paddingVertical: 14,
    borderRadius: 8,
    backgroundColor: "#1293DA",
    alignItems: "center",
    justifyContent: "center",
  },
  noticeButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  container: {
    flex: 1,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
  },
  form: {
    marginBottom: 28,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    marginBottom: 14,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 16,
    color: "#282828",
  },
  eyeIcon: {
    padding: 4,
  },
  signupButton: {
    backgroundColor: "#FEE706",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signupButtonText: {
    color: "#282828",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
  },
  loginLink: {
    color: "#FEE706",
    fontSize: 14,
    fontWeight: "bold",
  },
});
