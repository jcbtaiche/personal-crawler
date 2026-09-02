import { defineConfig } from "astro/config";

const projectPages = process.env.GITHUB_PAGES === "1";

export default defineConfig({
  site: "https://jcbtaiche.com",
  base: projectPages ? "/personal-crawler" : "/",
  outDir: "../dist",
  devToolbar: { enabled: false },
  vite: {
    server: {
      fs: { allow: [".."] },
    },
  },
});
