# Menu in JavaScript

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
* Keyboard navigation (using arrow keys, Escape, and Enter).
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

### Using

Just load or require `nwjs-menu-browser.js` and `nwjs-menu-browser.css`.

### Screenshots

This shows the context menu for the [DomTerm terminal emulator](https://domterm.org).
DomTerm is started using the `--chrome-app` flag,
which starts the Google Chrome browser in "application mode",
without the default "chrome" (location bar etc).

![domterm-menu-bar](./example-assets/images/domterm-context-menu.png)

### TODO
* Test and polish style on multiple platforms, including MacOS.
* Internal cleanup - Menu or MenuItem should not have properties
that depend on display/navigation state. Specifically, there
should be no pointers to the parent or DOM node, not even temporarily.
