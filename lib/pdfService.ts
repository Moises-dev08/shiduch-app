import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Profile } from './profileService';

export interface ProfilePDFData {
  firstName: string;
  lastName: string;
  age: number | string;
  gender: string;
  role: string;
  hashkafa: string;
  height?: string;
  hasChildren?: boolean;
  school?: string;
  occupation?: string;
  location?: string;
  phone?: string;
  email?: string;
  whatsapp?: string;
  bio?: string;
  pictures?: string[];
}

/**
 * Converts an image URL to base64 for embedding in PDF
 * Handles both local file URIs and remote URLs
 */
async function imageUrlToBase64(url: string): Promise<string> {
  try {
    // Check if it's a local file URI
    if (url.startsWith('file://')) {
      console.log('Converting local file to base64:', url);
      const base64 = await FileSystem.readAsStringAsync(url, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Determine mime type from file extension
      let mimeType = 'image/jpeg';
      if (url.toLowerCase().endsWith('.png')) {
        mimeType = 'image/png';
      } else if (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')) {
        mimeType = 'image/jpeg';
      }
      
      return `data:${mimeType};base64,${base64}`;
    } 
    
    // Handle remote URLs (Supabase storage, etc.)
    console.log('Fetching remote image:', url);
    
    // Download to temporary file first, then convert to base64
    const fileUri = FileSystem.cacheDirectory + 'temp_image_' + Date.now() + '.jpg';
    const downloadResult = await FileSystem.downloadAsync(url, fileUri);
    
    if (downloadResult.status === 200) {
      const base64 = await FileSystem.readAsStringAsync(downloadResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Determine mime type from URL or default to jpeg
      let mimeType = 'image/jpeg';
      if (url.toLowerCase().includes('.png')) {
        mimeType = 'image/png';
      }
      
      // Clean up temp file
      await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true });
      
      return `data:${mimeType};base64,${base64}`;
    }
    
    return '';
  } catch (error) {
    console.error('Error converting image to base64:', error, 'URL:', url);
    return '';
  }
}

/**
 * Generates HTML content for the PDF
 */
