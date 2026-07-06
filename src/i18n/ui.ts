export const locales = ['en', 'ru'] as const;
export type Locale = (typeof locales)[number];

export const ui = {
  en: {
    'nav.about': 'About',
    'nav.projects': 'Projects',
    'nav.prototypes': 'Prototypes',
    'nav.skills': 'Skills',
    'nav.contact': 'Contact',
    'hero.greeting': 'Hi, my name is',
    'hero.cv': 'Download CV',
    'about.title': 'About me',
    'metrics.years': 'years in gamedev',
    'metrics.installs': 'installs on our biggest title',
    'metrics.protos': 'prototypes shipped by my team',
    'metrics.team': 'grew a team',
    'featured.title': 'Projects',
    'prototypes.title': 'Prototype archive',
    'prototypes.sub': "Hyper-casual prototypes I built hands-on at Black Games — the team shipped 200+ overall:",
    'skills.title': 'Skills',
    'contact.title': 'Contact',
    'project.role': 'Role',
    'project.stack': 'Stack',
    'project.links': 'Links',
    'project.back': '← All projects',
    'footer.game': 'Mini-game',
    'gallery.close': 'Close',
    'gallery.prev': 'Previous screenshot',
    'gallery.next': 'Next screenshot',
    'gallery.screenshot': 'screenshot',
    'prototypes.store': 'View on Google Play',
  },
  ru: {
    'nav.about': 'Обо мне',
    'nav.projects': 'Проекты',
    'nav.prototypes': 'Прототипы',
    'nav.skills': 'Навыки',
    'nav.contact': 'Контакты',
    'hero.greeting': 'Привет, меня зовут',
    'hero.cv': 'Скачать CV',
    'about.title': 'Обо мне',
    'metrics.years': 'лет в геймдеве',
    'metrics.installs': 'установок у крупнейшего проекта',
    'metrics.protos': 'прототипов выпустил отдел',
    'metrics.team': 'вырастил команду',
    'featured.title': 'Проекты',
    'prototypes.title': 'Архив прототипов',
    'prototypes.sub': 'Прототипы, которые я собирал лично в Black Games — всего отдел выпустил 200+:',
    'skills.title': 'Навыки',
    'contact.title': 'Контакты',
    'project.role': 'Роль',
    'project.stack': 'Стек',
    'project.links': 'Ссылки',
    'project.back': '← Все проекты',
    'footer.game': 'Мини-игра',
    'gallery.close': 'Закрыть',
    'gallery.prev': 'Предыдущий скриншот',
    'gallery.next': 'Следующий скриншот',
    'gallery.screenshot': 'скриншот',
    'prototypes.store': 'Открыть в Google Play',
  },
} as const;

export function t(locale: Locale, key: keyof (typeof ui)['en']): string {
  return ui[locale][key] ?? ui.en[key];
}
export function localePath(locale: Locale, path: string): string {
  return locale === 'en' ? path : `/ru${path}`;
}
