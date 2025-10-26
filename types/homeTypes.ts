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
}

export interface FilterState {
  selectedAgeOption: string | null;
  selectedHashkafa: string[];
  selectedLocation: string[];
}

