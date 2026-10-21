// Phase 0 shell. Workstream C restyles this file (keep the exported name).
import { Link } from 'react-router';
import { useT } from '@/i18n';
import { Logo } from './Logo';

export function SiteFooter() {
  const t = useT('common');
  return (
    <footer className="border-t border-line bg-cream">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-10 md:flex-row md:items-center md:justify-between md:px-8">
        <Logo />
        <nav className="flex flex-wrap gap-5 text-[15px] text-ink-soft">
          <Link to="/quyen-rieng-tu" className="hover:text-heritage">{t('footer.privacy')}</Link>
          <Link to="/dieu-khoan" className="hover:text-heritage">{t('footer.terms')}</Link>
          <Link to="/to-chuc" className="hover:text-heritage">{t('footer.contact')}</Link>
        </nav>
        <p className="text-sm text-ink-soft">{t('footer.rights')}</p>
      </div>
    </footer>
  );
}
