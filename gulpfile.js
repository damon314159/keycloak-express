import { deleteAsync as del } from "del";
import gulp from "gulp";
import nodemon from "gulp-nodemon";
import rename from "gulp-rename";
import source from "vinyl-source-stream";
import gulpSass from "gulp-sass";
import * as dartSass from "sass";
import ts from "gulp-typescript";
import rollup from "@rollup/stream";
import rollupConfig from "./rollup.config.js";
import "dotenv/config";

const { src, dest, series, parallel, watch } = gulp;

// Create base tasks for each process
function clean() {
  return del(["dist/**", "!dist", "temp/**, !temp"]);
}

const sass = gulpSass(dartSass);
function scssCompile() {
  return src("src/frontend/stylesheets/style.scss")
    .pipe(sass({ outputStyle: "compressed" }))
    .pipe(dest("dist/public/styles"));
}

const projectClient = ts.createProject("src/frontend/tsconfig.json");
function tsCompileClient() {
  return projectClient
    .src()
    .pipe(projectClient())
    .js.pipe(dest("dist/public/scripts"));
}

const projectServer = ts.createProject("tsconfig.json");
function tsCompileServer() {
  return projectServer.src().pipe(projectServer()).js.pipe(dest("temp"));
}

function jsBundleServer() {
  return rollup(rollupConfig).pipe(source("server.js")).pipe(dest("./dist"));
}

function copyViews() {
  return src("src/frontend/views/**").pipe(dest("dist/views/"));
}

function copyPackageJson() {
  return src("src/dist.package.json")
    .pipe(rename("package.json"))
    .pipe(dest("dist/"));
}

// Compose tasks into static build process
const buildJsServer = series(tsCompileServer, jsBundleServer);
const buildJs = parallel(tsCompileClient, buildJsServer);
const copyFiles = parallel(copyViews, copyPackageJson);
const build = series(clean, parallel(scssCompile, buildJs, copyFiles));

export { build };

// Compose tasks into watch build process
function watchScss() {
  return watch("src/frontend/stylesheets/**/*.scss", scssCompile);
}
function watchTsServer() {
  return watch(["src/**/*.ts", "!src/frontend/**"], buildJsServer);
}
function watchTsClient() {
  return watch("src/frontend/scripts/**/*.ts", tsCompileClient);
}
function watchViews() {
  return watch("src/frontend/views/**/*.njk", copyViews);
}
function watchPackageJson() {
  return watch("src/dist.package.json", copyPackageJson);
}

function start() {
  return nodemon({
    script: "dist/server.js",
    watch: "dist",
    env: { NODE_ENV: "development" },
  });
}

const watchSrc = series(
  build,
  parallel(
    watchScss,
    watchTsServer,
    watchTsClient,
    watchViews,
    watchPackageJson,
    start
  )
);

export { watchSrc };
