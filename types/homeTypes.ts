export interface Profile {
  id: string;
  name: string;
  age: number;
  picture: string;
  pictures: string[];
  hashkafa: string;
  location: string;
  bio: string;
  role: 'single' | 'matchmaker';
  gender: 'male' | 'female';
  phone?: string;
  email?: string;
  whatsapp?: string;
  school?: string;
  occupation?: string;
  height?: string;
  hasChildren?: boolean;
  picturePrivacy: 'none' | 'always' | 'private';
  privacySettings: {
    height?: boolean;
    hasChildren?: boolean;
    address?: boolean;
    school?: boolean;
    occupation?: boolean;
  };
}

export interface FilterState {
  selectedAgeOption: string | null;
  selectedHashkafa: string[];
  selectedLocation: string[];
}

