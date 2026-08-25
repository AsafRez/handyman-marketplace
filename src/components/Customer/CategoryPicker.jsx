import React, { useState } from 'react';
import { SERVICE_CATEGORIES } from '../../data/mockData';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Zap, Droplet, Key, Snowflake, Hammer, Paintbrush, ArrowRight, ShieldCheck, Clock, Search, Sparkles } from 'lucide-react';

const iconMap = {
  Zap,
  Droplet,
  Key,
  Snowflake,
  Hammer,
  Paintbrush
};

export const CategoryPicker = ({ onSelectCategory }) => {
  const { onlineProsByTrade } = useMarketplace();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = SERVICE_CATEGORIES.filter(cat =>
    cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.tagline.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.popularProblems.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div style={{ padding: '1rem 0' }}>
      {/* Hero Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        color: '#FFFFFF',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-lg)',
        marginBottom: '2rem'
      }}>
        {/* Abstract glowing background shapes */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '220px',
          height: '220px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245, 158, 11, 0.25) 0%, rgba(245, 158, 11, 0) 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '650px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#F59E0B',
            fontSize: '0.78rem',
            fontWeight: 700,
            marginBottom: '1rem'
          }}>
            <Sparkles size={14} />
            <span>INSTANT HANDYMAN MATCHING</span>
          </div>

          <h2 style={{ fontSize: '2rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '0.75rem', letterSpacing: '-0.02em', color: '#FFFFFF' }}>
            What do you need fixed today?
          </h2>

          <p style={{ fontSize: '0.95rem', color: '#94A3B8', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            Broadcast your repair request instantly to verified local pros. First available specialist locks in your job with zero waiting!
          </p>

          {/* Quick Search Input */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#FFFFFF',
            borderRadius: 'var(--radius-md)',
            padding: '6px 12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <Search size={20} style={{ color: 'var(--text-muted)', marginRight: '8px' }} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search problem (e.g. breaker tripping, pipe leak, locked out)..."
              style={{
                border: 'none',
                width: '100%',
                fontSize: '0.92rem',
                color: 'var(--text-main)',
                background: 'transparent'
              }}
            />
          </div>
        </div>
      </div>

      {/* Category Grid Section */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.25rem'
      }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Select Service Category
          </h3>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Choose a trade to broadcast your emergency or scheduled job
          </p>
        </div>

        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck size={16} /> 100% Background Checked Pros
        </span>
      </div>

      {/* Grid of Categories */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '1.25rem'
      }}>
        {filteredCategories.map(cat => {
          const IconComp = iconMap[cat.iconName] || Zap;
          return (
            <div
              key={cat.id}
              onClick={() => onSelectCategory(cat)}
              style={{
                background: '#FFFFFF',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                border: '1px solid #E2E8F0',
                boxShadow: 'var(--shadow-sm)',
                cursor: 'pointer',
                transition: 'all var(--transition-normal)',
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                e.currentTarget.style.borderColor = cat.badgeColor;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                e.currentTarget.style.borderColor = '#E2E8F0';
              }}
            >
              <div>
                {/* Header row inside card */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <div style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '16px',
                    background: cat.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: cat.badgeColor,
                    boxShadow: `0 6px 16px ${cat.badgeColor}22`
                  }}>
                    <IconComp size={26} />
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: '#ECFDF5',
                      color: 'var(--accent-emerald)',
                      border: '1px solid #A7F3D0'
                    }}>
                      <Clock size={12} /> {cat.avgResponse}
                    </span>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {onlineProsByTrade?.[cat.id] || 0} Pros Online Now
                    </div>
                  </div>
                </div>

                <h4 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                  {cat.title}
                </h4>

                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', minHeight: '38px' }}>
                  {cat.tagline}
                </p>

                {/* Sample Problems Pill Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.25rem' }}>
                  {cat.popularProblems.slice(0, 3).map((prob, i) => (
                    <span key={i} style={{
                      fontSize: '0.72rem',
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      color: 'var(--text-muted)',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      {prob}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-md)',
                  background: cat.gradient,
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  border: `1px solid ${cat.badgeColor}33`
                }}
              >
                <span>Request {cat.title}</span>
                <ArrowRight size={16} style={{ color: cat.badgeColor }} />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
