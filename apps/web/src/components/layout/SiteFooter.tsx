// Public site footer (restyled by Workstream C; export name kept).
import { ArrowUp } from 'lucide-react';
import { Link } from 'react-router';
import { useT } from '@/i18n';
import { Logo } from './Logo';

type FooterLink = { to: string; label: string };

export function SiteFooter() {
  const tc = useT('common');
  const t = useT('landing');
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
    {
      title: t('footer.cols.legal'),
      links: [
        { to: '/quyen-rieng-tu', label: t('footer.links.privacy') },
        { to: '/dieu-khoan', label: t('footer.links.terms') },
      ],
    },
  ];

  return (
    <footer className="relative isolate overflow-hidden bg-night text-night-ink">
      <div aria-hidden="true" className="bg-noise pointer-events-none absolute inset-0 -z-10 opacity-[0.06]" />
      {/* @container: the link grid steps by available em-width, so at very large text it drops to one column. */}
      <div className="@container mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 md:pt-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="min-w-0 lg:col-span-4">
            <Logo tone="dark" wrap />
            <p className="mt-4 max-w-xs font-serif text-[1.1rem] italic leading-relaxed text-night-ink/80">{t('footer.tagline')}</p>
            <div className="mt-6 inline-flex max-w-sm items-start gap-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
              <span aria-hidden="true" className="relative mt-1.5 inline-flex size-2 shrink-0">
                <span className="absolute inset-0 animate-ping rounded-full bg-mint/50 motion-reduce:hidden" />
                <span className="relative size-2 rounded-full bg-mint" />
              </span>
              <span>
                <span className="block text-[0.9rem] font-semibold text-night-ink">{t('footer.status')}</span>
                <span className="mt-1 block text-[0.8rem] leading-relaxed text-night-ink/75">{t('footer.statusBody')}</span>
              </span>
            </div>
          </div>
          <nav aria-label={tc('brand.name')} className="grid min-w-0 grid-cols-1 gap-8 @min-[16em]:grid-cols-2 @min-[32em]:grid-cols-4 lg:col-span-8">
            {columns.map((col) => (
              <div key={col.title}>
                <h2 className="text-[0.75rem] font-semibold uppercase tracking-[0.14em] text-mint">{col.title}</h2>
                <ul className="mt-4 flex flex-col">
                  {col.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to} className="inline-flex min-h-11 items-center text-[0.95rem] text-night-ink/80 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <p aria-hidden="true" className="pointer-events-none mt-16 select-none overflow-hidden whitespace-nowrap pb-[0.08em] pt-[0.12em] font-sans text-[15.5vw] font-semibold leading-[1.06] tracking-[-0.06em] text-night-ink/[0.07] xl:text-[13.5rem]">
          {tc('brand.name')}
        </p>

        <div className="mt-6 flex flex-col gap-5 border-t border-white/10 pt-6 md:flex-row md:items-center md:justify-between">
          <p className="text-[0.82rem] text-night-ink/70">{tc('footer.rights')}</p>
          <a href="#main" className="inline-flex min-h-12 items-center gap-2 self-start rounded-full px-4 text-[0.85rem] font-semibold text-night-ink/85 ring-1 ring-white/15 transition-colors hover:bg-white/8 md:self-auto">
            <ArrowUp aria-hidden="true" className="size-4" />
            {t('footer.backToTop')}
          </a>
        </div>
      </div>
    </footer>
  );
}
