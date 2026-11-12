import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMarketplace } from '../../context/MarketplaceContext';
import { resolveCoordinates } from '../../db/database';
import { Navigation, Maximize2, Minimize2, Crosshair, CheckCircle2, ShieldCheck, MapPin, Compass, Search, X, Loader2 } from 'lucide-react';
import { NavigationModal } from '../Navigation/NavigationModal';
import { searchAddressSuggestions, reverseGeocodeAddress } from '../../utils/geoAiEngine';

export const ProviderMiniMap = ({
  activeAlertJob = null,
  onSelectJob = null,
  visibleJobs = null
}) => {
  const {
    activeProvider,
    currentUser,
    jobs,
    claimJob,
    cities,
    regions,
    providerLiveCoords,
    refreshDeviceLocation,
    calculateDistanceKm
  } = useMarketplace();

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routeLineRef = useRef(null);
  const searchMarkerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [navTarget, setNavTarget] = useState(null);

  // On-Map Custom Search state
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSuggestions, setMapSuggestions] = useState([]);
  const [isSearchingMap, setIsSearchingMap] = useState(false);
  const [showSearchBox, setShowSearchBox] = useState(false);
  const [customDestination, setCustomDestination] = useState(null);

  const currentCoords = providerLiveCoords || { lat: 32.0853, lng: 34.7818 };

  // 2. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = currentCoords?.lat || 32.0853;
    const initialLng = currentCoords?.lng || 34.7818;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 13,
      zoomControl: false,
      attributionControl: false
    });

    // OpenStreetMap smooth standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Click on Mini Map anywhere to drop a custom pinpoint
    map.on('click', async (e) => {
      const { lat, lng } = e.latlng;
      try {
        const rev = await reverseGeocodeAddress({ lat, lng }, cities, regions);
        const title = rev?.fullAddress || rev?.streetAddress || `Pinned Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;
        const subtitle = rev?.detectedCityName ? `${rev.detectedCityName}, Israel` : `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        setCustomDestination({
          lat,
          lng,
          title,
          subtitle,
          fullAddress: title,
          isExact: true
        });
        setMapSearchQuery(title);
      } catch (err) {
        setCustomDestination({
          lat,
          lng,
          title: `Pinned Spot (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
          subtitle: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          fullAddress: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          isExact: true
        });
      }
    });

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 3. Update Map Size on Expand / Minimize Toggle
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current.invalidateSize();
      }, 250);
    }
  }, [isExpanded]);

  // 4. Handle Live Search on Map
  const handleMapSearchChange = (e) => {
    const val = e.target.value;
    setMapSearchQuery(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val || val.trim().length < 2) {
      setMapSuggestions([]);
      return;
    }

    setIsSearchingMap(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchAddressSuggestions(val, 5, cities, regions);
        setMapSuggestions(results);
      } catch (err) {
        console.warn('Map search suggestions error:', err);
      } finally {
        setIsSearchingMap(false);
      }
    }, 280);
  };

  const handleSelectMapSuggestion = (item) => {
    setCustomDestination(item);
    setMapSuggestions([]);
    setMapSearchQuery(item.title);
    setShowSearchBox(false);

    const map = mapInstanceRef.current;
    if (!map) return;

    // Fly to target
    map.flyTo([item.lat, item.lng], 15, { duration: 1.0 });
  };

  const handleClearCustomDestination = () => {
    setCustomDestination(null);
    setMapSearchQuery('');
    setMapSuggestions([]);
    if (searchMarkerRef.current && mapInstanceRef.current) {
      mapInstanceRef.current.removeLayer(searchMarkerRef.current);
      searchMarkerRef.current = null;
    }
  };

  // 5. Render Markers on Map (Provider + Open Jobs + Claimed In-Progress Jobs + Custom Searched Pin)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer || !currentCoords) return;

    markersLayer.clearLayers();
    if (routeLineRef.current) {
      map.removeLayer(routeLineRef.current);
      routeLineRef.current = null;
    }

    const bounds = L.latLngBounds([currentCoords.lat, currentCoords.lng]);

    // A. PROVIDER PIN (Pulsing Radar Avatar)
    const providerIcon = L.divIcon({
      className: 'provider-custom-marker',
      html: `
        <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center;">
          <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(59, 130, 246, 0.28); animation: radar-ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="width: 34px; height: 34px; border-radius: 50%; background: #3B82F6; border: 3px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; font-size: 14px;">
            ${activeProvider?.name?.charAt(0) || 'P'}
          </div>
          <div style="position: absolute; bottom: -2px; right: -2px; background: #10B981; border: 2px solid #FFFFFF; width: 12px; height: 12px; border-radius: 50%;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22]
    });

    L.marker([currentCoords.lat, currentCoords.lng], { icon: providerIcon })
      .bindTooltip(`<b>${activeProvider?.name || 'You'}</b><br/>(Your Location)`, {
        direction: 'top',
        offset: [0, -22]
      })
      .addTo(markersLayer);

    // B. CLAIMED / IN-PROGRESS JOBS (Active Job Assigned to This Provider)
    const provId = activeProvider?.id || activeProvider?.provider_id;
    const userId = activeProvider?.user_id;
    const myActiveClaimedJobs = (jobs || []).filter(j => {
      const st = (j.status || j.rawStatus || '').toUpperCase();
      if (st !== 'CLAIMED') return false;
      return (
        j.claimedBy?.id === provId ||
        j.claimedBy?.provider_id === provId ||
        (userId && j.claimedBy?.user_id === userId) ||
        (provId && j.provider_id === provId)
      );
    });

    myActiveClaimedJobs.forEach(claimedJob => {
      const destCoords = resolveCoordinates(claimedJob, cities, regions, currentCoords);
      bounds.extend([destCoords.lat, destCoords.lng]);

      const claimedIcon = L.divIcon({
        className: 'claimed-job-marker',
        html: `
          <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(16, 185, 129, 0.35); animation: radar-ping 1.8s infinite;"></div>
            <div style="width: 32px; height: 32px; border-radius: 50% 50% 50% 0; background: #10B981; transform: rotate(-45deg); border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(16, 185, 129, 0.4); display: flex; align-items: center; justify-content: center;">
              <span style="transform: rotate(45deg); font-size: 14px;">📍</span>
            </div>
            <div style="position: absolute; top: -14px; background: #10B981; color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 10px; border: 1px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">IN PROGRESS</div>
          </div>
        `,
        iconSize: [42, 42],
        iconAnchor: [21, 32]
      });

      L.marker([destCoords.lat, destCoords.lng], { icon: claimedIcon })
        .bindTooltip(`<b>Active Customer Job</b><br/>${claimedJob.problem || claimedJob.description}<br/>📍 ${claimedJob.location || ''}`, {
          direction: 'top',
          offset: [0, -26]
        })
        .addTo(markersLayer);

      // Active Navigation Route Line (Provider -> Customer)
      const polyline = L.polyline(
        [
          [currentCoords.lat, currentCoords.lng],
          [destCoords.lat, destCoords.lng]
        ],
        {
          color: '#10B981',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.9
        }
      ).addTo(map);

      routeLineRef.current = polyline;
    });

    // C. OPEN JOBS PINS (Filtered by visible active feed)
    const effectiveOpenJobs = visibleJobs !== null
      ? visibleJobs
      : (jobs || []).filter(j => (j.status || j.rawStatus || '').toUpperCase() === 'OPEN');

    effectiveOpenJobs.forEach(job => {
      // Don't duplicate claimed job
      if (myActiveClaimedJobs.some(cj => cj.id === job.id || cj.job_id === job.id)) return;

      const jobCoords = resolveCoordinates(job, cities, regions, currentCoords);
      const isAlertJob = activeAlertJob && (activeAlertJob.id === job.id || activeAlertJob.job_id === job.id);
      const isCurrentSelected = selectedJob && (selectedJob.id === job.id || selectedJob.job_id === job.id);

      const pinColor = isAlertJob ? '#EF4444' : isCurrentSelected ? '#8B5CF6' : '#F59E0B';
      const categoryIconChar = job.category === 'electrician' ? '⚡' : job.category === 'plumber' ? '🔧' : job.category === 'locksmith' ? '🔑' : '🛠️';

      const jobIcon = L.divIcon({
        className: 'job-custom-marker',
        html: `
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${isAlertJob ? `<div style="position: absolute; width: 44px; height: 44px; border-radius: 50%; background: rgba(239, 68, 68, 0.4); animation: radar-ping 1.2s infinite;"></div>` : ''}
            <div style="width: 30px; height: 30px; border-radius: 50% 50% 50% 0; background: ${pinColor}; transform: rotate(-45deg); border: 2px solid #FFFFFF; box-shadow: 0 4px 10px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center;">
              <span style="transform: rotate(45deg); font-size: 13px;">${categoryIconChar}</span>
            </div>
            ${isAlertJob ? `<div style="position: absolute; top: -14px; background: #EF4444; color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 10px; border: 1px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">NEW!</div>` : ''}
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 30]
      });

      const jobMarker = L.marker([jobCoords.lat, jobCoords.lng], { icon: jobIcon })
        .addTo(markersLayer);

      jobMarker.on('click', () => {
        setSelectedJob({ ...job, coords: jobCoords });
        if (onSelectJob) onSelectJob(job);
      });
    });

    // D. INCOMING ALERT ROUTE LINE
    if (activeAlertJob && myActiveClaimedJobs.length === 0) {
      const alertCoords = resolveCoordinates(activeAlertJob, cities, regions, currentCoords);
      bounds.extend([alertCoords.lat, alertCoords.lng]);

      const polyline = L.polyline(
        [
          [currentCoords.lat, currentCoords.lng],
          [alertCoords.lat, alertCoords.lng]
        ],
        {
          color: '#EF4444',
          weight: 3,
          dashArray: '6, 8',
          opacity: 0.85
        }
      ).addTo(map);

      routeLineRef.current = polyline;
    }

    // E. CUSTOM SEARCHED DESTINATION PIN
    if (customDestination) {
      bounds.extend([customDestination.lat, customDestination.lng]);

      const customPinIcon = L.divIcon({
        className: 'custom-searched-marker',
        html: `
          <div style="position: relative; width: 44px; height: 44px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <div style="position: absolute; width: 46px; height: 46px; border-radius: 50%; background: rgba(99, 102, 241, 0.4); animation: radar-ping 1.5s infinite;"></div>
            <div style="width: 34px; height: 34px; border-radius: 50% 50% 50% 0; background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%); transform: rotate(-45deg); border: 2.5px solid #FFFFFF; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.5); display: flex; align-items: center; justify-content: center;">
              <span style="transform: rotate(45deg); font-size: 15px;">🎯</span>
            </div>
            <div style="position: absolute; top: -14px; background: #4F46E5; color: white; font-size: 9px; font-weight: 800; padding: 2px 6px; border-radius: 10px; border: 1px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">SEARCHED</div>
          </div>
        `,
        iconSize: [44, 44],
        iconAnchor: [22, 34]
      });

      const searchedMarker = L.marker([customDestination.lat, customDestination.lng], { icon: customPinIcon })
        .bindTooltip(`<b>${customDestination.title}</b><br/>${customDestination.subtitle || customDestination.fullAddress}`, {
          direction: 'top',
          offset: [0, -28]
        })
        .addTo(markersLayer);

      // Route line from Provider to Custom Destination
      const polyline = L.polyline(
        [
          [currentCoords.lat, currentCoords.lng],
          [customDestination.lat, customDestination.lng]
        ],
        {
          color: '#6366F1',
          weight: 4,
          dashArray: '8, 8',
          opacity: 0.9
        }
      ).addTo(map);

      routeLineRef.current = polyline;
    }

    // Camera Focus
    if (customDestination) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (myActiveClaimedJobs.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else if (activeAlertJob) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else {
      map.setView([currentCoords.lat, currentCoords.lng], 13);
    }
  }, [currentCoords, jobs, visibleJobs, activeAlertJob, selectedJob, activeProvider, customDestination]);

  // Center on Provider with fresh GPS coordinates
  const handleRecenter = async () => {
    const fresh = await refreshDeviceLocation();
    const target = fresh?.lat ? fresh : currentCoords;
    if (mapInstanceRef.current && target) {
      mapInstanceRef.current.flyTo([target.lat, target.lng], 14, {
        duration: 0.8
      });
    }
  };

  const activeClaimedJob = (jobs || []).find(j => {
    const st = (j.status || j.rawStatus || '').toUpperCase();
    if (st !== 'CLAIMED') return false;
    const provId = activeProvider?.id || activeProvider?.provider_id;
    const userId = activeProvider?.user_id;
    return (
      j.claimedBy?.id === provId ||
      j.claimedBy?.provider_id === provId ||
      (userId && j.claimedBy?.user_id === userId) ||
      (provId && j.provider_id === provId)
    );
  });

  return (
    <div
      style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        overflow: 'hidden',
        marginBottom: '1rem',
        transition: 'all 0.3s ease',
        position: 'relative'
      }}
    >
      <style>
        {`
          @keyframes radar-ping {
            0% { transform: scale(0.8); opacity: 0.9; }
            80%, 100% { transform: scale(2.2); opacity: 0; }
          }
          .leaflet-container {
            font-family: inherit !important;
          }
        `}
      </style>

      {/* Map Header Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: '#FFFFFF',
          flexWrap: 'wrap',
          gap: '6px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              background: customDestination
                ? 'rgba(99, 102, 241, 0.3)'
                : activeClaimedJob
                ? 'rgba(16, 185, 129, 0.25)'
                : 'rgba(59, 130, 246, 0.2)',
              color: customDestination
                ? '#818CF8'
                : activeClaimedJob
                ? '#10B981'
                : '#60A5FA',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Navigation size={15} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{customDestination ? 'Custom Search Pin' : activeClaimedJob ? 'Active Job Route' : 'Live Job Radar'}</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  background: customDestination ? '#6366F1' : activeClaimedJob ? '#10B981' : '#3B82F6',
                  color: '#FFFFFF'
                }}
              >
                {customDestination ? 'PINPOINT' : activeClaimedJob ? 'EN ROUTE' : (providerLiveCoords?.isGps ? '🛰️ GPS LIVE' : 'RADAR LIVE')}
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
              {customDestination
                ? `Custom pinpoint: ${customDestination.title}`
                : activeClaimedJob
                ? `Navigating to: ${activeClaimedJob.customerCity?.name || activeClaimedJob.location || 'Customer location'}`
                : `${(jobs || []).filter(j => (j.status || '').toUpperCase() === 'OPEN').length} active requests in service area`}
            </div>
          </div>
        </div>

        {/* Map Control Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Search on Map toggle */}
          <button
            onClick={() => setShowSearchBox(!showSearchBox)}
            title="Search Custom Address on Map"
            style={{
              background: showSearchBox ? '#F59E0B' : 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              padding: '6px 10px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 800
            }}
          >
            <Search size={13} />
            <span>{showSearchBox ? 'Close' : 'Search Address'}</span>
          </button>

          {activeClaimedJob && (
            <button
              onClick={() => {
                const destCoords = resolveCoordinates(activeClaimedJob, cities, regions, currentCoords);
                setNavTarget({
                  job: activeClaimedJob,
                  coords: destCoords,
                  address: activeClaimedJob.location || activeClaimedJob.customerCity?.name
                });
              }}
              title="Open Navigation App (Waze / Google Maps)"
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#FFFFFF',
                padding: '6px 10px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                fontWeight: 800,
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.4)'
              }}
            >
              <Compass size={13} />
              <span>Navigate</span>
            </button>
          )}

          <button
            onClick={handleRecenter}
            title="Recenter on My Location"
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              padding: '6px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              fontWeight: 700
            }}
          >
            <Crosshair size={13} />
            <span>Me</span>
          </button>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Minimize Map' : 'Expand Map'}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              borderRadius: '8px',
              color: '#FFFFFF',
              padding: '6px 8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </div>
      </div>

      {/* On-Map Search Bar Input Overlay */}
      {showSearchBox && (
        <div style={{
          padding: '8px 12px',
          background: '#F8FAFC',
          borderBottom: '1px solid #E2E8F0',
          position: 'relative',
          zIndex: 10
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#FFFFFF',
            border: '1.5px solid #CBD5E1',
            borderRadius: '8px',
            padding: '6px 10px',
            gap: '6px'
          }}>
            <Search size={15} style={{ color: '#F59E0B' }} />
            <input
              type="text"
              autoFocus
              placeholder="Search custom address (e.g. Golda Moti Kind Rehovot)..."
              value={mapSearchQuery}
              onChange={handleMapSearchChange}
              style={{
                border: 'none',
                background: 'transparent',
                width: '100%',
                fontSize: '0.82rem',
                fontWeight: 600,
                outline: 'none'
              }}
            />
            {isSearchingMap && <Loader2 size={14} className="animate-spin" style={{ color: '#94A3B8' }} />}
            {mapSearchQuery && (
              <button
                onClick={() => {
                  setMapSearchQuery('');
                  setMapSuggestions([]);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {mapSuggestions.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: '12px',
              right: '12px',
              background: '#FFFFFF',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
              border: '1px solid #E2E8F0',
              marginTop: '4px',
              maxHeight: '200px',
              overflowY: 'auto',
              zIndex: 30
            }}>
              {mapSuggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleSelectMapSuggestion(item)}
                  style={{
                    padding: '8px 12px',
                    borderBottom: idx < mapSuggestions.length - 1 ? '1px solid #F1F5F9' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#EEF2FF'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                >
                  <MapPin size={15} style={{ color: '#6366F1', flexShrink: 0 }} />
                  <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.title}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.subtitle}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Map Leaflet Canvas */}
      <div
        ref={mapContainerRef}
        style={{
          width: '100%',
          height: isExpanded ? '380px' : '230px',
          background: '#E2E8F0',
          transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1
        }}
      />

      {/* Custom Searched Pin Overlay Card */}
      {customDestination && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            padding: '12px',
            border: '1.5px solid #6366F1',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.2)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: '#EEF2FF',
                  color: '#4F46E5'
                }}
              >
                🎯 CUSTOM PINPOINT
              </span>
              {currentCoords && customDestination && (
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#059669' }}>
                  📍 {calculateDistanceKm(currentCoords.lat, currentCoords.lng, customDestination.lat, customDestination.lng)} km away
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '0.85rem',
                fontWeight: 800,
                color: '#1E293B',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {customDestination.title}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {customDestination.subtitle || customDestination.fullAddress}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => {
                setNavTarget({
                  job: { problem: customDestination.title, description: customDestination.subtitle },
                  coords: { lat: customDestination.lat, lng: customDestination.lng, isExact: true },
                  address: customDestination.fullAddress || customDestination.title
                });
              }}
              title="Navigate with Waze or Google Maps"
              style={{
                background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)'
              }}
            >
              <Compass size={14} />
              <span>Navigate</span>
            </button>

            <button
              onClick={handleClearCustomDestination}
              style={{
                background: '#F1F5F9',
                color: '#64748B',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Selected Job Quick Preview Overlay Card */}
      {!customDestination && selectedJob && (
        <div
          style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            right: '12px',
            background: 'rgba(255, 255, 255, 0.96)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            padding: '12px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px'
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  padding: '2px 6px',
                  borderRadius: '6px',
                  background: '#FEF3C7',
                  color: '#D97706',
                  textTransform: 'uppercase'
                }}
              >
                {selectedJob.category || selectedJob.role_id}
              </span>
              {currentCoords && selectedJob.coords && (
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#3B82F6' }}>
                  📍 {calculateDistanceKm(currentCoords.lat, currentCoords.lng, selectedJob.coords.lat, selectedJob.coords.lng)} km away
                </span>
              )}
            </div>
            <div
              style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: '#1E293B',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {selectedJob.problem || selectedJob.description}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748B' }}>
              {selectedJob.location || 'Local area'} • Est: <strong style={{ color: '#059669' }}>{selectedJob.estimatedPayout || '$120 - $160'}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => {
                setNavTarget({
                  job: selectedJob,
                  coords: selectedJob.coords,
                  address: selectedJob.location
                });
              }}
              title="Navigate in Waze / Maps"
              style={{
                background: '#EEF2FF',
                color: '#4F46E5',
                border: '1px solid #C7D2FE',
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Compass size={13} />
              <span>Nav</span>
            </button>

            <button
              onClick={() => {
                claimJob(selectedJob.id || selectedJob.job_id);
                setSelectedJob(null);
              }}
              style={{
                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '0.78rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)'
              }}
            >
              <CheckCircle2 size={13} />
              <span>Claim</span>
            </button>
            <button
              onClick={() => setSelectedJob(null)}
              style={{
                background: '#F1F5F9',
                color: '#64748B',
                border: 'none',
                borderRadius: '8px',
                padding: '8px',
                fontSize: '0.75rem',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* External Navigation Selection Modal */}
      <NavigationModal
        isOpen={!!navTarget}
        onClose={() => setNavTarget(null)}
        targetJob={navTarget?.job}
        coords={navTarget?.coords}
        address={navTarget?.address}
      />
    </div>
  );
};
