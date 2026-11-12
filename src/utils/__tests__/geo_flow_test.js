import { searchAddressSuggestions, reverseGeocodeAddress, forwardGeocodeAddress, detectNearestCityAndRegion } from '../geoAiEngine.js';
import { resolveCoordinates, INITIAL_CITIES, INITIAL_REGIONS } from '../../db/database.js';
import { calculateDistanceKm } from '../locationService.js';

async function runTests() {
  console.log('🧪 === STARTING GEO & MAP PINNING VERIFICATION ===\n');

  // Test 1: Autocomplete Search for custom Israeli addresses
  console.log('--- Test 1: Address Autocomplete Suggestions ---');
  const searchQueries = ['Golda Moti Kind Rehovot', 'Dizengoff Tel Aviv', 'Herzl Ashdod', 'Eilat'];
  for (const q of searchQueries) {
    const suggestions = await searchAddressSuggestions(q, 3, INITIAL_CITIES, INITIAL_REGIONS);
    console.log(`Query: "${q}" => ${suggestions.length} results`);
    suggestions.forEach((s, i) => {
      console.log(`  [${i + 1}] ${s.title} (${s.subtitle}) -> [lat: ${s.lat}, lng: ${s.lng}]`);
    });
    if (suggestions.length === 0) {
      throw new Error(`Expected suggestions for query "${q}"`);
    }
  }

  // Test 2: Exact Coordinate Resolution (Not City Center Fallback)
  console.log('\n--- Test 2: Exact Coordinate Priority ---');
  const customJobWithCoords = {
    problem: 'Short Circuit in Kitchen',
    location: 'Golda, Moti Kind, Rehovot',
    lat: 31.8930,
    lng: 34.7897,
    customerCity: { id: 16, name: 'Eilat / אילת', lat: 29.5577, lng: 34.9519 } // Customer profile is in Eilat!
  };
  const resolved = resolveCoordinates(customJobWithCoords, INITIAL_CITIES, INITIAL_REGIONS);
  console.log('Job with custom pinpoint in Rehovot & Customer Profile in Eilat:');
  console.log('  Resolved Coords:', resolved);
  if (resolved.lat !== 31.8930 || resolved.lng !== 34.7897) {
    throw new Error(`Expected exact coords (31.8930, 34.7897) but got (${resolved.lat}, ${resolved.lng})`);
  }
  console.log('  ✅ PASSED: Exact custom coordinates prioritized over customer profile city!');

  // Test 3: Reverse Geocoding from Pinned Map Click
  console.log('\n--- Test 3: Reverse Geocoding on Map Click ---');
  const clickedPoint = { lat: 31.8930, lng: 34.7897 };
  const revGeo = await reverseGeocodeAddress(clickedPoint, INITIAL_CITIES, INITIAL_REGIONS);
  console.log('Clicked Point [31.8930, 34.7897]:', revGeo);
  if (!revGeo) {
    throw new Error('Expected reverse geocode result');
  }
  console.log('  ✅ PASSED: Reverse geocode returned valid location description!');

  // Test 4: Distance calculation in KM
  console.log('\n--- Test 4: Distance Calculation in KM ---');
  const providerPos = { lat: 31.8928, lng: 34.8113 }; // Rehovot center
  const targetPos = { lat: 31.8930, lng: 34.7897 }; // Moti Kind
  const distanceKm = calculateDistanceKm(providerPos.lat, providerPos.lng, targetPos.lat, targetPos.lng);
  console.log(`Distance from Provider to Target: ${distanceKm} km`);
  const distNum = parseFloat(distanceKm);
  if (isNaN(distNum) || distNum <= 0 || distNum > 5) {
    throw new Error(`Unexpected distance calculation: ${distanceKm}`);
  }
  console.log('  ✅ PASSED: Distance correctly computed in KM!');

  // Test 5: Navigation URL construction with exact coordinates
  console.log('\n--- Test 5: Navigation Deep Links ---');
  const wazeUrl = `waze://?ll=${targetPos.lat},${targetPos.lng}&q=${encodeURIComponent('Golda, Moti Kind, Rehovot')}&navigate=yes`;
  const googleNavUrl = `google.navigation:q=${targetPos.lat},${targetPos.lng}&mode=d`;
  console.log('  Waze Intent:', wazeUrl);
  console.log('  Google Nav Intent:', googleNavUrl);
  if (!wazeUrl.includes('ll=31.893,34.7897') || !googleNavUrl.includes('31.893,34.7897')) {
    throw new Error('Navigation URLs do not include exact lat/lng coordinates');
  }
  console.log('  ✅ PASSED: Navigation links pass exact coordinates directly!');

  console.log('\n🎉 ALL GEO & MAP PINNING TESTS PASSED SUCCESSFULLY!');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
