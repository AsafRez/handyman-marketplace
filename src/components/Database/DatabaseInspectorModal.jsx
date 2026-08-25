import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { useMarketplace } from '../../context/MarketplaceContext';
import { Database, Table, Key, Code, X, ShieldCheck, User, RefreshCw, Copy, Check } from 'lucide-react';

export const DatabaseInspectorModal = ({ onClose }) => {
  const { users, roles, providersTable, jobsTable, resetState, regions, cities } = useMarketplace();
  const [activeTab, setActiveTab] = useState('jobs');
  const [copied, setCopied] = useState(false);

  const rawSqlSchema = `-- HandyHub Relational Database Schema (PostgreSQL / Supabase Ready)

CREATE TABLE regions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL
);

CREATE TABLE cities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  region_id INTEGER NOT NULL REFERENCES regions(id) ON DELETE CASCADE
);

CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  location TEXT NOT NULL,
  city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
  role_id VARCHAR(50) PRIMARY KEY,
  role_name VARCHAR(100) NOT NULL
);

CREATE TABLE providers (
  provider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  role_id VARCHAR(50) NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  rating NUMERIC(3, 2) DEFAULT 5.00,
  verified BOOLEAN DEFAULT TRUE,
  preferred_region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_role UNIQUE(user_id, role_id)
);

CREATE TABLE jobs (
  job_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  provider_id UUID REFERENCES providers(provider_id) ON DELETE SET NULL,
  role_id VARCHAR(50) NOT NULL REFERENCES roles(role_id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  location TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'completed', 'cancelled')),
  cancel_reason TEXT,
  cancelled_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  accepted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);`;

  const copySql = () => {
    navigator.clipboard.writeText(rawSqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(15, 23, 42, 0.88)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 500,
      padding: 'max(0.75rem, env(safe-area-inset-top)) 0.5rem 0.75rem 0.5rem'
    }}>
      <div className="animate-slide-up" style={{
        background: '#0F172A',
        color: '#F8FAFC',
        borderRadius: 'var(--radius-lg)',
        width: '100%',
        maxWidth: '960px',
        height: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)',
        border: '1.5px solid rgba(99, 102, 241, 0.4)',
        overflow: 'hidden'
      }}>
        {/* Mobile-Friendly Header Bar */}
        <div style={{
          padding: '0.85rem 1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.05)',
          gap: '0.5rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF'
            }}>
              <Database size={17} />
            </div>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#FFFFFF', lineHeight: 1.2 }}>
                Database Inspector
              </h3>
              <p style={{ fontSize: '0.7rem', color: '#94A3B8' }}>
                6 Relational Tables • PostgreSQL / Supabase Ready
              </p>
            </div>
          </div>

          {/* Prominent Close Button */}
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: '#F43F5E',
              border: 'none',
              color: '#FFFFFF',
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(244, 63, 94, 0.3)'
            }}
          >
            <X size={15} />
            <span>Close</span>
          </button>
        </div>

        {/* Table Selector Tabs */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '0.4rem 0.75rem',
          background: 'rgba(0, 0, 0, 0.3)',
          overflowX: 'auto'
        }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {[
              { id: 'jobs', label: `jobs (${jobsTable.length})`, icon: Table },
              { id: 'providers', label: `providers (${providersTable.length})`, icon: ShieldCheck },
              { id: 'users', label: `users (${users.length})`, icon: User },
              { id: 'regions', label: `regions (${regions?.length || 0})`, icon: Table },
              { id: 'cities', label: `cities (${cities?.length || 0})`, icon: Table },
              { id: 'roles', label: `roles (${roles.length})`, icon: Key },
              { id: 'sql', label: 'schema.sql', icon: Code }
            ].map(tab => {
              const IconComp = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: active ? 700 : 500,
                    background: active ? '#6366F1' : 'transparent',
                    color: active ? '#FFFFFF' : '#94A3B8',
                    border: 'none',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <IconComp size={13} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <button
            onClick={resetState}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              color: '#94A3B8',
              background: 'transparent',
              border: 'none',
              whiteSpace: 'nowrap',
              marginLeft: '8px'
            }}
          >
            <RefreshCw size={11} /> Reset
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div style={{ flex: 1, padding: '1rem 0.75rem', overflowY: 'auto' }}>
          {activeTab === 'jobs' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', color: '#A5B4FC' }}>
                    <th style={{ padding: '6px' }}>job_id (PK)</th>
                    <th style={{ padding: '6px' }}>customer_id (FK → users)</th>
                    <th style={{ padding: '6px' }}>provider_id (FK → providers)</th>
                    <th style={{ padding: '6px' }}>role_id</th>
                    <th style={{ padding: '6px' }}>description</th>
                    <th style={{ padding: '6px' }}>status</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsTable.map(job => (
                    <tr key={job.job_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#E2E8F0' }}>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#F59E0B' }}>{job.job_id}</td>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#38BDF8' }}>{job.customer_id}</td>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: job.provider_id ? '#34D399' : '#64748B' }}>
                        {job.provider_id || 'NULL'}
                      </td>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#A78BFA' }}>{job.role_id}</td>
                      <td style={{ padding: '8px 6px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.description}
                      </td>
                      <td style={{ padding: '8px 6px' }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontSize: '0.65rem',
                          fontWeight: 800,
                          background: job.status === 'open' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(52, 211, 153, 0.2)',
                          color: job.status === 'open' ? '#F59E0B' : '#34D399'
                        }}>
                          {job.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'providers' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', color: '#A5B4FC' }}>
                    <th style={{ padding: '6px' }}>provider_id (PK)</th>
                    <th style={{ padding: '6px' }}>user_id (FK → users)</th>
                    <th style={{ padding: '6px' }}>role_id (FK → roles)</th>
                    <th style={{ padding: '6px' }}>title</th>
                    <th style={{ padding: '6px' }}>rating</th>
                    <th style={{ padding: '6px' }}>preferred_region_id (FK)</th>
                  </tr>
                </thead>
                <tbody>
                  {providersTable.map(p => (
                    <tr key={p.provider_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#E2E8F0' }}>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#34D399' }}>{p.provider_id}</td>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#38BDF8' }}>{p.user_id}</td>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#A78BFA' }}>{p.role_id}</td>
                      <td style={{ padding: '8px 6px' }}>{p.title}</td>
                      <td style={{ padding: '8px 6px', color: '#F59E0B', fontWeight: 700 }}>⭐ {p.rating} ({p.jobs_completed})</td>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: p.preferred_region_id ? '#F59E0B' : '#64748B' }}>{p.preferred_region_id || 'NULL'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'users' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', color: '#A5B4FC' }}>
                    <th style={{ padding: '6px' }}>user_id (PK)</th>
                    <th style={{ padding: '6px' }}>name</th>
                    <th style={{ padding: '6px' }}>phone</th>
                    <th style={{ padding: '6px' }}>email</th>
                    <th style={{ padding: '6px' }}>city_id (FK → cities)</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.user_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#E2E8F0' }}>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#38BDF8' }}>{u.user_id}</td>
                      <td style={{ padding: '8px 6px', fontWeight: 700 }}>{u.name}</td>
                      <td style={{ padding: '8px 6px' }}>{u.phone}</td>
                      <td style={{ padding: '8px 6px' }}>{u.email}</td>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: u.city_id ? '#F59E0B' : '#64748B' }}>{u.city_id || 'NULL'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'regions' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', color: '#A5B4FC' }}>
                    <th style={{ padding: '6px' }}>id (PK)</th>
                    <th style={{ padding: '6px' }}>name</th>
                  </tr>
                </thead>
                <tbody>
                  {regions?.map(r => (
                    <tr key={r.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#E2E8F0' }}>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#F59E0B' }}>{r.id}</td>
                      <td style={{ padding: '8px 6px', fontWeight: 700 }}>{r.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'cities' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', color: '#A5B4FC' }}>
                    <th style={{ padding: '6px' }}>id (PK)</th>
                    <th style={{ padding: '6px' }}>name</th>
                    <th style={{ padding: '6px' }}>region_id (FK → regions)</th>
                  </tr>
                </thead>
                <tbody>
                  {cities?.map(c => (
                    <tr key={c.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#E2E8F0' }}>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#34D399' }}>{c.id}</td>
                      <td style={{ padding: '8px 6px', fontWeight: 700 }}>{c.name}</td>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#38BDF8' }}>{c.region_id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'roles' && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.15)', color: '#A5B4FC' }}>
                    <th style={{ padding: '6px' }}>role_id (PK)</th>
                    <th style={{ padding: '6px' }}>role_name</th>
                  </tr>
                </thead>
                <tbody>
                  {roles.map(r => (
                    <tr key={r.role_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', color: '#E2E8F0' }}>
                      <td style={{ padding: '8px 6px', fontFamily: 'monospace', color: '#A78BFA' }}>{r.role_id}</td>
                      <td style={{ padding: '8px 6px', fontWeight: 700 }}>{r.role_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'sql' && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifycontent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>PostgreSQL / Supabase DDL SQL script:</span>
                <button
                  onClick={copySql}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    background: copied ? '#10B981' : '#6366F1',
                    color: '#FFFFFF',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    border: 'none'
                  }}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copied ? 'Copied!' : 'Copy SQL'}</span>
                </button>
              </div>

              <pre style={{
                background: '#020617',
                padding: '0.85rem',
                borderRadius: '8px',
                color: '#38BDF8',
                fontSize: '0.75rem',
                lineHeight: 1.4,
                overflowX: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                {rawSqlSchema}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
