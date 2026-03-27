'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/products', label: 'Products', icon: '📦' },
  { href: '/retail', label: 'Retail Sales', icon: '🛒' },
  { href: '/wholesale', label: 'Wholesale', icon: '🏭' },
  { href: '/customers', label: 'Customers', icon: '👥' },
  { href: '/reports', label: 'Reports', icon: '📈' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile Header */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sidebar-logo">🌿</div>
          <span style={{ fontWeight: 700, fontSize: '15px' }}>Govi Sewana</span>
        </div>
        <button className="menu-btn" onClick={() => setOpen(true)}>☰</button>
      </div>

      {/* Mobile Overlay */}
      <div
        className={`mobile-overlay ${open ? 'open' : ''}`}
        onClick={() => setOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">🌿</div>
          <div className="sidebar-brand">
            <h1>Govi Sewana</h1>
            <p>Agribusiness POS</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${isActive ? 'active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <span className="nav-icon">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div style={{ fontSize: '12px', color: 'var(--text-dim)' }}>
            © 2026 Govi Sewana
          </div>
        </div>
      </aside>
    </>
  );
}
