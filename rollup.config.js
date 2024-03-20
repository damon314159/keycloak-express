import terser from "@rollup/plugin-terser";
import resolve from "@rollup/plugin-node-resolve";
import json from "@rollup/plugin-json";
import commonjs from "@rollup/plugin-commonjs";

export default {
  input: "lib/server.js",
  output: {
    file: "dist/server.js",
    format: "es",
  },
  plugins: [
    commonjs({
      include: /node_modules/,
      requireReturnsDefault: "esmExternals",
    }),
    json(),
    resolve(),
    terser(),
  ],
};
