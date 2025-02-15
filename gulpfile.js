const gulp = require('gulp');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');
const wrap = require('gulp-wrap');

gulp.task('scripts', function() {
    return gulp.src('jsMenus.js')
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
        .pipe(cleanCSS())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dist'));
});

gulp.task('build', gulp.parallel('scripts', 'styles'));
gulp.task('default', gulp.series('build'));