import { useTranslation } from 'react-i18next';
import { EvCharging } from '@/components/brand/Illustrations';
import { Card } from '@/components/ui/Card';
import { ScreenHeader } from '@/components/ui/ScreenHeader';

export const DATA_SOURCES = [
  { label: 'KHDA, Dubai private higher education sector, 2024 to 25', url: 'https://web.khda.gov.ae/en/About-Us/Whats-New/Dubais-private-higher-education-sector-continues' },
  { label: 'Dubai Media Office, international students target', url: 'https://www.mediaoffice.ae/en/news/2025/may/19-05/dubais-private-higher-education' },
  { label: 'ICP, Emirates ID and residence', url: 'https://icp.gov.ae/en/media-center/filling-out-registration-form-precedes-medical-examination-emirates-id/' },
  { label: 'RTA, Dubai Metro, Tram and nol fares', url: 'https://www.rta.ae' },
  { label: 'Dubai Land Department and wasl, Ejari', url: 'https://www.wasl.ae/en/node/632' },
  { label: 'Gulf News, SIM options, Emirates ID timing, student nol card', url: 'https://gulfnews.com/living-in-uae' },
  { label: 'Transit network © OpenStreetMap contributors (ODbL)', url: 'https://www.openstreetmap.org/copyright' },
  { label: 'Rates by Exchange Rate API', url: 'https://www.exchangerate-api.com' },
];

export function About() {
  const { t } = useTranslation();
  return (
    <article className="flex flex-col gap-6 px-4">
      <ScreenHeader back="/app/me" title={t('about.title')} />
      <p className="type-body">{t('about.what')}</p>
      <Card tone="arrive"><p className="type-body-sm-strong">{t('about.notGov')}</p></Card>
      <section className="flex flex-col gap-2">
        <h2 className="type-heading-3">Team</h2>
        <p className="type-body-sm">{t('about.team')}</p>
        <p className="type-body-sm">{t('about.supervisor')}</p>
        <p className="type-body-sm">{t('about.members')}</p>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="type-heading-3">{t('about.sources')}</h2>
        <ul className="flex flex-col">
          {DATA_SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center type-body-sm underline underline-offset-2">{s.label}</a>
            </li>
          ))}
        </ul>
      </section>
      <section className="flex flex-col gap-2">
        <h2 className="type-heading-3">{t('about.licences')}</h2>
        <p className="type-body-sm">Map data is available under the Open Database License (ODbL). Exchange rates by Exchange Rate API, attribution required. Design skill from elayadesign/ai-design-skills under the MIT licence.</p>
      </section>
      <div className="flex justify-center pb-6"><EvCharging className="h-24 w-auto" /></div>
    </article>
  );
}
