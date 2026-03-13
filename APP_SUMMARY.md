# Shiduchim App - Brief Summary

## Overview
A matchmaking mobile application designed for the Jewish community, built with React Native and Expo. The app connects singles through matchmakers and facilitates the shidduch (matchmaking) process with privacy controls and organized communication.

---

## Core Features

### 👤 User Profiles
- **Comprehensive Profile System**: Personal information, photos, religious background, education, family details
- **Privacy Controls**: Field-level privacy settings ("Ask Me" feature for sensitive information)
- **Photo Privacy Options**: 
  - Open (always visible)
  - One-time view
  - Private (hidden)
  - No photo
- **Profile Approval System**: Admin review before profiles go live
- **User Roles**: Singles, Matchmakers, and Admins

### 🔍 Search & Filter
- **Advanced Filtering**: Age range, location, religious observance, education level, family background
- **Gender-Specific Filters**: 
  - Males: Yeshiva path, Torah learning, praying habits
  - Females: Seminary options, post-high school path
- **"Ask Me" Filter**: Find profiles with private fields you can inquire about
- **One-Time Photo Filter**: Filter by photo privacy settings
- **Smart Sorting Options**:
  - Newest to oldest
  - Oldest to newest
  - Youngest to oldest
  - Pictures to no pictures (open → one-time → private → none)
  - No pictures to pictures (reverse order)

### 💑 Matchmaking Process
- **Profile Selection**: Browse and select profiles for potential matches
- **Match Suggestions**: Propose matches between two profiles
- **Info Requests**: Request additional information about private fields
- **Two-Way Interest System**: Both parties must accept to proceed
- **Continuation Choices**: 
  - Continue by themselves (direct contact)
  - Continue with matchmaker as intermediary
- **Smart Routing**: If one side chooses matchmaker, both proceed with matchmaker
- **Previous Match Warning**: 
  - Alerts when suggesting a previously attempted match
  - Shows who wasn't interested or if both were interested
  - Allows continuing despite past attempts

### 💍 Engagement Management
- **Engagement Proposal System**: Mark couples as engaged
- **Two-Party Confirmation**: Both sides must confirm
- **Engagement Celebrations**: 
  - Confetti animation for all users (except the couple)
  - "Mazal Tov" message with couple's names
  - Displays once per user when opening app
  - Auto-closes after 8 seconds
- **Elegant Gold Theme**: Beautiful UI for engagement celebrations
- **Undo Feature**: Ability to reverse engagement status if needed

### 📱 Communication & Notifications
- **Realtime Updates**: Live notifications for match responses, info requests, engagements
- **In-App Messaging**: Communication between matchmakers and singles
- **Status Tracking**: Monitor pending requests, accepted matches, rejections
- **Matchmaker Dashboard**: View all active suggestions and requests

### 🔐 Privacy & Security
- **Field-Level Privacy**: Control visibility of any profile field
- **Photo Protection**: Multiple privacy levels for photos
- **Secure Authentication**: Supabase auth integration
- **Role-Based Access**: Different permissions for singles, matchmakers, admins

### 📊 Profile Management
- **My Profiles Tab**: View and manage your own profiles
- **Status Indicators**: Approved, pending, rejected profiles
- **Edit Capabilities**: Update profile information
- **Multiple Profile Support**: Create profiles for others (with proper permissions)

### 🎯 Successful Matches Tracking
- **Match History**: View all successful matches
- **Engagement Records**: Track couples who got engaged
- **Past Suggestion Database**: Historical record of all match attempts
- **Success Analytics**: Monitor matchmaking outcomes

---

## Technical Highlights
- **Platform**: React Native with Expo Router
- **Database**: Supabase (PostgreSQL with realtime subscriptions)
- **Storage**: AsyncStorage for client-side data persistence
- **Animations**: React Native Animated API & react-native-confetti-cannon
- **Architecture**: Modular service-based architecture (profileService, suggestionService, introService, engagementService)
- **State Management**: React hooks with custom hooks for realtime data

---

## User Roles

### Singles
- Create and manage their profile
- Respond to match suggestions
- Respond to info requests
- View potential matches
- Mark engagements

### Matchmakers
- Browse all approved profiles
- Suggest matches between profiles
- Request additional information
- Facilitate communication between parties
- Track success rates

### Admins
- Approve/reject profiles
- Manage users
- Oversee platform activity
- System configuration

---

*Last Updated: February 2026*

