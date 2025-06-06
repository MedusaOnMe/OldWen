/**
 * View and extract images from campaign database
 */
import { db, collections } from './server/lib/firebase.ts';
import fs from 'fs';
import path from 'path';

async function extractCampaignImages(campaignId) {
  try {
    console.log(`🔍 Fetching campaign: ${campaignId}`);
    
    const campaignDoc = await db.collection(collections.campaigns).doc(campaignId).get();
    if (!campaignDoc.exists) {
      console.log(`❌ Campaign ${campaignId} not found`);
      return;
    }
    
    const data = campaignDoc.data();
    console.log(`📋 Campaign: ${data.tokenName} (${data.tokenSymbol})`);
    
    // Create images directory
    const imagesDir = `campaign_images/${campaignId}`;
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }
    
    // Extract images
    let imageCount = 0;
    
    // Helper function to save base64 image with correct format
    function saveBase64Image(dataUri, basePath, imageName) {
      const formatMatch = dataUri.match(/^data:image\/([a-zA-Z]+);base64,/);
      const imageFormat = formatMatch ? formatMatch[1] : 'jpg';
      const extension = imageFormat === 'jpeg' ? 'jpg' : imageFormat;
      
      const imagePath = path.join(basePath, `${imageName}.${extension}`);
      const base64Data = dataUri.replace(/^data:image\/[a-zA-Z]+;base64,/, '');
      fs.writeFileSync(imagePath, base64Data, 'base64');
      
      console.log(`✅ ${imageName} saved: ${imagePath} (format: ${imageFormat})`);
      
      // Check dimensions if possible
      try {
        const { execSync } = require('child_process');
        const dimensions = execSync(`identify "${imagePath}"`, { encoding: 'utf8' });
        const dimensionMatch = dimensions.match(/(\d+)x(\d+)/);
        if (dimensionMatch) {
          const width = parseInt(dimensionMatch[1]);
          const height = parseInt(dimensionMatch[2]);
          const aspectRatio = (width / height).toFixed(3);
          console.log(`   Dimensions: ${width}x${height}, Aspect ratio: ${aspectRatio}:1`);
        }
      } catch (e) {
        console.log('   (Dimension check skipped - ImageMagick not available)');
      }
      
      return true;
    }

    // Icon/Logo images
    if (data.tokenLogoUrl && data.tokenLogoUrl.startsWith('data:image/')) {
      saveBase64Image(data.tokenLogoUrl, imagesDir, 'icon');
      imageCount++;
    }
    
    if (data.logoUrl && data.logoUrl.startsWith('data:image/')) {
      saveBase64Image(data.logoUrl, imagesDir, 'logo');
      imageCount++;
    }
    
    // Banner image
    if (data.bannerUrl && data.bannerUrl.startsWith('data:image/')) {
      saveBase64Image(data.bannerUrl, imagesDir, 'banner');
      imageCount++;
    }
    
    // Check for URL-based images
    const urlFields = ['tokenLogoUrl', 'logoUrl', 'bannerUrl', 'imageUrl', 'iconUrl'];
    for (const field of urlFields) {
      if (data[field] && data[field].startsWith('http')) {
        console.log(`🔗 ${field}: ${data[field]}`);
      }
    }
    
    console.log(`\n📊 Summary:`);
    console.log(`   Images extracted: ${imageCount}`);
    console.log(`   Saved to: ${imagesDir}/`);
    
    if (imageCount === 0) {
      console.log(`   No base64 images found in this campaign`);
      
      // Show available image fields
      console.log(`\n📋 Available image fields:`);
      urlFields.forEach(field => {
        if (data[field]) {
          if (data[field].startsWith('data:image/')) {
            console.log(`   ${field}: [BASE64_IMAGE]`);
          } else {
            console.log(`   ${field}: ${data[field]}`);
          }
        } else {
          console.log(`   ${field}: undefined`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Get campaign ID from command line
const campaignId = process.argv[2];

if (!campaignId) {
  console.log('Usage: node view-campaign-images.js <campaign-id>');
  console.log('Example: node view-campaign-images.js 3aFTn0en37NFWJJBqMT7');
  process.exit(1);
}

console.log('🖼️ CAMPAIGN IMAGE EXTRACTOR');
console.log('=' .repeat(40));

extractCampaignImages(campaignId);