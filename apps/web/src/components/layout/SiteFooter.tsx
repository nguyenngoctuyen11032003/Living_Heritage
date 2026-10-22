// Public site footer ("meadow"): brand block + link columns on paper, a looping meadow video fading into it, and a
// giant frosted wordmark sinking into fog. Layout and values live in site-footer.css.
import { ArrowUp, Mic } from 'lucide-react';
import { Link } from 'react-router';
import { useT } from '@/i18n';
import { useReducedMotionSafe } from '@/design/motion';
import { LogoMark } from './Logo';
import './site-footer.css';

type FooterLink = { to: string; label: string };

const MEADOW_VIDEO = 'https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/4d01c727-d9c5-47c8-a778-35a451ffd39f.mp4';
const MEADOW_POSTER = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20261014_121838_c97d0940-f430-4304-8573-4f47ee44f447.png';

export function SiteFooter() {
  const tc = useT('common');
  const t = useT('landing');
  const reduced = useReducedMotionSafe();
  const columns: Array<{ title: string; links: FooterLink[] }> = [
    {
      title: t('footer.cols.product'),
      links: [
        { to: '/cach-hoat-dong', label: t('footer.links.how') },
        { to: '/ke-chuyen', label: t('footer.links.tell') },
        { to: '/sach-ky-uc', label: t('footer.links.books') },
        { to: '/goi-dich-vu', label: t('footer.links.plans') },
      ],
    },
    {
      title: t('footer.cols.explore'),
      links: [
        { to: '/kham-pha', label: t('footer.links.hub') },
        { to: '/#chuyen-mau', label: t('footer.links.sample') },
        { to: '/kham-pha?topic=mon-an', label: t('footer.links.cooking') },
        { to: '/kham-pha?topic=lam-vuon', label: t('footer.links.gardening') },
      ],
    },
    {
      title: t('footer.cols.about'),
      links: [
        { to: '/to-chuc', label: t('footer.links.orgs') },
        { to: '/#cau-hoi', label: t('footer.links.faq') },
        { to: '/to-chuc#lien-he', label: tc('footer.contact') },
      ],
    },
  ];

  return (
    <footer className="sf">
      <div className="sf__stage" aria-hidden="true">
        <video
          className="sf__video"
          src={MEADOW_VIDEO}
          poster={MEADOW_POSTER}
          autoPlay={!reduced}
          muted
          loop
          playsInline
          preload={reduced ? 'metadata' : 'auto'}
          disablePictureInPicture
          tabIndex={-1}
        />
      </div>
      <p className="sf__wordmark" aria-hidden="true" style={{ ["--chars" as string]: tc("brand.name").length }}>
        {tc('brand.name')}
      </p>
      <div className="sf__fog" aria-hidden="true" />

      <div className="sf__content">
        <div className="sf-brand">
          <Link to="/" className="sf-brand__logo">
            <LogoMark inner="var(--cream)" />
            {tc('brand.name')}
          </Link>
          <h2 className="sf-brand__title">{t('footer.tagline')}</h2>
          <p className="sf-brand__text">
            <span className="block font-semibold text-ink">{t('footer.status')}</span>
            <span className="block">{t('footer.statusBody')}</span>
          </p>
          <Link to="/ke-chuyen" className="sf-brand__cta">
            <Mic aria-hidden="true" />
            {t('footer.links.tell')}
          </Link>
          <p className="sf-brand__copy">{tc('footer.rights')}</p>
          <ul className="sf__legal">
            <li>
              <Link to="/quyen-rieng-tu">{t('footer.links.privacy')}</Link>
            </li>
            <li>
              <Link to="/dieu-khoan">{t('footer.links.terms')}</Link>
            </li>
          </ul>
        </div>
        {columns.map((col) => (
          <nav key={col.title} aria-label={col.title}>
            <h2 className="sf-col__title">{col.title}</h2>
            <ul className="sf-col__list">
              {col.links.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <a href="#main" className="sf__top">
        <ArrowUp aria-hidden="true" className="size-4" />
        {t('footer.backToTop')}
      </a>
    </footer>
  );
}