async function generateProfileHTML(data: ProfilePDFData): Promise<string> {
  // Convert images to base64
  const imagePromises = (data.pictures || []).slice(0, 3).map(pic => imageUrlToBase64(pic));
  const base64Images = await Promise.all(imagePromises);

  const imagesHTML = base64Images
    .filter(img => img)
    .map(img => `<img src="${img}" style="width: 200px; height: 200px; object-fit: cover; margin: 10px; border-radius: 8px;" />`)
    .join('');

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Shiduchim Profile - ${data.firstName} ${data.lastName}</title>
        <style>
          body {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            padding: 40px;
            color: #333;
            line-height: 1.6;
          }
          .header {
            text-align: center;
            border-bottom: 3px solid #007AFF;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .app-name {
            color: #007AFF;
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
          }
          h1 {
            color: #333;
            font-size: 32px;
            margin: 10px 0;
          }
          .subtitle {
            color: #666;
            font-size: 16px;
          }
          .pictures {
            text-align: center;
            margin: 30px 0;
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
          }
          .section {
            margin: 25px 0;
            page-break-inside: avoid;
          }
          .section-title {
            font-size: 20px;
            font-weight: 600;
            color: #007AFF;
            border-bottom: 2px solid #E5E5E5;
            padding-bottom: 8px;
            margin-bottom: 15px;
          }
          .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 15px 0;
          }
          .info-item {
            background: #F8F9FA;
            padding: 12px;
            border-radius: 6px;
          }
          .info-label {
            font-weight: 600;
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 5px;
          }
          .info-value {
            color: #333;
            font-size: 16px;
          }
          .bio {
            background: #F8F9FA;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #007AFF;
            margin: 15px 0;
          }
          .contact-section {
            background: #E3F2FD;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #E5E5E5;
            color: #999;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="app-name">SHIDUCHIM APP</div>
          <h1>${data.firstName} ${data.lastName}</h1>
          <div class="subtitle">
            ${data.age} years old • ${data.gender.charAt(0).toUpperCase() + data.gender.slice(1)} • ${data.role.charAt(0).toUpperCase() + data.role.slice(1)}
          </div>
        </div>

        ${imagesHTML ? `
          <div class="pictures">
            ${imagesHTML}
          </div>
        ` : ''}

        <div class="section">
          <div class="section-title">Personal Information</div>
          <div class="info-grid">
            ${data.hashkafa ? `
              <div class="info-item">
                <div class="info-label">Hashkafa</div>
                <div class="info-value">${data.hashkafa}</div>
              </div>
            ` : ''}
            ${data.height ? `
              <div class="info-item">
                <div class="info-label">Height</div>
                <div class="info-value">${data.height}</div>
              </div>
            ` : ''}
            ${data.hasChildren !== undefined ? `
              <div class="info-item">
                <div class="info-label">Has Children</div>
                <div class="info-value">${data.hasChildren ? 'Yes' : 'No'}</div>
              </div>
            ` : ''}
            ${data.location ? `
              <div class="info-item">
                <div class="info-label">Location</div>
                <div class="info-value">${data.location}</div>
              </div>
            ` : ''}
            ${data.school ? `
              <div class="info-item">
                <div class="info-label">School</div>
                <div class="info-value">${data.school}</div>
              </div>
            ` : ''}
            ${data.occupation ? `
              <div class="info-item">
                <div class="info-label">Occupation</div>
                <div class="info-value">${data.occupation}</div>
              </div>
            ` : ''}
          </div>
        </div>

        ${data.bio ? `
          <div class="section">
            <div class="section-title">About</div>
            <div class="bio">${data.bio}</div>
          </div>
        ` : ''}

        ${data.phone || data.email || data.whatsapp ? `
          <div class="section">
            <div class="section-title">Contact Information</div>
            <div class="contact-section">
              ${data.phone ? `<div style="margin: 8px 0;"><strong>Phone:</strong> ${data.phone}</div>` : ''}
              ${data.email ? `<div style="margin: 8px 0;"><strong>Email:</strong> ${data.email}</div>` : ''}
              ${data.whatsapp ? `<div style="margin: 8px 0;"><strong>WhatsApp:</strong> ${data.whatsapp}</div>` : ''}
            </div>
          </div>
        ` : ''}

        <div class="footer">
          Generated by Shiduchim App • ${new Date().toLocaleDateString()}
        </div>
      </body>
    </html>
  `;
}

/**
 * Generates and shares a PDF of the profile
 */
export async function generateAndShareProfilePDF(
  profileData: ProfilePDFData
): Promise<{ success: boolean; error?: string }> {
  try {
    // Generate HTML content
    const html = await generateProfileHTML(profileData);

    // Create PDF
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    console.log('PDF generated at:', uri);

    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      return {
        success: false,
        error: 'Sharing is not available on this device',
      };
    }

    // Share the PDF
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `${profileData.firstName} ${profileData.lastName} - Profile`,
      UTI: 'com.adobe.pdf',
    });

    return { success: true };
  } catch (error) {
    console.error('Error generating/sharing PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    };
  }
}

/**
 * Converts Profile type to ProfilePDFData
 */
export function profileToPDFData(profile: Profile): ProfilePDFData {
  return {
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    age: profile.age || 0,
    gender: profile.gender || '',
    role: profile.role || '',
    hashkafa: profile.hashkafa || '',
    height: profile.height,
    hasChildren: profile.has_children,
    school: profile.school,
    occupation: profile.occupation,
    location: profile.address ||  '',
    phone: profile.phone,
    email: profile.email,
    whatsapp: profile.whatsapp,
    bio: profile.bio,
    pictures: profile.pictures || [],
  };
}

