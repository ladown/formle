# Handoff: semantic-release setup (monorepo)

Как в этом репозитории устроена автоматическая публикация пакетов в npm через
`semantic-release`, и как подключить **новый пакет** к тому же конвейеру.

---

## 1. Как это работает сейчас

Каждый публикуемый пакет релизится **независимо** своим собственным процессом
`semantic-release`. Версии не общие — у `@figle/cli` своя, у `@figle/spec-schema`
своя. Связывает их три вещи: общий базовый конфиг, плагин `semantic-release-monorepo`
и один CI-workflow.

### Архитектура конфигов

```
.releaserc.base.json            ← вся общая конфигурация плагинов (один источник правды)
packages/<pkg>/.releaserc.json  ← тонкий конфиг: extends base + tagFormat пакета
package.json (root)             ← devDependencies + скрипт `release`
.github/workflows/release.yml   ← запуск в CI
```

**`.releaserc.base.json`** (корень) содержит все плагины и правила:

- ветки релиза: `master` (стабильный) и `beta` (prerelease);
- `@semantic-release/commit-analyzer` с пресетом `conventionalcommits` и
  `releaseRules` (что даёт major/minor/patch, а что не релизит вовсе —
  `chore`, `style`, `test`, `build`, `ci` → `false`);
- `@semantic-release/release-notes-generator` — генерация заметок;
- `@semantic-release/changelog` → пишет `CHANGELOG.md`;
- `@semantic-release/npm` → публикация в npm;
- `@semantic-release/git` → коммитит `CHANGELOG.md` + `package.json`
  сообщением `chore(release): ${nextRelease.gitTag} [skip ci]`;
- `@semantic-release/github` → GitHub Release.

**`packages/<pkg>/.releaserc.json`** — минимальный, наследует базу и задаёт только
формат git-тега:

```json
{
  "extends": ["semantic-release-monorepo", "../../.releaserc.base.json"],
  "tagFormat": "@scope/pkg-name@${version}"
}
```

- `semantic-release-monorepo` — заставляет `semantic-release` смотреть только на
  коммиты, которые **трогали файлы внутри этого пакета**. Без него каждый пакет
  релизился бы на любой коммит в репозитории.
- `tagFormat` обязан быть **уникальным на пакет** — иначе теги столкнутся.

### Скрипты

В каждом публикуемом `package.json`:

```json
"scripts": {
  "release": "semantic-release"
}
```

В корневом `package.json`:

```json
"scripts": {
  "release": "pnpm -r --workspace-concurrency=1 run release"
}
```

`--workspace-concurrency=1` — релизы идут **строго по очереди**. Это важно: git-
операции и теги не должны выполняться параллельно.

### CI

`.github/workflows/release.yml` запускается на push в `master`/`beta`:

1. checkout с `fetch-depth: 0` (нужна вся история тегов) и
   `persist-credentials: false`;
2. setup pnpm + Node (`registry-url: https://registry.npmjs.org`);
3. `pnpm install --frozen-lockfile`;
4. `pnpm build`;
5. `pnpm release`.

Права job'а: `contents: write`, `issues: write`, `pull-requests: write`,
**`id-token: write`**.

> **Аутентификация в npm — без секрета `NPM_TOKEN`.**
> Используется npm **OIDC trusted publishing**: `id-token: write` + `registry-url`
> в `setup-node` достаточно, чтобы `@semantic-release/npm` опубликовал пакет.
> Для этого в настройках пакета на npmjs.com должен быть настроен trusted publisher
> (GitHub Actions, этот репозиторий, workflow `release.yml`). См. § 4.

---

## 2. Добавить новый пакет в конвейер

Допустим, добавляем `@scope/new-pkg` в `packages/new-pkg`.

1. **`package.json` пакета** — обязательные поля для публикации:

   ```json
   {
     "name": "@scope/new-pkg",
     "version": "1.0.0-beta.1",
     "publishConfig": { "access": "public" },
     "repository": {
       "type": "git",
       "url": "git+https://github.com/<owner>/<repo>.git",
       "directory": "packages/new-pkg"
     },
     "files": ["dist"],
     "scripts": {
       "build": "tsdown",
       "release": "semantic-release"
     }
   }
   ```

   - `version` — стартовая. Для prerelease-ветки `beta` ставь `-beta.1`.
   - `publishConfig.access: "public"` — обязателен для scoped-пакетов, иначе npm
     попытается опубликовать приватно.
   - `repository.directory` — путь пакета (нужно `semantic-release-monorepo`).

