import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'CLASR — Academic Manuscript Signal Reader';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#F5F0E5',
          padding: '72px 80px',
        }}
      >
        {/* Top: logo area */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '8px',
              backgroundColor: '#2B555B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F5F0E5',
              fontSize: '26px',
              fontWeight: '900',
              letterSpacing: '-2px',
            }}
          >
            C
          </div>
          <span style={{ fontSize: '22px', fontWeight: '700', color: '#2B555B', letterSpacing: '4px' }}>
            CLASR
          </span>
        </div>

        {/* Middle: headline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              fontSize: '11px',
              fontWeight: '600',
              letterSpacing: '4px',
              color: '#3A7077',
              textTransform: 'uppercase',
            }}
          >
            AI for Academic Reading
          </div>
          <div
            style={{
              fontSize: '72px',
              fontWeight: '900',
              color: '#2B555B',
              lineHeight: '1.05',
              letterSpacing: '-2px',
            }}
          >
            Read before
            <br />
            you&apos;re read.
          </div>
          <div
            style={{
              width: '80px',
              height: '4px',
              backgroundColor: '#CD0015',
              borderRadius: '2px',
            }}
          />
        </div>

        {/* Bottom: tagline */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span style={{ fontSize: '18px', color: '#5A5548', maxWidth: '540px', lineHeight: '1.5' }}>
            A non-decisional signal layer for academic manuscripts.
            No summaries. No verdicts. Just visibility.
          </span>
          <span style={{ fontSize: '14px', color: '#B6C1BB', letterSpacing: '1px' }}>
            clasr.ai
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
