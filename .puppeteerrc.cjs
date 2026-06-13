/**
 * Puppeteer configuration.
 *
 * skipDownload: true prevents Puppeteer from downloading Chrome during
 * `npm install`. This avoids triggering Railpack's heuristic that installs
 * 250+ GTK/X11/Perl system packages, which causes builds to exceed the
 * 10-minute timeout.
 *
 * Chrome is expected to be available at runtime via one of:
 *   - /usr/bin/google-chrome  (index.js)
 *   - /root/.cache/puppeteer/chrome/...  (puppeteer-job-applier.js)
 *
 * To pre-download Chrome manually (e.g. in a Railway start command or
 * postinstall hook), run:
 *   npx puppeteer browsers install chrome
 */
const { join } = require('path');

/** @type {import("puppeteer").Configuration} */
module.exports = {
  skipDownload: true,
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
