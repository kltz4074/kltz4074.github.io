# Контент и медиа

## Общий принцип путей

Все локальные медиа-пути записываются относительно корня репозитория и без
начального слеша:

```text
media/<раздел>/<имя-файла>.<расширение>
```

Путь чувствителен к регистру. Рекомендуемый формат имени:
`lowercase-kebab-case.mp4`.

## LAB

Карточки LAB находятся в `content/experiments.json`, а файлы — в
`media/experiments/`.

Пример видео:

```json
{
  "id": "water-buoyancy",
  "title": "Object's floating physics",
  "year": "2026",
  "category": "Physics",
  "stack": "Unity / Rigidbody / C#",
  "description": {
    "en": "Multi-point buoyancy and damping.",
    "ru": "Многоточечная плавучесть и демпфирование."
  },
  "mediaUrl": "media/experiments/floating-objects.mp4",
  "mediaType": "video",
  "projectUrl": ""
}
```

Допустимые значения `mediaType`:

- `video` — MP4 или WebM;
- `image` — JPG, PNG, WebP или GIF.

Если загружать через админку, путь формируется автоматически:

```text
media/experiments/<id>.<расширение>
```

Например, для `id: "water-buoyancy"` и MP4 получится
`media/experiments/water-buoyancy.mp4`.

## Проекты

Файл проекта: `content/projects/<slug>.json`.

Обложка:

```json
"coverUrl": "media/projects/<slug>/cover.webp"
```

Чтобы проект появился на сайте, его slug должен находиться в
`content/projects/index.json`.

## Галерея

Записи находятся в `content/gallery.json`, а файлы — в `media/gallery/`.

Поле `projectSlug` связывает элемент галереи с проектом. Такой элемент
отображается и в общей галерее, и на странице проекта.
