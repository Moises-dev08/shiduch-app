export interface Profile {
  last_name: any;
  first_name: any;
  id: string;
  name: string;
  picture: string;
  pictures: string[];
  location: string;
  bio: string;
  role: 'single' | 'matchmaker';
  gender: 'male' | 'female';
  phone?: string;
  email?: string;
  whatsapp?: string;
  height?: string;
  hasChildren?: boolean;
  picturePrivacy: 'none' | 'always' | 'private' | 'one_time';
  picturesViewed?: boolean;
  /** Profile row creation time. Fallback for Newest / Oldest when approval time is missing. */
  createdAt?: string;
  /** When the profile was approved and appeared in the directory. */
  approvedAt?: string;
  
  // New comprehensive fields
  dob?: string; // Date of birth - age is calculated from this
  what_looking_for?: string;
  
  // Location fields
  location_city?: string;
  location_state?: string;
  location_country?: string;
  languages?: string[];
  
  // Nationality / Background
  nationality?: string[];
  is_cohen?: boolean;
  
  // Hashkafa / Religious
  hashkafa_type?: string;
  torah_learning?: string;
  praying?: string;
  
  // Education
  education_level?: string;
  post_high_school_path?: string;
  
  // Occupation / Study
  current_occupation_study?: string;
  
  // Plan After Marriage
  plan_after_marriage?: string;
  
  // Marital Status
  marital_status?: string;
  
  // Dress & Appearance
  dress_style?: string;
  wears_black_hat?: boolean;
  head_covering?: string;
  
  // Lifestyle
  smoking?: string;
  alcohol_consumption?: string;
  
  // Metadata
  last_active_at?: string;
  field_privacy?: { [key: string]: boolean };
}

export interface FilterState {
  // Gender filter (matchmaker "See first")
  genderFilter: 'all' | 'male' | 'female';

  // Age filter (from DOB)
  selectedAgeOption: string | null;
  minAge: number | null;
  maxAge: number | null;
  exactAge: number | null;
  
  // Location filters
  selectedCountries: string[];
  selectedStates: string[];
  selectedCities: string[];
  
  // Profile form fields
  selectedHashkafa: string[];
  selectedNationality: string[];
  selectedMaritalStatus: string[];
  hasChildren: boolean | null; // null = any, true = has children, false = no children
  selectedEducation: string[];
  selectedOccupation: string[];
  minHeightFeet: number | null;
  minHeightInches: number | null;
  maxHeightFeet: number | null;
  maxHeightInches: number | null;
  
  // Sorting and special filters
  sortBy: 'newest' | 'oldest' | 'youngest' | 'pictures_to_none' | 'none_to_pictures' | null;
  hasAskMeFields: boolean;
  hasPhoto: boolean | null; // null = any, true = has photo, false = no photo
  hasOneTimePhoto: boolean; // Filter for profiles with one-time photo privacy
  hasPrivatePhoto: boolean; // Filter for profiles with private photo privacy
  
  // Gender-specific filters
  selectedTorahLearning: string[];
  selectedPraying: string[];
  selectedHeadCovering: string[];
  selectedPostHighSchool: string[]; // For female profiles
  wearsBlackHat: boolean | null;
}

