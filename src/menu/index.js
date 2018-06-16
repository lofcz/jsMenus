import MenuItem from '../menu-item';
import isDescendant from '../is-decendant';
import recursiveNodeFind from '../recursive-node-find';

class Menu {
	constructor(settings = {}) {
		const typeEnum = ['contextmenu', 'menubar'];
		let items = [];
		let type = isValidType(settings.type) ? settings.type : 'contextmenu';

		Object.defineProperty(this, 'items', {
			get: () => {
				return items;
			}
		});

	 	Object.defineProperty(this, 'type', {
			get: () => {
				return type;
			},
			set: (typeIn) => {
				type = isValidType(typeIn) ? typeIn : type;
			}
		});

		this.append = item => {
			if(!(item instanceof MenuItem)) {
				console.error('appended item must be an instance of MenuItem');
				return false;
			}
			item.parentMenu = this;
			let index = items.push(item);
			return index;
		};

		this.insert = (item, index) => {
			if(!(item instanceof MenuItem)) {
				console.error('inserted item must be an instance of MenuItem');
				return false;
			}

			items.splice(index, 0, item);
			item.parentMenu = this;
			return true;
		};

		this.remove = item => {
			if(!(item instanceof MenuItem)) {
				console.error('item to be removed is not an instance of MenuItem');
				return false;
			}

			let index = items.indexOf(item);
			if(index < 0) {
				console.error('item to be removed was not found in this.items');
				return false;
			} else {
				items.splice(index, 0);
				return true;
			}
		};

		this.removeAt = index => {
			items.splice(index, 0);
			return true;
		};

		this.node = null;
		this.currentSubmenu = null;
		this.parentMenuItem = null;

		function isValidType(typeIn = '', debug = false) {
			if(typeEnum.indexOf(typeIn) < 0) {
				if(debug) console.error(`${typeIn} is not a valid type`);
				return false;
			}
			return true;
		}

	}

	createMacBuiltin() {
		console.error('This method is not available in browser :(');
		return false;
	}

	popup(x, y, submenu = false, menubarSubmenu = false) {
		let menuNode;
		let setRight = false;

		submenu = submenu || this.submenu;
		this.submenu = menubarSubmenu;

		menubarSubmenu = menubarSubmenu || this.menubarSubmenu;
		this.menubarSubmenu = menubarSubmenu;
		if (! Menu._topmostMenu) {
			Menu._topmostMenu = this;
			let el = Menu.contextMenuParent || document.body;
			Menu._listenerElement = el;
			el.addEventListener('mouseup', Menu._mouseHandler, false);
			el.addEventListener('mousedown', Menu._mouseHandler, false);
		}

		if(this.node) {
			menuNode = this.node;
		} else {
			menuNode = this.buildMenu(submenu, menubarSubmenu);
			menuNode.jsMenu = this;
			this.node = menuNode;
		}

		this.items.forEach(item => {
			if(item.submenu) {
				item.node.classList.remove('submenu-active');
				item.submenu.popdown();
			}
		});
		let width = menuNode.clientWidth;
		let height = menuNode.clientHeight;

		if((x + width) > window.innerWidth) {
			setRight = true;
			if(submenu) {
				let node = this.parentMenuItem.node;
				x = node.offsetWidth + ((window.innerWidth - node.offsetLeft) - node.offsetWidth) - 2;
			} else {
				x = 0;
			}
		}

		if((y + height) > window.innerHeight) {
			y = window.innerHeight - height;
		}

		if(!setRight) {
			menuNode.style.left = x + 'px';
			menuNode.style.right = 'auto';
		} else {
			menuNode.style.right = x + 'px';
			menuNode.style.left = 'auto';
		}

		menuNode.style.top = y + 'px';
		menuNode.classList.add('show');

		if(this.node.parentNode) {
			if(menuNode === this.node) return;
			this.node.parentNode.replaceChild(menuNode, this.node);
		} else {
			let el = Menu.contextMenuParent || document.body;
			el.appendChild(this.node);
		}
	}

	popdown() {
		if(this.node && this.type !== 'menubar') {
			this.node.parentNode.removeChild(this.node);
			this.node = null;
		}
		if (this.parentMenu == null) {
			Menu._topmostMenu = null;
			let el = Menu._listenerElement;
			if (el) {
				el.removeEventListener('mouseup', Menu._mouseHandler, false);
				el.removeEventListener('mousedown', Menu._mouseHandler, false);
				Menu._listenerElement = null;
			}
		}

		if(this.type === 'menubar') {
			this.clearActiveSubmenuStyling();
		}

		this.items.forEach(item => {
			if(item.submenu) {
				item.submenu.popdown();
			} else {
				item.node = null;
			}
		});
	}

	popdownAll() {
		this.topmostMenu.popdown();
		return;
	}

