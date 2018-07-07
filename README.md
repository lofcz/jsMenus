# NWJS Menu Browser

This is Per Bothner's fork of Sam Wray's [mwjs-menu-browser](https://github.com/2xAA/nwjs-menu-browser) library.
It implements menus (including both menubar and contextmenu)
using plain JavaScript that should work in all modern browsers without
requiring any special permissions or server support.
The API is similar (and mostly compatible) with that of NWJS and Electron.

This makes possible applications that look and feel like native
applications, using web APIs (HTML, JavaScript, CSS, DOM),
without the overhead of something like Electron.
You can use any "embedded" bare-bones web browser, including
the Chrome browser with the `--app` option.

As an example, the [DomTerm](https;//domterm.org) terminal emulator
has a "back-end" written in C, which communicates (using http and
websockets) with any modern browser.  It can optionally run under
Electron, and the code for creating menus (see `hlib/domterm-menus.js`)
is mostly the same whether using Electron to create menus, or using this
library in a generic browser.

Advantages and changes of this fork compared to the original:

* Menu-items and menus can be shared between menus.
* Preliminary support for keyboard navigation (only Escape works so far).
* Some changes to work better with libraries such as GoldenLayout
(for panes and tab) and full-screen.
* Change menubar API - you need to explicitly call `Menu.setApplicationMenu`
(like Electron) - creating the Menu objects is not sufficient.
* Pass MenuItem as (first) argument to click handler (like Electron).
* Support `visible` property on MenuItems (like Electron).
* Support `accelerator` property (like Electron) as an alernative to
`key` plus `modifiers`.
* Polishing so it works more like other menu systems, including
various bug fixes, and working smoothly under Firefox.
* Styling changes to make it look more native-looking (on Linux or Windows);
this is probably a regression on Mac (needs testing).
* Internal changes, such as when a menu is no longer shown, we remove
its elements, rather than just hiding it with css.

### Building

Install a bunch of dependencies using `npm` (FIXME)
and then do `npm run build`.  Then you can load
`dist/nwjs-menu-browser.js` and `dist/nwjs-menu-browser.css`
in your browser, and then use `nwjsMenuBrowser.Menu`
and  `nwjsMenuBrowser.MenuItem`.

### TODO
* Finish basic keyboard navigation.
* Avoid build dependencies on `npm` or `webpack`.
* Test and polish style on multiple platforms, including MacOS.
* Internal cleanup - Menu or MenuItem should not have properties
that depend on display/navigation state. Specifically, there
should be no pointers to the parent or DOM node, not even temporarily.

## Orginal README

Browser Polyfill for [NWJS](http://docs.nwjs.io/en/latest/) [Menu](http://docs.nwjs.io/en/latest/References/Menu/) and [MenuItem](http://docs.nwjs.io/en/latest/References/MenuItem/).

## Why

My audio visualisation app [modV](http://github.com/2xAA/modV/) recently moved to NWJS and I had previously built my own (terrible) context menus for the browser. So as not to write two lots of code I thought I'd polyfill the browser so you could use the same code between NWJS and (presumably) Chrome!

This can also be used as a regular Context Menu library if so wished 😎

## Caveats

Does not support ```createMacBuiltIn```, ```MenuItem.key``` or ```MenuItem.modifiers```, though usage of these will not break existing code and will be displayed in the menu nodes.

These menus are not checked against any OS menu specification, but it's close enough to polyfill for the browser.
If you'd like more accurate functionality, PRs and enhancement issues are welcome!

## Usage

### Install

`npm i nwjs-menu-browser`

### Demo

Run ```npm run watch``` and a browser window pointing to ```localhost:8080``` will open.
(the demo is not included in the NPM package, please clone from git)

### Including in your project

The included stylesheet in `dist` is optional, but you will need some sort of style for your menus.
```HTML
<link rel=stylesheet type=text/css href=nwjs-menu-browser.css>
```

#### ES6
```JavaScript
import { Menu, MenuItem } from 'nwjs-menu-browser';

if(!nw) {
  var nw = {
    Menu,
    MenuItem
  };
}
```

#### ES5
```JavaScript
if(!nw) {
  var nw = {};
  nw.Menu = require('nwjs-menu-browser').Menu;
  nw.MenuItem = require('nwjs-menu-browser').MenuItem;
}
```

#### Script Tag
```HTML
<script src=nwjs-menu-browser.js></script>
<script>
if(!nw) {
  var nw = {};
  nw.Menu = window.nwjsMenuBrowser.Menu;
  nw.MenuItem = window.nwjsMenuBrowser.MenuItem;
}
</script>
```

### Build

Prerequisites: ``npm install gulp webpack webpack-stream babel-loader babel-core es2015 babel-preset-es2015``.

If required, build using ```npm run build```, built files will be in ```./dist```.

## Screenshots
The included stylesheet (```nwjs-menu-browser.css```) is a close match to macOS Sierra's menus.
If somebody would like to contribute extra 'themes' I'd be very happy 😘

![menu-bar](./example-assets/images/menu-bar.png)

![menu-bar](./example-assets/images/context-menu.png)
