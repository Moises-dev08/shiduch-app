import { router } from 'expo-router';
import { useEffect } from 'react';
import { adminService } from '../lib/adminService';
import { useAuth } from '../lib/AuthContext';
import { profileService } from '../lib/profileService';

export default function Index() {
  const { session, loading: authLoading } = useAuth();

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!authLoading) {
        if (session) {
          console.log('User is logged in, checking admin status...');
          
          // Check if user is an admin first
          const isAdmin = await adminService.isAdmin();
          console.log('Is admin:', isAdmin);
          
          if (isAdmin) {
            // Admin user - go to admin dashboard
            console.log('Redirecting to admin dashboard...');
            router.replace('/admin/dashboard');
            return;
          }

          console.log('Not an admin, checking profile...');
          
          // Regular user - check if they have a profile
          const profileResult = await profileService.getProfile();
          
          if (profileResult.success && profileResult.profile) {
            // User has a profile, check status
            console.log('Profile status:', profileResult.profile.status);
            if (profileResult.profile.status === 'approved') {
              // Approved - go to main app
              router.replace('/(tabs)');
            } else {
              // Pending or rejected - go to profile tab
              router.replace('/(tabs)/profile');
            }
          } else {
            // No profile - go to profile tab to create one
            console.log('No profile found, redirecting to profile tab...');
            router.replace('/(tabs)/profile');
          }
        } else {
          console.log('No session, redirecting to login...');
          router.replace('/auth/login');
        }
      }
    };

    checkUserStatus();
  }, [session, authLoading]);


}



