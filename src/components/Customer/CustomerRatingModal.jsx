import React, { useState, useEffect } from 'react';
import { Star, CheckCircle2, Sparkles, X, MessageSquare } from 'lucide-react';
import { supabase } from '../../db/supabaseClient';

const STAR_DESCRIPTIONS = {
  1: 'Unsatisfactory',
  2: 'Below Expectations',
  3: 'Good Service',
  4: 'Great Job!',
  5: 'Exceptional Service! 🌟'
};

const COMPLIMENT_CHIPS = [
  '⏱️ On-time arrival',
  '💵 Fair & transparent pricing',
  '🧹 Cleaned up workspace',
  '🤝 Friendly & polite',
  '⚡ Fast & expert fix',
  '🛠️ Professional tools'
];

export const CustomerRatingModal = ({ job, onSubmitReview, onClose }) => {
  const [provider, setProvider] = useState(job.claimedBy || null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedChips, setSelectedChips] = useState(['⏱️ On-time arrival', '⚡ Fast & expert fix']);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (job.claimedBy) {
      setProvider(job.claimedBy);
      return;
    }
    if (!job.provider_id) return;

    const fetchProviderFallback = async () => {
      try {
        const { data: provRec } = await supabase
          .from('providers')
          .select('*')
          .eq('provider_id', job.provider_id)
          .maybeSingle();

        if (provRec) {
          const { data: usrRec } = await supabase
            .from('users')
            .select('*')
            .eq('user_id', provRec.user_id)
            .maybeSingle();

          if (usrRec) {
            setProvider({
              ...provRec,
              id: provRec.provider_id,
              name: usrRec.name || 'Unknown Pro',
              phone: usrRec.phone || '',
              email: usrRec.email || '',
              avatar: provRec.avatar || 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80',
              title: provRec.title || `Licensed ${provRec.role_id} Specialist`,
              rating: provRec.rating || 5.0,
              jobsCompleted: provRec.jobs_completed || 0
            });
          }
        }
      } catch (e) {
        console.error('Failed to fetch provider fallback in CustomerRatingModal:', e);
      }
    };

    fetchProviderFallback();
  }, [job?.claimedBy, job?.provider_id]);

  const toggleChip = (chip) => {
    if (selectedChips.includes(chip)) {
      setSelectedChips(selectedChips.filter(c => c !== chip));
    } else {
      setSelectedChips([...selectedChips, chip]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmitReview(job.id, {
      rating,
      compliments: selectedChips,
      comment,
      submittedAt: Date.now()
    });
    setSubmitted(true);
  };

  if (!provider) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(10px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 250,
      padding: '1rem'
    }}>
      <div className="animate-slide-up" style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '540px',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: 'var(--shadow-lg)',
        border: '1px solid #E2E8F0'
      }}>
        {!submitted ? (
          <div>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
              padding: '1.5rem',
              color: '#FFFFFF',
              textAlign: 'center',
              position: 'relative'
            }}>
              <button
                onClick={onClose}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#FFFFFF',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={16} />
              </button>

              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                margin: '0 auto 0.75rem auto',
                border: '3px solid var(--primary-amber)',
                overflow: 'hidden',
                boxShadow: 'var(--shadow-glow)'
              }}>
                <img src={provider.avatar} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>

              <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent-emerald)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                JOB MARKED COMPLETE 🏁
              </div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>
                How was your service with {provider.name}?
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#94A3B8', marginTop: '4px' }}>
                {provider.title} • {job.category.toUpperCase()}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem' }}>
              {/* Star Rating Selector */}
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  Tap to rate your experience:
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map((star) => {
                    const active = (hoverRating || rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: '4px',
                          cursor: 'pointer',
                          transform: active ? 'scale(1.15)' : 'scale(1)',
                          transition: 'transform 0.15s ease'
                        }}
                      >
                        <Star
                          size={34}
                          fill={active ? '#F59E0B' : 'transparent'}
                          color={active ? '#F59E0B' : '#CBD5E1'}
                        />
                      </button>
                    );
                  })}
                </div>

                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--primary-amber)' }}>
                  {STAR_DESCRIPTIONS[hoverRating || rating]}
                </div>
              </div>

              {/* Compliments Chips */}
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  What went great? (Select all that apply)
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {COMPLIMENT_CHIPS.map((chip, idx) => {
                    const selected = selectedChips.includes(chip);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleChip(chip)}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.78rem',
                          fontWeight: selected ? 700 : 500,
                          background: selected ? '#ECFDF5' : '#F8FAFC',
                          color: selected ? 'var(--accent-emerald)' : 'var(--text-muted)',
                          border: selected ? '1.5px solid #10B981' : '1px solid #E2E8F0',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {chip}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Written Review */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                  Leave a written review:
                </label>
                <textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={`"${provider.name.split(' ')[0]} arrived super fast, explained the issue clearly, and fixed it in 20 minutes!"`}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid #E2E8F0',
                    fontSize: '0.85rem',
                    color: 'var(--text-main)',
                    resize: 'none'
                  }}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                style={{
                  width: '100%',
                  padding: '14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                  color: '#FFFFFF',
                  fontWeight: 800,
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.3)'
                }}
              >
                <Sparkles size={18} />
                <span>Submit Review & Rating</span>
              </button>
            </form>
          </div>
        ) : (
          /* Confirmation Success State */
          <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: '#ECFDF5',
              color: 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem auto'
            }}>
              <CheckCircle2 size={48} />
            </div>

            <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
              Thank You for Rating! ⭐
            </h3>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Your feedback helped update {provider.name}'s overall pro rating. Thank you for helping our community!
            </p>

            <button
              onClick={onClose}
              style={{
                padding: '12px 24px',
                borderRadius: 'var(--radius-md)',
                background: '#0F172A',
                color: '#FFFFFF',
                fontWeight: 800,
                fontSize: '0.9rem'
              }}
            >
              Back to Home
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
