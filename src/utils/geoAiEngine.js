import { calculateDistanceKm } from './locationService';
import { INITIAL_CITIES, INITIAL_REGIONS } from '../db/database';

/**
 * AI Spatial Engine: Finds nearest city and region from exact GPS coordinates
 */
export const detectNearestCityAndRegion = (coords, cities = INITIAL_CITIES, regions = INITIAL_REGIONS) => {
  if (!coords?.lat || !coords?.lng) return null;

  const userLat = Number(coords.lat);
  const userLng = Number(coords.lng);

  // 1. Find the closest city in Israel
  let nearestCity = null;
  let minCityDistance = Infinity;

  cities.forEach(city => {
    if (city.lat && city.lng) {
      const dist = parseFloat(calculateDistanceKm(userLat, userLng, city.lat, city.lng));
      if (dist < minCityDistance) {
        minCityDistance = dist;
        nearestCity = { ...city, distanceKm: dist };
      }
    }
  });

  // 2. Find closest region
  let nearestRegion = null;
  let minRegionDistance = Infinity;

  // If city is found, its parent region takes top priority
  if (nearestCity?.region_id) {
    nearestRegion = regions.find(r => r.id === nearestCity.region_id) || null;
  }

  if (!nearestRegion) {
    regions.forEach(region => {
      if (region.lat && region.lng) {
        const dist = parseFloat(calculateDistanceKm(userLat, userLng, region.lat, region.lng));
        if (dist < minRegionDistance) {
          minRegionDistance = dist;
          nearestRegion = { ...region, distanceKm: dist };
        }
      }
    });
  }

  // 3. Compute AI confidence level
  let confidence = 'HIGH';
  if (minCityDistance > 25) confidence = 'MEDIUM';
  if (minCityDistance > 60) confidence = 'LOW';

  const cityNameClean = nearestCity?.name?.split('/')[0]?.trim() || 'Unknown City';
  const regionNameClean = nearestRegion?.name?.split('/')[0]?.trim() || 'Unknown Region';

  return {
    city: nearestCity,
    region: nearestRegion,
    cityId: nearestCity?.id || null,
    regionId: nearestRegion?.id || nearestCity?.region_id || null,
    distanceToCityKm: minCityDistance,
    confidence,
    summary: `📍 Located near ${cityNameClean} (${regionNameClean} District) • ${minCityDistance.toFixed(1)} km away`,
    aiSuggestion: `AI Auto-Detected: ${nearestCity?.name || 'Local Area'} (${nearestRegion?.name || 'Local Region'})`
  };
};

/**
 * Online Reverse Geocoding with fallback to spatial AI
 */
