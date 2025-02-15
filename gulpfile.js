const gulp = require('gulp');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const wrap = require('gulp-wrap');
const { rm } = require('fs/promises');
const { exec } = require('child_process');
const plumber = require('gulp-plumber');

gulp.task('clean', async function() {
    try {
        await rm('dist', { recursive: true, force: true });
    } catch (error) {
        if (error.code !== 'ENOENT') {
            throw error;
        }
    }
});

gulp.task('declarations', function(cb) {
    exec('npx tsc --declaration --emitDeclarationOnly --outDir dist jsMenus2.ts', function(err, stdout, stderr) {
        if (err) {
            console.error(stderr);
            cb(err);
        } else {
            console.log(stdout);
            cb();
        }
    });
});

gulp.task('typescript', function(cb) {
    exec('npx tsc --outDir dist jsMenus2.ts', function(err, stdout, stderr) {
        if (err) {
            console.error(stderr);
            cb(err);
        } else {
            console.log(stdout);
            cb();
        }
    });
});

gulp.task('scripts', function() {
    return gulp.src('dist/jsMenus2.js', { allowEmpty: true })
        .pipe(plumber())
        .pipe(wrap(`
            (function(root, factory) {
                if (typeof define === 'function' && define.amd) {
                    define([], factory);
                } else if (typeof exports === 'object') {
                    module.exports = factory();
                } else {
                    root.JsMenuLib = factory();
                }
            }(typeof self !== 'undefined' ? self : this, function() {
                <%= contents %>
                return {
                    Menu: Menu,
                    MenuItem: MenuItem
                };
            }));
        `))
        .pipe(rename({ suffix: '.umd' }))
        .pipe(gulp.dest('dist'))
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dist'));
});

gulp.task('styles', function() {
    return gulp.src('jsMenus.css')
        .pipe(plumber())
        .pipe(cleanCSS())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dist'));
});

gulp.task('build', gulp.series(
    'clean',
    gulp.parallel('declarations', 'typescript'),
    gulp.parallel('scripts', 'styles')
));

gulp.task('default', gulp.series('build'));