	buildMenu(submenu = false, menubarSubmenu = false) {
		let menuNode = this.menuNode;
		if(submenu) menuNode.classList.add('submenu');
		if(menubarSubmenu) menuNode.classList.add('menubar-submenu');

		menuNode.jsMenu = this;
		this.items.forEach(item => {
			item.parentMenu = this;
			if (item.visible) {
				let itemNode = item.buildItem(menuNode,
							      this.type === 'menubar');
				menuNode.appendChild(itemNode);
			}
			//itemNode.jsMenu = this;
		});
		return menuNode;
	}

	static _mouseHandler(e) {
		let inMenubar = Menu._menubarNode != null
                    && isDescendant(Menu._menubarNode, e.target);
		let menubarHandler = e.currentTarget == Menu._menubarNode;
		let miNode = e.target;
		while (miNode && ! miNode.jsMenuItem)
			miNode = miNode.parentNode;
		/* mouseenter:
		     if selected sibling: unhighlight (and popdown if submenu)
		     select item and if submenu popup
		   mouseout (or mouseleave):
		     if (! submenu) unhighlight
		   mousedown:
		   if (miNode) select
		   else popdownAll
		*/
		//console.log("HANDLE "+e.type+" inMB:"+inMenubar+" handler-t:"+e.currentTarget+" mbHandler:"+menubarHandler+" miNode:"+miNode);
		if (e.type=="mouseup") {
			/*
			if (miNode != null) {
			if active and not submenu: popdownAll and do click.
			if (active and submenu) as-is.
			if (! active) should not happen
			} else {
			do nothing
			}
			*/
		}
		if (e.type=="mousedown" && !miNode) {
			if (Menu._topmostMenu)
				Menu._topmostMenu.popdownAll();
		}
		if ((inMenubar == menubarHandler) && miNode) {
			let item = miNode.jsMenuItem;
			if (e.type=="mousedown") {
				item.node.classList.toggle('submenu-active');
				if(item.submenu) {
					if(item.node.classList.contains('submenu-active')) {
						item.submenu.popup(item.node.offsetLeft, item.node.clientHeight, true, true);
						item.parentMenu.currentSubmenu = item.submenu;
					} else {
						item.submenu.popdown();
						item.parentMenu.currentSubmenu = null;
					}
				}
			}
			if (e.type=="mouseup" && !item.submenu) {
				item.parentMenu.popdownAll();
				if(item.type === 'checkbox')
					item.checked = !item.checked;

				if(item.click) item.click(this);
			}
		}
	}

	static setApplicationMenu(menubar, parent=null) {
		let oldNode = Menu._menubarNode;
		if (oldNode) {
			let parent = oldNode.parentNode;
			if (parent != null)
				parent.removeChild(oldNode);
			newNode.removeEventListener('mousedown', Menu._mouseHandler, false);
			Menu._menubarNode = null;
		}
		if (menubar != null) {
			if (parent == null)
				parent = Menu._menubarParent || document.body;
			Menu._menubarParent = parent;
			let newNode = menubar.buildMenu();
			newNode.jsMenuItem = null;
			parent.insertBefore(newNode, parent.firstChild);
			newNode.addEventListener('mousedown', Menu._mouseHandler, false);
			Menu._menubarNode = newNode;
			menubar.node = newNode;
		}
		Menu._menubar = menubar;
	}

	get menuNode() {
		let node = document.createElement('ul');
		node.classList.add('nwjs-menu', this.type);
		return node;
	}

	get parentMenu() {
		if(this.parentMenuItem) {
			return this.parentMenuItem.parentMenu;
		} else {
			return undefined;
		}
	}

	get hasActiveSubmenu() {
		if(this.node && this.node.querySelector('.submenu-active')) {
			return true;
		} else {
			return false;
		}
	}

	get topmostMenu() {
		let menu = this;

		while(menu.parentMenu) {
			if(menu.parentMenu) {
				menu = menu.parentMenu;
			}
		}

		return menu;
	}

	clearActiveSubmenuStyling(notThisNode) {
		if (! this.node)
			return;
		let submenuActive = this.node.querySelectorAll('.submenu-active');
		for(let node of submenuActive) {
			if(node === notThisNode) continue;
			node.classList.remove('submenu-active');
		}
	}

	isNodeInChildMenuTree(node = false) {
		if(!node) return false;
		return recursiveNodeFind(this, node);
	}
}

// Parent node for context menu popup.  If null, document.body is the default.
Menu.contextMenuParent = null;

/* FUTURE
Menu._keydownListener = function(e) {
    console.log("menu.key-down "+e.key);
}
Menu._keydownListening = false;
Menu._keydownListen = function(value) {
    if (value != Menu._keydownListening) {
        if (value)
            document.addEventListener('keydown', Menu._keydownListener, false);
        else
            document.removeEventListener('keydown', Menu._keydownListener, false);
    }
    Menu._keydownListening = value;
}
Menu._keydownListen(true);
*/

export default Menu;
// Local Variables:
// js-indent-level: 8
// indent-tabs-mode: t
// End:
