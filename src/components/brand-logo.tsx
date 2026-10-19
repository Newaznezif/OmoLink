import Image from 'next/image';

const LOGO_SRC = '/images/branding/logo.png';
const LOGO_ALT = 'OmoNetTab — Connecting Cultures and Commerce';

/**
 * The supplied lockup carries the brand name and tagline inside the image, so no
 * text wordmark is placed beside it. Its background is opaque near-white rather
 * than transparent, which is why it is only rendered on white surfaces, and its
 * 444x328 ratio is preserved by sizing height and letting width follow.
 */
export function BrandLogo({
  className = 'h-14 w-auto',
  priority = false
}: {
  className?: string;
  priority?: boolean;
}) {
  return <Image src={LOGO_SRC} width={444} height={328} alt={LOGO_ALT} className={className} priority={priority} />;
}
