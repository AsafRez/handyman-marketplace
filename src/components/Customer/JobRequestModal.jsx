import React, { useState, useEffect, useRef } from 'react';
import { X, MapPin, Phone, AlertTriangle, Zap, CheckCircle2, Upload, Sparkles, Send, Search, Crosshair, Map as MapIcon, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { sanitizeText, formatPhoneNumber } from '../../utils/sanitizer';
import { useMarketplace } from '../../context/MarketplaceContext';
import { searchAddressSuggestions, reverseGeocodeAddress, forwardGeocodeAddress } from '../../utils/geoAiEngine';

export const JobRequestModal = ({ category, onClose, onSubmit }) => {
  const { onlineProsByTrade, currentUser, cities, regions, providerLiveCoords, refreshDeviceLocation } = useMarketplace();
  const [problem, setProblem] = useState(category.popularProblems[0] || '');
  const [customDescription, setCustomDescription] = useState('');
  const [phone, setPhone] = useState(currentUser?.phone || '+1 (555) 389-4920');

  // Address & Coordinate state
  const defaultLoc = currentUser?.city
    ? `${currentUser.city.name}, Israel`
    : 'Golda, Moti Kind, Rehovot, Israel';
  const [location, setLocation] = useState(defaultLoc);
  const [selectedCoords, setSelectedCoords] = useState(
    currentUser?.city?.lat && currentUser?.city?.lng
      ? { lat: Number(currentUser.city.lat), lng: Number(currentUser.city.lng) }
      : { lat: 31.8946, lng: 34.7896 }
  );
  const [urgency, setUrgency] = useState('HIGH');
  const [hasPhoto, setHasPhoto] = useState(false);

  // Search & Map states
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [isGpsLoading, setIsGpsLoading] = useState(false);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const pinMarkerRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Auto-forward geocode initial text if needed
  useEffect(() => {
    if (location && (!selectedCoords || selectedCoords.lat === 31.8946)) {
      forwardGeocodeAddress(location, cities, regions).then(res => {
        if (res?.lat && res?.lng) {
          setSelectedCoords({ lat: Number(res.lat), lng: Number(res.lng) });
        }
      });
    }
  }, []);

  // Debounced search suggestions as user types
  const handleLocationChange = (e) => {
    const val = e.target.value;
    setLocation(val);

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!val || val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsSearching(true);
    setShowSuggestions(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchAddressSuggestions(val, 5, cities, regions);
        setSuggestions(results);
      } catch (err) {
        console.warn('Autocomplete search failed:', err);
      } finally {
        setIsSearching(false);
      }
    }, 280);
  };

  const handleSelectSuggestion = (item) => {
    setLocation(item.fullAddress || `${item.title}, ${item.subtitle}`);
    setSelectedCoords({ lat: item.lat, lng: item.lng });
    setShowSuggestions(false);
    setSuggestions([]);

    // Pan map if open
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([item.lat, item.lng], 16);
      if (pinMarkerRef.current) {
        pinMarkerRef.current.setLatLng([item.lat, item.lng]);
      }
    }
  };

  // Quick GPS Locate
  const handleQuickLocate = async () => {
    setIsGpsLoading(true);
    try {
      const loc = await refreshDeviceLocation();
      if (loc?.lat && loc?.lng) {
        const geo = await reverseGeocodeAddress(loc, cities, regions);
        const addrText = geo?.fullAddress || `${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}`;
        setLocation(addrText);
        setSelectedCoords({ lat: Number(loc.lat), lng: Number(loc.lng) });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([loc.lat, loc.lng], 16);
          if (pinMarkerRef.current) {
            pinMarkerRef.current.setLatLng([loc.lat, loc.lng]);
          }
        }
      }
    } catch (e) {
      console.warn('GPS Locate failed:', e);
    } finally {
      setIsGpsLoading(false);
    }
  };

  // Initialize Map Picker when toggled open
  useEffect(() => {
    if (!showMapPicker) {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      return;
    }

    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;
      const initialLat = selectedCoords?.lat || 31.8946;
      const initialLng = selectedCoords?.lng || 34.7896;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      // Custom Draggable Pin
      const pinIcon = L.divIcon({
        className: 'custom-job-pin',
        html: `
          <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 42px; height: 42px; border-radius: 50%; background: rgba(245, 158, 11, 0.35); animation: radar-ping 1.6s infinite;"></div>
            <div style="width: 32px; height: 32px; border-radius: 50% 50% 50% 0; background: #F59E0B; transform: rotate(-45deg); border: 2.5px solid #FFFFFF; box-shadow: 0 4px 12px rgba(245, 158, 11, 0.5); display: flex; align-items: center; justify-content: center;">
              <span style="transform: rotate(45deg); font-size: 14px;">📍</span>
            </div>
          </div>
        `,
        iconSize: [38, 38],
        iconAnchor: [19, 32]
      });

      const marker = L.marker([initialLat, initialLng], {
        icon: pinIcon,
        draggable: true
      }).addTo(map);

      const updatePinLocation = async (lat, lng) => {
        setSelectedCoords({ lat, lng });
        const rev = await reverseGeocodeAddress({ lat, lng }, cities, regions);
        if (rev?.fullAddress) {
          setLocation(rev.fullAddress);
        }
      };

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        updatePinLocation(lat, lng);
      });

      map.on('click', (e) => {
        const { lat, lng } = e.latlng;
        marker.setLatLng([lat, lng]);
        updatePinLocation(lat, lng);
      });

      pinMarkerRef.current = marker;
      mapInstanceRef.current = map;
    }, 150);

    return () => {
      clearTimeout(timer);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [showMapPicker]);

  const handleSubmit = (e) => {
    e.preventDefault();

    // Sanitize all text fields to prevent XSS / SQL injection
    const cleanProblem = sanitizeText(problem);
    const cleanCustomDesc = sanitizeText(customDescription);
    const cleanLocation = sanitizeText(location);
    const cleanPhone = formatPhoneNumber(phone) || '+1 (555) 000-0000';

    const finalProblem = cleanCustomDesc ? `${cleanProblem} - ${cleanCustomDesc}` : cleanProblem;

    onSubmit({
      category: category.id,
      problem: finalProblem,
      phone: cleanPhone,
      location: cleanLocation,
      lat: selectedCoords?.lat || null,
      lng: selectedCoords?.lng || null,
      isExact: true,
      urgency,
      estimatedPayout: urgency === 'URGENT' ? '$160 - $220' : '$120 - $160'
    });
  };

  const handlePhoneChange = (e) => {
    const rawVal = e.target.value;
    setPhone(formatPhoneNumber(rawVal));
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.65)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 200,
      padding: '1rem'
    }}>
      <div className="animate-slide-up" style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid #E2E8F0'
      }}>
        {/* Header Bar */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: category.gradient
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: category.badgeColor,
              boxShadow: 'var(--shadow-sm)'
            }}>
              <Zap size={22} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Request {category.title}
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {onlineProsByTrade?.[category.id] || 0} verified pros available in your area
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.8)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-muted)'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
          {/* Preset Problem Selection */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Select Frequent Issue:
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {category.popularProblems.map((prob, idx) => (
                <div
                  key={idx}
                  onClick={() => setProblem(prob)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: problem === prob ? `2px solid ${category.badgeColor}` : '1px solid #E2E8F0',
                    background: problem === prob ? '#FEF3C722' : '#FFFFFF',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    fontWeight: problem === prob ? 700 : 500,
                    color: problem === prob ? 'var(--text-main)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{prob}</span>
                  {problem === prob && <CheckCircle2 size={16} style={{ color: category.badgeColor }} />}
                </div>
              ))}
            </div>
          </div>

          {/* Additional details */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Additional Details (Optional):
            </label>
            <textarea
              rows={2}
              maxLength={500}
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              placeholder="Describe specifics (e.g., brand of lock, panel location)..."
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #E2E8F0',
                fontSize: '0.85rem',
                color: 'var(--text-main)',
                resize: 'none'
              }}
            />
          </div>

          {/* Location & Phone grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {/* Interactive Address Search Input with Autocomplete */}
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  Service Address (Search or Pin on Map):
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleQuickLocate}
                    disabled={isGpsLoading}
                    style={{
                      fontSize: '0.72rem',
                      color: '#2563EB',
                      background: '#EFF6FF',
                      border: '1px solid #BFDBFE',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {isGpsLoading ? <Loader2 size={12} className="animate-spin" /> : <Crosshair size={12} />}
                    <span>My GPS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowMapPicker(!showMapPicker)}
                    style={{
                      fontSize: '0.72rem',
                      color: showMapPicker ? '#FFFFFF' : '#D97706',
                      background: showMapPicker ? '#D97706' : '#FEF3C7',
                      border: '1px solid #FDE68A',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <MapIcon size={12} />
                    <span>{showMapPicker ? 'Hide Map' : 'Pick on Map 📍'}</span>
                  </button>
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#F8FAFC',
                border: '1.5px solid #CBD5E1',
                borderRadius: 'var(--radius-sm)',
                padding: '8px 12px',
                position: 'relative'
              }}>
                <Search size={16} style={{ color: 'var(--primary-amber)', marginRight: '6px', flexShrink: 0 }} />
                <input
                  type="text"
                  required
                  maxLength={250}
                  value={location}
                  onChange={handleLocationChange}
                  onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true); }}
                  placeholder="Type street, landmark or business (e.g. Golda Moti Kind Rehovot)..."
                  style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
                />
                {isSearching && <Loader2 size={15} className="animate-spin" style={{ color: '#94A3B8' }} />}
              </div>

              {/* Autocomplete Suggestions Dropdown */}
              {showSuggestions && suggestions.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 300,
                  background: '#FFFFFF',
                  borderRadius: '10px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
                  border: '1px solid #E2E8F0',
                  marginTop: '4px',
                  maxHeight: '220px',
                  overflowY: 'auto'
                }}>
                  {suggestions.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectSuggestion(item)}
                      style={{
                        padding: '10px 14px',
                        borderBottom: idx < suggestions.length - 1 ? '1px solid #F1F5F9' : 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#FEF3C722'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#FFFFFF'}
                    >
                      <MapPin size={16} style={{ color: '#F59E0B', flexShrink: 0 }} />
                      <div style={{ textAlign: 'left', flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.subtitle}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Interactive Map Picker Container */}
            {showMapPicker && (
              <div style={{
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1.5px solid #F59E0B',
                boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
                background: '#F8FAFC'
              }}>
                <div style={{
                  padding: '6px 12px',
                  background: '#FEF3C7',
                  color: '#92400E',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span>📍 Click anywhere or drag the pin to set the exact service spot</span>
                  <span style={{ fontFamily: 'monospace' }}>
                    {selectedCoords ? `${selectedCoords.lat.toFixed(4)}, ${selectedCoords.lng.toFixed(4)}` : ''}
                  </span>
                </div>
                <div
                  ref={mapContainerRef}
                  style={{ width: '100%', height: '180px', background: '#E2E8F0' }}
                />
              </div>
            )}

            {/* Phone input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                Callback Phone:
              </label>
              <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                <Phone size={16} style={{ color: 'var(--accent-emerald)', marginRight: '6px' }} />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="Digits only (e.g. +1 555-0123)"
                  style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.82rem', fontWeight: 600 }}
                />
              </div>
            </div>
          </div>

          {/* Urgency Radio Selector */}
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Urgency Level:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {[
                { id: 'URGENT', label: '🚨 Immediate', sub: 'Pro arrives in 15-30m' },
                { id: 'HIGH', label: '⚡ Today', sub: 'Within 2-4 hours' },
                { id: 'FLEXIBLE', label: '📅 Scheduled', sub: 'Flexible timeline' }
              ].map(u => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUrgency(u.id)}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: urgency === u.id ? '2px solid var(--primary-amber)' : '1px solid #E2E8F0',
                    background: urgency === u.id ? '#FEF3C7' : '#F8FAFC',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)' }}>{u.label}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{u.sub}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Optional Photo Attachment Demo */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div
              onClick={() => setHasPhoto(!hasPhoto)}
              style={{
                padding: '12px',
                borderRadius: 'var(--radius-sm)',
                border: '1.5px dashed #CBD5E1',
                background: hasPhoto ? '#ECFDF5' : '#F8FAFC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: hasPhoto ? 'var(--accent-emerald)' : 'var(--text-muted)'
              }}
            >
              <Upload size={16} />
              <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                {hasPhoto ? 'Photo Attached (panel_breaker_damaged.jpg)' : 'Click to attach photo of the issue (Demo)'}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: '#F1F5F9',
                color: 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #F59E0B 0%, #FF6B35 100%)',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.92rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-glow)'
              }}
            >
              <Send size={18} />
              <span>Broadcast Request Now</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
