AI generated

# KLTZQU Portfolio

Статическое портфолио на GitHub Pages. Сайт не требует фреймворка, сборки,
сервера или базы данных: браузер загружает JSON из папки `content/` и собирает
нужную страницу из небольших JavaScript-модулей.

## Структура проекта

```text
.
├── index.html                 # HTML-оболочка публичного сайта
├── 404.html                   # Поддержка прямых ссылок GitHub Pages
├── assets/
│   ├── app.js                 # Короткая точка входа
│   ├── styles.css             # Внешний вид публичного сайта
│   └── js/
│       ├── app.js             # Роутинг, события и запуск приложения
│       ├── config.js          # Маршруты и переводы статусов
│       ├── state.js           # Текущее состояние интерфейса
│       ├── content.js         # Загрузка JSON
│       ├── components.js      # Общие HTML-компоненты
│       ├── utils.js           # Безопасный HTML, URL и локализация
│       └── views/             # Одна страница — один модуль
│           ├── home.js
│           ├── projects.js
│           ├── project.js
│           ├── skills.js
│           ├── lab.js
│           └── gallery.js
├── content/
│   ├── site.json              # Главная страница и ссылки
│   ├── skills.json            # Навыки
│   ├── experiments.json       # Карточки LAB
│   ├── gallery.json           # Галерея
│   └── projects/
│       ├── index.json         # Порядок проектов
│       └── <slug>.json        # Отдельный проект
├── media/
│   ├── experiments/           # Фото и видео для LAB
│   ├── gallery/               # Фото и видео галереи
│   └── projects/<slug>/       # Обложки и медиа проектов
├── admin/
│   ├── index.html             # Интерфейс админки
│   ├── admin.css
│   ├── admin.js               # Короткая точка входа
│   └── js/
│       ├── app.js             # Сохранение, загрузки и события
│       ├── editor.js          # Отрисовка и чтение форм
│       ├── github.js          # Все запросы к GitHub API
│       ├── vault.js           # PBKDF2 + AES-GCM
│       ├── dom.js             # Уведомления и DOM-ссылки
│       ├── state.js
│       ├── config.js
│       └── utils.js
└── docs/
    ├── ARCHITECTURE.md         # Как код связан между собой
    └── CONTENT.md              # Все форматы JSON и пути к медиа
```

## Самый простой способ редактирования

Открой [админку](https://kltz4074.github.io/admin/). Она редактирует JSON и
создаёт обычные коммиты в `main`.

Для LAB:

1. Открой раздел **LAB**.
2. Создай или выбери эксперимент.
3. Нажми **Загрузить медиа**.
4. Админка положит файл в `media/experiments/` и сама заполнит поле
   **Media path**.
5. Нажми **Сохранить**, если после загрузки менял текст или остальные поля.

Видео MP4/WebM поддерживаются до 100 МиБ. Изображения — до 25 МиБ.

## Ручное добавление LAB-медиа

Допустим, файл называется:

```text
media/experiments/floating-objects.mp4
```

Тогда в `content/experiments.json` нужно написать:

```json
{
  "id": "water-buoyancy",
  "title": "Object's floating physics",
  "mediaUrl": "media/experiments/floating-objects.mp4",
  "mediaType": "video"
}
```

Путь указывается от корня репозитория:

- правильно: `media/experiments/floating-objects.mp4`;
- неправильно: `/media/experiments/floating-objects.mp4`;
- неправильно: ссылка вида `github.com/.../blob/main/...`;
- регистр букв важен: `Video.mp4` и `video.mp4` — разные файлы.

Можно создавать вложенные папки, например
`media/experiments/physics/floating-objects.mp4`. Тогда ровно этот путь нужно
записать в `mediaUrl`.

## Локальный запуск

JSON нельзя надёжно загрузить через `file://`, поэтому запусти сервер из корня
проекта:

```bash
npm install
npm run dev
```

После этого открой адрес, который покажет Vite.

## Где искать нужную логику

| Задача                           | Файл                                         |
| -------------------------------- | -------------------------------------------- |
| Изменить маршруты                | `assets/js/config.js`                        |
| Понять загрузку JSON             | `assets/js/content.js`                       |
| Изменить внешний вид LAB         | `assets/js/views/lab.js`                     |
| Изменить карточку проекта        | `assets/js/views/project.js`                 |
| Изменить путь загрузки LAB-медиа | `admin/js/app.js`, функция `handleLabUpload` |
| Изменить лимиты файлов           | `admin/js/config.js`                         |
| Понять запросы к GitHub          | `admin/js/github.js`                         |
| Понять шифрование токена         | `admin/js/vault.js`                          |

Более подробная схема находится в [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md),
а описание контента — в [docs/CONTENT.md](docs/CONTENT.md).

## Публикация

Workflow в `.github/workflows/pages.yml` публикует сайт после каждого push в
`main`.

## Права

Copyright © KLTZQU. Разрешение на повторное использование дизайна, кода,
текстов или медиа не предоставляется.
