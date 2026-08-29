# Playwright's official image ships Chromium plus every system library it
# needs (glib, nss, atk, etc.) already installed in the SAME image used at
# runtime. The previous approach -- a plain Node image + a `postinstall`
# running `playwright install --with-deps chromium` -- downloaded the browser
# binary during Railway's build, but the system packages `--with-deps` needs
# root/apt for don't survive into Railpack's slimmed-down runtime layer,
# so PDF export failed at runtime with "error while loading shared
# libraries: libglib-2.0.so.0" even though the build itself succeeded and
# the binary was present. Building directly FROM this image sidesteps that
# entirely: build and runtime are the same filesystem.
#
# Keep this tag in exact sync with the "playwright" version pinned in
# package.json -- a mismatch between the npm package and the image's
# bundled browser build is a common source of launch failures.
FROM mcr.microsoft.com/playwright:v1.62.1-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "--require", "./src/instrument.js", "src/index.js"]
