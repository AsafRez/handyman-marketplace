import { AppLauncher } from '@capacitor/app-launcher';
import { Browser } from '@capacitor/browser';
import { normalizeIsraeliAddress } from './geoAiEngine';

/**
 * Navigation Helper for HandyHub
 * Opens external navigation apps (Waze, Google Maps, Apple Maps) to exact address & coordinates.
 */

export const openWaze = async (coords, address = '') => {
  const cleanAddress = normalizeIsraeliAddress((address || '').trim());
  const hasCoords = coords?.lat && coords?.lng;

  if (!cleanAddress && !hasCoords) return;

  let wazeAppUrl = '';
  let wazeWebUrl = '';

  const queryEncoded = cleanAddress ? encodeURIComponent(cleanAddress) : '';

  if (hasCoords && cleanAddress) {
    wazeAppUrl = `waze://?ll=${coords.lat},${coords.lng}&q=${queryEncoded}&navigate=yes`;
    wazeWebUrl = `https://waze.com/ul?ll=${coords.lat},${coords.lng}&q=${queryEncoded}&navigate=yes`;
  } else if (hasCoords) {
    wazeAppUrl = `waze://?ll=${coords.lat},${coords.lng}&navigate=yes`;
    wazeWebUrl = `https://waze.com/ul?ll=${coords.lat},${coords.lng}&navigate=yes`;
  } else {
    wazeAppUrl = `waze://?q=${queryEncoded}&navigate=yes`;
    wazeWebUrl = `https://waze.com/ul?q=${queryEncoded}&navigate=yes`;
  }

  // 1. Try native Waze deep link scheme via Capacitor AppLauncher
  try {
    const { value: canOpen } = await AppLauncher.canOpenUrl({ url: wazeAppUrl }).catch(() => ({ value: true }));
    if (canOpen) {
      await AppLauncher.openUrl({ url: wazeAppUrl });
      return;
    }
  } catch (err) {
    console.warn('Waze native app launch error:', err);
  }

  // 2. Try AppLauncher with universal web link
  try {
    await AppLauncher.openUrl({ url: wazeWebUrl });
    return;
  } catch (err) {
    console.warn('Waze universal link launch error:', err);
  }

  // 3. Fallback to In-App / System Browser via Capacitor Browser Plugin
  try {
    await Browser.open({ url: wazeWebUrl, windowName: '_system' });
    return;
  } catch (err) {
    console.warn('Browser plugin open error:', err);
  }

  // 4. Standard window.open fallback for pure browser environments
  try {
    window.open(wazeWebUrl, '_system') || window.open(wazeWebUrl, '_blank') || (window.location.href = wazeWebUrl);
  } catch (e) {
    window.location.href = wazeWebUrl;
  }
};

export const openGoogleMaps = async (coords, address = '') => {
  const cleanAddress = normalizeIsraeliAddress((address || '').trim());
  const hasCoords = coords?.lat && coords?.lng;

  if (!cleanAddress && !hasCoords) return;

  const encodedQuery = cleanAddress ? encodeURIComponent(cleanAddress) : (hasCoords ? `${coords.lat},${coords.lng}` : '');
  const destinationParam = hasCoords ? `${coords.lat},${coords.lng}` : encodedQuery;

  const navIntentUrl = hasCoords
    ? `google.navigation:q=${coords.lat},${coords.lng}&mode=d`
    : `google.navigation:q=${encodedQuery}&mode=d`;
  const geoUrl = hasCoords
    ? `geo:${coords.lat},${coords.lng}?q=${encodedQuery || `${coords.lat},${coords.lng}`}`
    : `geo:0,0?q=${encodedQuery}`;
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationParam}&travelmode=driving`;


  // 1. Try Google Navigation intent scheme
  try {
    const { value: canOpen } = await AppLauncher.canOpenUrl({ url: navIntentUrl }).catch(() => ({ value: true }));
    if (canOpen) {
      await AppLauncher.openUrl({ url: navIntentUrl });
      return;
    }
  } catch (err) {
    console.warn('Google navigation intent launch error:', err);
  }

  // 2. Try geo: URI intent scheme
  try {
    const { value: canOpenGeo } = await AppLauncher.canOpenUrl({ url: geoUrl }).catch(() => ({ value: true }));
    if (canOpenGeo) {
      await AppLauncher.openUrl({ url: geoUrl });
      return;
    }
  } catch (err) {
    console.warn('Geo URI intent launch error:', err);
  }

  // 3. Try AppLauncher with Google Maps web URL
  try {
    await AppLauncher.openUrl({ url: webUrl });
    return;
  } catch (err) {
    console.warn('Google Maps web URL AppLauncher error:', err);
  }

  // 4. Fallback to Capacitor Browser plugin
  try {
    await Browser.open({ url: webUrl, windowName: '_system' });
    return;
  } catch (err) {
    console.warn('Browser plugin open error:', err);
  }

  // 5. Pure browser fallback
  try {
    window.open(webUrl, '_system') || window.open(webUrl, '_blank') || (window.location.href = webUrl);
  } catch (e) {
    window.location.href = webUrl;
  }
};

export const openAppleMaps = async (coords, address = '') => {
  const cleanAddress = (address || '').trim();
  const hasCoords = coords?.lat && coords?.lng;

  if (!cleanAddress && !hasCoords) return;

  const targetQuery = cleanAddress || (hasCoords ? `${coords.lat},${coords.lng}` : '');
  const encodedQuery = encodeURIComponent(targetQuery);

  const appleMapsAppUrl = `maps://?daddr=${encodedQuery}&dirflg=d`;
  const appleMapsWebUrl = `https://maps.apple.com/?daddr=${encodedQuery}&dirflg=d`;

  try {
    await AppLauncher.openUrl({ url: appleMapsAppUrl });
    return;
  } catch (e) {}

  try {
    await Browser.open({ url: appleMapsWebUrl, windowName: '_system' });
    return;
  } catch (e) {
    window.open(appleMapsWebUrl, '_system') || (window.location.href = appleMapsWebUrl);
  }
};

export const openNativeNavigation = (coords, address = '') => {
  return openGoogleMaps(coords, address);
};
