# The jsMenus library

The `demo.html` shows most of these features.

## The Menu class

### Construction

`new MenuItem`(_options_)

### Properties

These can be initialized in the _options_ object
passed to the constructor.

`type` - one of `menubar` or `contextmenu` (the default).

`items` - the array of MenuItems.
You can also build this array incrementally using the `append` method.

`beforeShow` - a function that is called before the menu is displayed.
This Menu is passed as the first argument.
This is useful for updating properties of menu items.
It can be used in place of the Electron `menu-wil-show` event.
There is also a `beforeShow` call-back on `MenuItem`.

## Class properties

`contextMenuParent` -  Parent node for context menu popup.
If null, `document.body` is the default.

### Instance methods:

`append`(_menuItem_)

`insert`(_item_, _index_)

`remove`(_item_)

`removeAt`(_index_)

`popup`(_clientX_, _clientY_) - display this menu.
This is normally only called directly for context menus.

### Static methods

`setApplicationMenu`(_menuBar_)

## The MenuItem class

### Constructing

`new MenuItem`(_options_)

### Properties

These can be initialized in the _options_ object
passed to the constructor.

`type` - one of `separator`, `checkbox`, or `normal` (the default).
If `separator`, this is not a real MenuItem, but is just used to
display a separator line.

`label` - the descriptive label.

`icon` - an icon (small image) to display before the label.

`submenu` - a (child) sub-menu of the containing menu.

`accelerator` - keyboard accelerator.
This is preferred over using `key` and `modifiers` because
it can handle multi-key sequences, and because this is compatible with Electron.
Note this property is only "informational" - this library
does not handle keyboard events, except for menu navigation.

`key` - keyboard key 

`modifiers` - sequence of modifiers - used in conjuction with `key`.
Displayed using symbols if `MenuItem.useModifierSymbols` is true,
which is the default only on Mac.

`enabled` - normally true.  If false, it is partially grayed out
and cannot be selected.

`visible` - normally true.  If false, it is hidden.

`checked` - true if a checkbox is checked.

`tooltip` - a string displayed when hovering over the item.

`click` - function that gets called when selected (mouse click or keboard Enter).
The active `MenuItem` is passed as the first arguemnt,

`beforeShow` - a function that is called before the MenuItem is displayed.
It is useful for updating properties (such as checkboxes and visibility).
This MenuItem is passed as the first argument.
