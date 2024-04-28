// @ts-check
import esbuild from "esbuild";

const context = await esbuild.context({
    entryPoints: ["src/lib/output/themes/default/assets/bootstrap.ts"],
    bundle: true,
    minify: true,
    outfile: "static/main.js",
    banner: {
        js: '"use strict";',
    },
    logLevel: "info",
});

await context.rebuild();

if (process.argv.slice(2).includes("--watch")) {
    await context.watch();
} else {
    await context.dispose();
}