2. **`packages/new-pkg/.releaserc.json`**:

   ```json
   {
     "extends": ["semantic-release-monorepo", "../../.releaserc.base.json"],
     "tagFormat": "@scope/new-pkg@${version}"
   }
   ```

   `tagFormat` — уникальный, совпадает с именем пакета.

3. **Ничего больше менять не нужно**: корневой `pnpm -r run release` подхватит
   новый workspace автоматически, общая база и CI уже на месте.

4. **Первый релиз.** `semantic-release` стартует с git-тегов. Поскольку тега
   `@scope/new-pkg@x.y.z` ещё нет, первый релиз посчитается с нуля по коммитам,
   затрагивающим `packages/new-pkg/`. Убедись, что есть хотя бы один коммит
   `feat:`/`fix:`, иначе релиза не будет.

---

## 3. Перенести этот setup в ДРУГОЙ репозиторий

Если второй пакет живёт в отдельном проекте, скопируй конвейер целиком:

1. **devDependencies** (корень) — точные версии из этого репо:

   ```
   semantic-release@25
   semantic-release-monorepo@8        (только если монорепо)
   @semantic-release/commit-analyzer@13
   @semantic-release/release-notes-generator@14
   @semantic-release/changelog@6
   @semantic-release/npm@13
   @semantic-release/git@10
   @semantic-release/github@12
   conventional-changelog-conventionalcommits@9
   ```

2. Скопируй **`.releaserc.base.json`** (или `.releaserc.json`, если пакет один — тогда
   `semantic-release-monorepo` не нужен и `tagFormat` по умолчанию `v${version}`).

3. Скопируй **`.github/workflows/release.yml`**. Проверь: ветки, `id-token: write`,
   `registry-url`, шаг `build` перед `release`.

4. Настрой **OIDC trusted publishing** на npm (§ 4) — либо, если OIDC недоступен,
   добавь секрет `NPM_TOKEN` и проброс env в шаг release:
   `NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}` (и убери `id-token` как обязательный).

---

## 4. npm OIDC trusted publishing (без токена)

Один раз на каждый пакет, через UI npmjs.com:

1. Пакет должен **уже существовать** в npm (первую версию иногда нужно
   опубликовать вручную `npm publish`, затем включить trusted publisher).
2. На странице пакета → **Settings → Trusted Publisher** → добавить GitHub Actions:
   - owner/repo: `ladown/figle`,
   - workflow filename: `release.yml`.
3. В CI достаточно `permissions: id-token: write` и `registry-url` в `setup-node`.
   Никакого `NPM_TOKEN` в secrets.

---

## 5. Правила коммитов → версии

Версия выводится из Conventional Commits (см. `releaseRules` в базе):

| Коммит                         | Эффект     |
| ------------------------------ | ---------- |
| `feat: ...`                    | minor      |
| `fix:` / `perf:` / `refactor:` | patch      |
| `docs(readme): ...`            | patch      |
| `BREAKING CHANGE` в теле       | major      |
| `chore/style/test/build/ci`    | нет релиза |

`semantic-release-monorepo` фильтрует коммиты по директории пакета, поэтому правь
файлы пакета — иначе его релиз не триггерится.

---

## 6. Чеклист подключения нового пакета

- [ ] `package.json`: `name`, `version`, `publishConfig.access`, `repository.directory`, `files`, скрипты `build` + `release`
- [ ] `packages/<pkg>/.releaserc.json` с уникальным `tagFormat`
- [ ] пакет собирается (`pnpm --filter <pkg> build` даёт `dist`)
- [ ] есть `feat:`/`fix:` коммит, трогающий файлы пакета
- [ ] на npm настроен trusted publisher для `release.yml` (или есть `NPM_TOKEN`)
- [ ] push в `beta` → проверить prerelease, затем merge/push в `master` → стабильный релиз
