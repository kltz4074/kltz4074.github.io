const russian: Record<string, string> = {
  'Work': 'Проекты', 'Projects': 'Проекты', 'Lab': 'Лаборатория', 'About': 'Обо мне',
  'Now': 'Сейчас', 'Devlog': 'Дневник разработки', 'Contact': 'Контакты',
  'Games': 'Игры', 'Applications': 'Приложения', 'Websites': 'Сайты', 'Tools': 'Инструменты',
  'Experiments': 'Эксперименты', 'Other': 'Другое', 'Released': 'Выпущен',
  'In development': 'В разработке', 'Prototype': 'Прототип', 'On hold': 'Приостановлен',
  'Archived': 'В архиве', 'Play on itch.io': 'Играть на itch.io',
  'View source': 'Посмотреть код', 'Open KLPocket': 'Открыть KLPocket',
  'Lead developer / game design': 'Ведущий разработчик и геймдизайнер',
  'Solo developer / game design': 'Соло-разработчик и геймдизайнер',
  'Game direction / code': 'Режиссура и программирование', 'Systems / UI': 'Системы и интерфейс',
  'Plugin architecture': 'Архитектура плагина',
  'March 2026': 'Март 2026', '2025 — January 2026': '2025 — январь 2026',
  '2026 — Now': 'С 2026 года', 'July 2026 — Now': 'С июля 2026 года',
  'Email': 'Почта', 'Telegram': 'Telegram',
  'PS1 Visual Study': 'Графика в стиле PS1', 'Buoyancy in Unity': 'Плавучесть в Unity',
};

export function label(en: string, ru = russian[en]): Record<string, string> {
  return ru && en !== ru ? { en, ru } : { en };
}
