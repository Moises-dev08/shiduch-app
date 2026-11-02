import { Ionicons } from "@expo/vector-icons";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  Modal,
  ScrollView,
  type ScrollViewInstance,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface HowItWorksCarouselProps {
  visible: boolean;
  onClose: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const slides = [
  {
    icon: "person-add" as const,
    color: "#4CAF50",
    title: "Create Your Profile",
    description:
      "Sign up and create your detailed profile. Add your photos, preferences, and what you're looking for in a match.",
  },
  {
    icon: "search" as const,
    color: "#2196F3",
    title: "Browse Profiles",
    description:
      "Explore profiles of potential matches. Filter by age, location, and other preferences to find your perfect match.",
  },
  {
    icon: "heart" as const,
    color: "#DAA520",
    title: "Make a Suggestion",
    description:
      "Found someone interesting? Send them a suggestion! You can also ask for more information before deciding.",
  },
  {
    icon: "people" as const,
    color: "#1293DA",
    title: "Work with Matchmakers",
    description:
      "Connect with matchmaker/shadchan who can help guide you through the process and make introductions.",
  },
  {
    icon: "chatbubbles" as const,
    color: "#FF9800",
    description:
      "When both parties accept, choose how to proceed - by yourselves or with a matchmaker/shadchan to facilitate.",
    title: "Connect & Continue",
  },
  {
    icon: "star" as const,
    color: "#FFC107",
    title: "Find Your Match",
    description:
      "Get connected with your match and start your journey together. Your matchmaker is here to support you every step of the way.",
  },
];

export default function HowItWorksCarousel({
  visible,
  onClose,
}: HowItWorksCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef<ScrollViewInstance>(null);

  const handleScroll = (event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const newIndex = Math.round(contentOffsetX / SCREEN_WIDTH);
    setCurrentIndex(newIndex);
  };

  const goToSlide = (index: number) => {
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true,
    });
    setCurrentIndex(index);
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      goToSlide(currentIndex + 1);
    } else {
      onClose();
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      goToSlide(currentIndex - 1);
    }
  };

  const handleClose = () => {
    setCurrentIndex(0);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>How It Works</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
        </View>

        {/* Carousel */}
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          style={styles.scrollView}
        >
          {slides.map((slide, index) => (
            <View key={index} style={styles.slide}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: slide.color + "20" },
                ]}
              >
                <Ionicons name={slide.icon} size={80} color={slide.color} />
              </View>
              <Text style={styles.slideTitle}>{slide.title}</Text>
              <Text style={styles.slideDescription}>{slide.description}</Text>
              <Text style={styles.slideNumber}>
                Step {index + 1} of {slides.length}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {slides.map((_, index) => (
            <TouchableOpacity
              key={index}
              onPress={() => goToSlide(index)}
              style={[styles.dot, currentIndex === index && styles.activeDot]}
            />
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.navigation}>
          {currentIndex > 0 && (
            <TouchableOpacity onPress={handlePrevious} style={styles.navButton}>
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleNext}
            style={[
              styles.navButton,
              currentIndex === slides.length - 1 && styles.getStartedButton,
            ]}
          >
            <Text
              style={[
                styles.navButtonText,
                currentIndex === slides.length - 1 && styles.getStartedButtonText,
              ]}
            >
              {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
            </Text>
            <Ionicons
              name={
                currentIndex === slides.length - 1
                  ? "checkmark"
                  : "arrow-forward"
              }
              size={24}
              color={currentIndex === slides.length - 1 ? "#fff" : "#007AFF"}
            />
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingTop: 60,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
  },
  slideTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
    marginBottom: 20,
  },
  slideDescription: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  slideNumber: {
    fontSize: 14,
    color: "#999",
    marginTop: 30,
    fontWeight: "600",
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ccc",
  },
  activeDot: {
    width: 24,
    backgroundColor: "#007AFF",
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  navButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
  },
  getStartedButton: {
    backgroundColor: "#1293DA",
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  navButtonText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "600",
  },
  getStartedButtonText: {
    color: "#fff",
  },
});
