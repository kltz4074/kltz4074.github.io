# KLTZQU Portfolio

Source for [kltz4074.github.io](https://kltz4074.github.io/).

The current site lives in `editorial/`. Public routes, reusable layouts and styles are in `editorial/src/`. The editor has its own entry point at `/admin/`. Published content is in `editorial/content/portfolio.json`; media lives in `editorial/public/media/`.

With Node.js 24:

```sh
cd editorial
npm ci
npm run develop
npm run check
npm test
npm run build
npm run check:links
```

GitHub Actions builds and checks pull requests. A successful build on `main` publishes to GitHub Pages. The older static implementation and original Editorial archive are retained in Git history and fall outside the deployed build.

## Edit the published portfolio

1. In GitHub’s [fine-grained personal access token settings](https://github.com/settings/personal-access-tokens/new), select `kltz4074` as the resource owner and grant access only to `kltz4074.github.io`. Give **Contents** read and write access. **Metadata** read access is included automatically. Add **Actions** read access if you want to see build status in the editor.
2. Open [the portfolio editor](https://kltz4074.github.io/admin/) and enter the token there. The editor keeps the token in memory until you sign out or close the page. IndexedDB stores your local draft and staged media on that device.
3. Edit content and open **Review changes**. **Publish to GitHub** creates one atomic commit on `main`. When the Pages workflow succeeds, the updated site goes live.
4. If `main` has changed, use **Refresh published revision** in **Overview** to combine independent edits. If the same content was changed in both revisions, your local draft is preserved so you can review the conflict. **Publishing History** restores previous copy to a draft for review.

The editor writes to the content file and supported media paths only. Repository rules must allow the owner's token to update `main`. Check the Pages workflow when publication succeeds on GitHub and the site still shows the previous version.
