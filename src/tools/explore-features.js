// Temporary exploration script to understand web-features structure
const webFeatures = require('web-features');

console.log('Web Features Structure:');
console.log('='.repeat(50));

// Explore the main data structure
console.log('Available keys:', Object.keys(webFeatures));

if (webFeatures.features) {
  const features = Object.keys(webFeatures.features);
  console.log(`\nTotal features: ${features.length}`);
  
  // Show first 10 features as examples
  console.log('\nFirst 10 features:');
  features.slice(0, 10).forEach(id => {
    const feature = webFeatures.features[id];
    console.log(`- ${id}:`, {
      name: feature.name,
      status: feature.status?.baseline,
      spec: feature.spec?.slice(0, 50) + '...',
      description: feature.description_html?.slice(0, 80) + '...'
    });
  });
  
  // Look for CSS-related features
  const cssFeatures = features.filter(id => 
    id.includes('css') || 
    webFeatures.features[id].name?.toLowerCase().includes('css') ||
    webFeatures.features[id].spec?.includes('css')
  );
  
  console.log(`\nCSS-related features: ${cssFeatures.length}`);
  cssFeatures.slice(0, 5).forEach(id => {
    console.log(`- ${id}: ${webFeatures.features[id].name}`);
  });
  
  // Look for JS API features
  const jsFeatures = features.filter(id => 
    id.includes('api') || 
    id.includes('javascript') ||
    webFeatures.features[id].name?.toLowerCase().includes('api')
  );
  
  console.log(`\nJS API features: ${jsFeatures.length}`);
  jsFeatures.slice(0, 5).forEach(id => {
    console.log(`- ${id}: ${webFeatures.features[id].name}`);
  });
}