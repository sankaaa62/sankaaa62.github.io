export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const ui = {
  en: {
    'nav.projects': 'Projects',
    'nav.prototypes': 'Prototypes',
    'nav.skills': 'Skills',
    'nav.contact': 'Contact',
    'hero.title': 'Senior Unity Developer',
    'hero.sub': 'Mobile & PC · Multiplayer · ECS/DOTS · Gameplay systems',
    'hero.cv': 'Download CV',
    'metrics.years': 'years in gamedev',
    'metrics.installs': 'installs across projects',
    'metrics.loc': 'lines of code',
    'metrics.team': 'grew a team',
    'featured.title': 'Featured projects',
    'prototypes.title': 'Prototype archive',
    'prototypes.sub': '200+ hyper-casual prototypes built and shipped at Black Games — a selection:',
    'skills.title': 'Skills',
    'contact.title': 'Contact',
    'project.role': 'Role',
    'project.stack': 'Stack',
    'project.links': 'Links',
    'project.back': '← All projects',
    'footer.game': 'press start',
  },
  ru: {
    'nav.projects': 'Проекты',
    'nav.prototypes': 'Прототипы',
    'nav.skills': 'Навыки',
    'nav.contact': 'Контакты',
    'hero.title': 'Senior Unity Developer',
    'hero.sub': 'Мобильные и PC · Мультиплеер · ECS/DOTS · Геймплейные системы',
    'hero.cv': 'Скачать CV',
    'metrics.years': 'лет в геймдеве',
    'metrics.installs': 'установок суммарно',
    'metrics.loc': 'строк кода',
    'metrics.team': 'вырастил команду',
    'featured.title': 'Избранные проекты',
    'prototypes.title': 'Архив прототипов',
    'prototypes.sub': '200+ гиперказуальных прототипов в Black Games — избранное:',
    'skills.title': 'Навыки',
    'contact.title': 'Контакты',
    'project.role': 'Роль',
    'project.stack': 'Стек',
    'project.links': 'Ссылки',
    'project.back': '← Все проекты',
    'footer.game': 'press start',
  },
} as const;

export function t(locale: Locale, key: keyof (typeof ui)['en']): string {
  return ui[locale][key] ?? ui.en[key];
}
export function localePath(locale: Locale, path: string): string {
  return locale === 'en' ? path : `/ru${path}`;
}
