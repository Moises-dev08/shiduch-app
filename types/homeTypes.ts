export interface Profile {
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
  picturePrivacy: 'none' | 'public' | 'private';
  
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
  
  // References
  user_references?: { name: string; phone: string }[];
  
  // Metadata
  last_active_at?: string;
  field_privacy?: { [key: string]: boolean };
}

export interface FilterState {
  selectedAgeOption: string | null;
  selectedHashkafa: string[];
  selectedLocation: string[];
}

