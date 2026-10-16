'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';

export function QrCode({ value, size = 200, label }: { value: string; size?: number; label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    QRCode.toCanvas(canvas, value, { width: size, margin: 1, errorCorrectionLevel: 'M' })
      .then(() => {
        if (cancelled) return;
      })
      .catch(() => setError('QR generation failed in this browser.'));
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div className="inline-block">
      <canvas ref={canvasRef} role="img" aria-label={label} />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
