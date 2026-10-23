import React, { useEffect, useState } from 'react';

const QRCode = require('qrcode');

export default function InviteQr({ url, size = 180, alt = 'Invite QR' }) {
  const [src, setSrc] = useState('');

  useEffect(() => {
    if (!url) {
      setSrc('');
      return undefined;
    }
    let cancelled = false;
    const toSvg = QRCode.toString.bind(QRCode);
    Promise.resolve(toSvg(url, {
      type: 'svg',
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#111111', light: '#ffffff' },
    })).then((svg) => {
      if (!cancelled) {
        setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
      }
    }).catch(() => {
      if (!cancelled) setSrc('');
    });
    return () => { cancelled = true; };
  }, [url, size]);

  if (!src) return null;
  return (
    <img
      className="sidebar-invite-qr"
      src={src}
      width={size}
      height={size}
      alt={alt}
    />
  );
}
