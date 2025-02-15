const gulp = require('gulp');
const uglify = require('gulp-uglify');
const cleanCSS = require('gulp-clean-css');
const rename = require('gulp-rename');

// JavaScript task
gulp.task('scripts', function() {
    return gulp.src('jsMenus.js')
        .pipe(uglify())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dist'));
});

// CSS task
gulp.task('styles', function() {
    return gulp.src('jsMenus.css')
        .pipe(cleanCSS())
        .pipe(rename({ suffix: '.min' }))
        .pipe(gulp.dest('dist'));
});

// Build task
gulp.task('build', gulp.parallel('scripts', 'styles'));

// Default task
gulp.task('default', gulp.series('build'));
