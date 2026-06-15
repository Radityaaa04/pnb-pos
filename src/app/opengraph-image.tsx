import { ImageResponse } from 'next/og'
 
export const runtime = 'edge'
 
export const alt = 'PNB POS - Sistem Kasir Modern'
export const size = {
  width: 1200,
  height: 630,
}
 
export const contentType = 'image/png'
 
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(to bottom right, #020617, #0f172a, #1e3a8a)', // Slate-950 to Slate-900 to Blue-900
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 160,
            height: 160,
            borderRadius: '40px',
            background: 'linear-gradient(to bottom right, #3b82f6, #1d4ed8)', // Blue-500 to Blue-700
            marginBottom: 40,
            fontSize: 100,
            fontWeight: 'bold',
            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
          }}
        >
          P
        </div>
        
        {/* Title */}
        <h1
          style={{
            fontSize: 80,
            fontWeight: 'bold',
            margin: 0,
            marginBottom: 20,
            letterSpacing: '-2px',
            color: '#f8fafc',
          }}
        >
          PNB POS
        </h1>
        
        {/* Subtitle */}
        <p
          style={{
            fontSize: 40,
            margin: 0,
            color: '#cbd5e1',
            maxWidth: '80%',
            textAlign: 'center',
            lineHeight: 1.4,
          }}
        >
          Sistem Kasir Cerdas & Manajemen Inventaris Terpadu
        </p>

        {/* Features Row */}
        <div
          style={{
            position: 'absolute',
            bottom: 60,
            display: 'flex',
            gap: 40,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, color: '#94a3b8', fontWeight: 600 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#3b82f6' }} />
            Transaksi Kasir
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, color: '#94a3b8', fontWeight: 600 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#3b82f6' }} />
            Manajemen Gudang
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 26, color: '#94a3b8', fontWeight: 600 }}>
            <div style={{ width: 14, height: 14, borderRadius: '50%', background: '#3b82f6' }} />
            Analitik & Laporan
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