export const reverseGeocodeAddress = async (coords, cities = INITIAL_CITIES, regions = INITIAL_REGIONS) => {
  const localMatch = detectNearestCityAndRegion(coords, cities, regions);
  if (!coords?.lat || !coords?.lng) return localMatch;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}&zoom=14&addressdetails=1`,
      {
        headers: { 'Accept-Language': 'he,en' },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const addr = data.address || {};
      const street = addr.road || addr.pedestrian || addr.street || '';
      const houseNumber = addr.house_number || '';
      const city = addr.city || addr.town || addr.village || addr.suburb || '';
      const state = addr.state || '';

      const fullFormatted = [street ? `${street} ${houseNumber}`.trim() : '', city, state]
        .filter(Boolean)
        .join(', ') || data.display_name;

      return {
        ...localMatch,
        fullAddress: fullFormatted,
        streetAddress: street ? `${street} ${houseNumber}`.trim() : '',
        detectedCityName: city,
        rawGeoData: data
      };
    }
  } catch (err) {
    console.log('Reverse geocode fallback to local spatial engine:', err.message);
  }

  return localMatch;
};

// In-memory Geocode Cache for fast instant lookups
const GEOCODE_CACHE = new Map();

// Common Israeli transliteration & phonetic spelling replacements
const ISRAELI_ADDRESS_REPLACEMENTS = [
  [/\bgolday\b/gi, 'Golda'],
  [/\bgoldda\b/gi, 'Golda'],
  [/\bgolda meir\b/gi, 'Golda Meir'],
  [/\bmotti\b/gi, 'Moti'],
  [/\bmoty\b/gi, 'Moti'],
  [/\bkinder\b/gi, 'Kind'],
  [/\bkindy\b/gi, 'Kind'],
  [/\btehovot\b/gi, 'Rehovot'],
  [/\brechovot\b/gi, 'Rehovot'],
  [/\brehovoth\b/gi, 'Rehovot'],
  [/\btlv\b/gi, 'Tel Aviv'],
  [/\btel-aviv\b/gi, 'Tel Aviv'],
  [/\btelaviv\b/gi, 'Tel Aviv'],
  [/\byerushalayim\b/gi, 'Jerusalem'],
  [/\brlz\b/gi, 'Rishon LeZion'],
  [/\bpetach\b/gi, 'Petah'],
  [/\bhertzel\b/gi, 'Herzl'],
  [/\bvaizman\b/gi, 'Weizmann'],
  [/\bvaizmann\b/gi, 'Weizmann'],
  [/\bweizman\b/gi, 'Weizmann'],
  [/\bdizingof\b/gi, 'Dizengoff'],
  [/\bdizengof\b/gi, 'Dizengoff'],
  [/\brotshild\b/gi, 'Rothschild'],
  [/\brotschild\b/gi, 'Rothschild']
];

export const normalizeIsraeliAddress = (raw) => {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw.trim();
  for (const [pattern, rep] of ISRAELI_ADDRESS_REPLACEMENTS) {
    text = text.replace(pattern, rep);
  }
  return text;
};

/**
 * Online Forward Geocoding: Resolves free-form address strings (e.g. "Golda Moti Kind Rehovot")
 * to exact GPS lat/lng coordinates in Israel with in-memory caching and multi-pass fallbacks.
 */
export const forwardGeocodeAddress = async (addressText, cities = INITIAL_CITIES, regions = INITIAL_REGIONS) => {
  if (!addressText || typeof addressText !== 'string') return null;

  const rawQuery = addressText.trim();
  if (!rawQuery) return null;

  // 0. Check in-memory cache
  const cacheKey = rawQuery.toLowerCase();
  if (GEOCODE_CACHE.has(cacheKey)) {
    return GEOCODE_CACHE.get(cacheKey);
  }

  const normalizedQuery = normalizeIsraeliAddress(rawQuery);

  // 1. Try Nominatim with normalized query in Israel
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);

    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalizedQuery)}&countrycodes=il&addressdetails=1&limit=1`;
    const res = await fetch(nomUrl, {
      headers: {
        'Accept-Language': 'he,en',
        'User-Agent': 'HandyHub-App'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results) && results.length > 0) {
        const item = results[0];
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        if (!isNaN(lat) && !isNaN(lng)) {
          const nearest = detectNearestCityAndRegion({ lat, lng }, cities, regions);
          const geocodedResult = {
            lat,
            lng,
            displayName: item.display_name,
            confidence: 'EXACT',
            source: 'NOMINATIM',
            isExact: true,
            city: nearest?.city || null,
            region: nearest?.region || null
          };
          GEOCODE_CACHE.set(cacheKey, geocodedResult);
          return geocodedResult;
        }
      }
    }
  } catch (e) {
    console.log('Nominatim geocode fallback:', e.message);
  }

  // 2. Try Photon Komoot API with fuzzy matching
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(normalizedQuery)}&lat=31.8928&lon=34.8113&limit=1`;
    const photonRes = await fetch(photonUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (photonRes.ok) {
      const photonData = await photonRes.json();
      if (photonData?.features?.length > 0) {
        const feat = photonData.features[0];
        const [lng, lat] = feat.geometry?.coordinates || [];
        if (lat && lng) {
          const nearest = detectNearestCityAndRegion({ lat, lng }, cities, regions);
          const geocodedResult = {
            lat: Number(lat),
            lng: Number(lng),
            displayName: feat.properties?.name || normalizedQuery,
            confidence: 'EXACT',
            source: 'PHOTON',
            isExact: true,
            city: nearest?.city || null,
            region: nearest?.region || null
          };
          GEOCODE_CACHE.set(cacheKey, geocodedResult);
          return geocodedResult;
        }
      }
    }
  } catch (e) {
    console.log('Photon geocode fallback:', e.message);
  }

  // 3. Fallback to Local City / Region Database Matching
  const locLower = normalizedQuery.toLowerCase();
  const matchedCity = cities.find(c => {
    const parts = c.name.toLowerCase().split('/');
    return parts.some(p => locLower.includes(p.trim()));
  });

  if (matchedCity?.lat && matchedCity?.lng) {
    const matchedRegion = regions.find(r => r.id === matchedCity.region_id) || null;
    const fallbackResult = {
      lat: Number(matchedCity.lat),
      lng: Number(matchedCity.lng),
      displayName: matchedCity.name,
      confidence: 'CITY_FALLBACK',
      source: 'LOCAL_DB',
      isExact: false,
      city: matchedCity,
      region: matchedRegion
    };
    GEOCODE_CACHE.set(cacheKey, fallbackResult);
    return fallbackResult;
  }

  return null;
};

/**
 * Autocomplete / Live Address Search Suggestions in Israel
 * Queries Nominatim and Photon to return interactive selectable location items.
 */
export const searchAddressSuggestions = async (queryText, limit = 5, cities = INITIAL_CITIES, regions = INITIAL_REGIONS) => {
  if (!queryText || typeof queryText !== 'string' || queryText.trim().length < 2) {
    return [];
  }

  const rawQuery = queryText.trim();
  const normalizedQuery = normalizeIsraeliAddress(rawQuery);
  const cacheKey = `suggest_${normalizedQuery.toLowerCase()}_${limit}`;

  if (GEOCODE_CACHE.has(cacheKey)) {
    return GEOCODE_CACHE.get(cacheKey);
  }

  const suggestions = [];
  const seenCoords = new Set();

  // 1. Query Nominatim with Israeli boundary
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2500);

    const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(normalizedQuery)}&countrycodes=il&addressdetails=1&limit=${limit}`;
    const res = await fetch(nomUrl, {
      headers: {
        'Accept-Language': 'he,en',
        'User-Agent': 'HandyHub-App'
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const results = await res.json();
      if (Array.isArray(results)) {
        for (const item of results) {
          const lat = parseFloat(item.lat);
          const lng = parseFloat(item.lon);
          const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
          if (!isNaN(lat) && !isNaN(lng) && !seenCoords.has(coordKey)) {
            seenCoords.add(coordKey);
            const nearest = detectNearestCityAndRegion({ lat, lng }, cities, regions);
            
            // Format clean title & subtitle
            const addr = item.address || {};
            const road = addr.road || addr.pedestrian || addr.street || addr.amenity || '';
            const houseNumber = addr.house_number || '';
            const city = addr.city || addr.town || addr.village || addr.suburb || nearest?.city?.name?.split('/')[0] || '';
            const shortTitle = item.name || (road ? `${road} ${houseNumber}`.trim() : item.display_name.split(',')[0]);
            const subtitle = [road && shortTitle !== road ? road : '', city, 'Israel'].filter(Boolean).join(', ');

            suggestions.push({
              title: shortTitle,
              subtitle: subtitle || item.display_name,
              fullAddress: item.display_name,
              lat,
              lng,
              city: nearest?.city || null,
              region: nearest?.region || null,
              isExact: true,
              source: 'NOMINATIM'
            });
          }
        }
      }
    }
  } catch (err) {
    console.log('Nominatim suggestions fallback:', err.message);
  }

  // 2. Query Photon Komoot API if fewer than limit results
  if (suggestions.length < limit) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(normalizedQuery)}&lat=31.8928&lon=34.8113&limit=${limit}`;
      const photonRes = await fetch(photonUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (photonRes.ok) {
        const photonData = await photonRes.json();
        if (Array.isArray(photonData?.features)) {
          for (const feat of photonData.features) {
            const [lng, lat] = feat.geometry?.coordinates || [];
            const coordKey = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
            if (lat && lng && !seenCoords.has(coordKey)) {
              seenCoords.add(coordKey);
              const props = feat.properties || {};
              const nearest = detectNearestCityAndRegion({ lat: Number(lat), lng: Number(lng) }, cities, regions);
              const title = props.name || props.street || normalizedQuery;
              const subtitle = [props.street, props.city, props.country].filter(Boolean).join(', ');

              suggestions.push({
                title,
                subtitle: subtitle || title,
                fullAddress: [title, props.city, props.country].filter(Boolean).join(', '),
                lat: Number(lat),
                lng: Number(lng),
                city: nearest?.city || null,
                region: nearest?.region || null,
                isExact: true,
                source: 'PHOTON'
              });
            }
          }
        }
      }
    } catch (err) {
      console.log('Photon suggestions fallback:', err.message);
    }
  }

  // 3. Fallback to Local Matching Cities / Districts if online returned nothing
  if (suggestions.length === 0) {
    const qLower = normalizedQuery.toLowerCase();
    const matchedCities = cities.filter(c => {
      const names = c.name.toLowerCase().split('/');
      return names.some(n => n.includes(qLower));
    });

    for (const city of matchedCities.slice(0, limit)) {
      const reg = regions.find(r => r.id === city.region_id);
      suggestions.push({
        title: city.name.split('/')[0].trim(),
        subtitle: `${city.name} (${reg?.name || 'Israel'})`,
        fullAddress: `${city.name}, Israel`,
        lat: city.lat,
        lng: city.lng,
        city,
        region: reg || null,
        isExact: false,
        source: 'LOCAL_CITIES'
      });
    }
  }

  GEOCODE_CACHE.set(cacheKey, suggestions);
  return suggestions;
};

