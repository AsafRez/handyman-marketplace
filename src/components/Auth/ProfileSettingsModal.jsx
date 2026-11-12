import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMarketplace } from '../../context/MarketplaceContext';
import { X, User, Phone, MapPin, Check, Sparkles } from 'lucide-react';

export const ProfileSettingsModal = ({ onClose }) => {
  const {
    currentUser,
    regions,
    cities,
    updateUserProfile,
    providersTable,
    aiDetectedLocation,
    refreshDeviceLocation
  } = useMarketplace();

  const isProvider = currentUser && currentUser.role !== 'customer';

  // Find provider record if applicable to get preferred_region_id
  const providerRecord = isProvider 
    ? providersTable.find(p => p.user_id === currentUser.user_id) 
    : null;

  // Form states
  const [name, setName] = useState(currentUser?.name || '');
  const [phone, setPhone] = useState(currentUser?.phone || '');
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [preferredRegionId, setPreferredRegionId] = useState('');
  const [successMsg, setSuccessMsg] = useState('');


  // Initial populate
  useEffect(() => {
    if (currentUser) {
      setName(currentUser.name);
      setPhone(currentUser.phone);
      if (currentUser.city) {
        setSelectedCityId(currentUser.city.id.toString());
        setSelectedRegionId(currentUser.city.region_id.toString());
      }
    }
    if (providerRecord && providerRecord.preferred_region_id) {
      setPreferredRegionId(providerRecord.preferred_region_id.toString());
    }
  }, [currentUser, providerRecord]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMsg('');

    const profileData = {
      name,
      phone,
      city_id: selectedCityId ? parseInt(selectedCityId, 10) : null
    };

    if (isProvider) {
      profileData.preferred_region_id = preferredRegionId ? parseInt(preferredRegionId, 10) : null;
    }


    await updateUserProfile(profileData);
    setSuccessMsg('Profile updated successfully!');
    setTimeout(() => {
      setSuccessMsg('');
      onClose();
    }, 1500);
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 300,
      padding: '1rem'
    }}>
      <div className="animate-slide-up" style={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
        border: '1px solid rgba(255, 255, 255, 0.25)',
        overflow: 'hidden',
        color: 'var(--text-main)'
      }}>
        {/* Header */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid #E2E8F0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          color: '#FFFFFF'
        }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#FFFFFF' }}>Edit Profile Settings</h3>
            <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginTop: '2px' }}>
              Update your location & account preferences
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              background: 'rgba(255, 255, 255, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {successMsg && (
            <div style={{
              background: '#ECFDF5',
              border: '1px solid #A7F3D0',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 12px',
              fontSize: '0.8rem',
              color: '#065F46',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
              Full Name:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
              <User size={16} style={{ color: 'var(--text-muted)', marginRight: '6px' }} />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
              Phone Number:
            </label>
            <div style={{ display: 'flex', alignItems: 'center', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
              <Phone size={16} style={{ color: 'var(--text-muted)', marginRight: '6px' }} />
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{ border: 'none', background: 'transparent', width: '100%', fontSize: '0.85rem', fontWeight: 600, outline: 'none' }}
              />
            </div>
          </div>

          {/* AI Auto-Detect Button */}
          <button
            type="button"
            onClick={async () => {
              const fresh = await refreshDeviceLocation();
              if (aiDetectedLocation?.regionId && aiDetectedLocation?.cityId) {
                setSelectedRegionId(aiDetectedLocation.regionId.toString());
                setSelectedCityId(aiDetectedLocation.cityId.toString());
                if (isProvider) {
                  setPreferredRegionId(aiDetectedLocation.regionId.toString());
                }
                setSuccessMsg(`✨ AI detected: ${aiDetectedLocation.city?.name}`);
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)',
              border: '1.5px solid #C7D2FE',
              color: '#4338CA',
              fontSize: '0.82rem',
              fontWeight: 800,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(99, 102, 241, 0.15)'
            }}
          >
            <Sparkles size={15} />
            <span>✨ AI Auto-Detect My Region & City</span>
          </button>

          {/* User Region */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
              Your Region:
            </label>
            <select
              value={selectedRegionId}
              onChange={(e) => {
                setSelectedRegionId(e.target.value);
                setSelectedCityId('');
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #E2E8F0',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: '#F8FAFC',
                color: 'var(--text-main)'
              }}
            >
              <option value="">Select Region</option>
              {regions.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          {/* User City */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
              Your City:
            </label>
            <select
              value={selectedCityId}
              disabled={!selectedRegionId}
              onChange={(e) => setSelectedCityId(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid #E2E8F0',
                fontSize: '0.85rem',
                fontWeight: 600,
                background: selectedRegionId ? '#F8FAFC' : '#E2E8F0',
                color: 'var(--text-main)',
                cursor: selectedRegionId ? 'pointer' : 'not-allowed'
              }}
            >
              <option value="">Select City</option>
              {cities.filter(c => c.region_id === parseInt(selectedRegionId, 10)).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Provider Work Region Preference */}
          {isProvider && (
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.82rem', fontWeight: 700, marginBottom: '4px' }}>
                <MapPin size={14} style={{ color: '#F59E0B' }} />
                Preferred Work Region:
              </label>
              <select
                value={preferredRegionId}
                onChange={(e) => setPreferredRegionId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid #E2E8F0',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  background: '#F8FAFC',
                  color: 'var(--text-main)'
                }}
              >
                <option value="">Select Region</option>
                {regions.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          )}


          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                background: '#F1F5F9',
                border: 'none',
                color: 'var(--text-muted)',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, #F59E0B 0%, #FF6B35 100%)',
                border: 'none',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
              }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
