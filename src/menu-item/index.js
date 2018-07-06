import Menu from '../menu';
import isDescendant from '../is-decendant';
import { modifierSymbols, keySymbols } from '../symbols';

class MenuItem {
	constructor(settings = {}) {

		const modifiersEnum = ['cmd', 'command', 'super', 'shift', 'ctrl', 'alt'];
		const typeEnum = ['separator', 'checkbox', 'normal'];
		let type = isValidType(settings.type) ? settings.type : 'normal';
		let submenu = settings.submenu || null;
		let click = settings.click || null;
		let modifiers = validModifiers(settings.modifiers) ? settings.modifiers : null;
		let label = settings.label || '';

		let enabled = settings.enabled;
		if(typeof settings.enabled === 'undefined') enabled = true;
		let visible = settings.visible;
		if(typeof settings.visible === 'undefined') visible = true;

		if(submenu) {
			submenu.parentMenuItem = this;
		}

		Object.defineProperty(this, 'type', {
			get: () => {
				return type;
			}
		});

		Object.defineProperty(this, 'submenu', {
			get: () => {
				return submenu;
			},
			set: (inputMenu) => {
				console.warn('submenu should be set on initialisation, changing this at runtime could be slow on some platforms.');
				if(!(inputMenu instanceof Menu)) {
					console.error('submenu must be an instance of Menu');
					return;
				} else {
					submenu = inputMenu;
					submenu.parentMenuItem = this;
				}
			}
		});

		Object.defineProperty(this, 'click', {
			get: () => {
				return click;
			},
			set: (inputCallback) => {
				if(typeof inputCallback !== 'function') {
					console.error('click must be a function');
					return;
				} else {
					click = inputCallback;
				}
			}
		});

		Object.defineProperty(this, 'modifiers', {
			get: () => {
				return modifiers;
			},
			set: (inputModifiers) => {
				modifiers = validModifiers(inputModifiers) ? inputModifiers : modifiers;
			}
		});

		Object.defineProperty(this, 'enabled', {
			get: () => {
				return enabled;
			},
			set: (inputEnabled) => {
				enabled = inputEnabled;
			}
		});

		Object.defineProperty(this, 'visible', {
			get: () => {
				return visible;
			},
			set: (inputVisible) => {
				visible = inputVisible;
			}
		});

		Object.defineProperty(this, 'label', {
			get: () => {
				return label;
			},
			set: (inputLabel) => {
				label = inputLabel;
			}
		});

		this.icon = settings.icon || null;
		this.iconIsTemplate = settings.iconIsTemplate || false;
		this.tooltip = settings.tooltip || '';
		this.checked = settings.checked || false;

		this.key = settings.key || null;
		this.accelerator = settings.accelerator;
		this.node = null;

		if(this.key) {
			this.key = this.key.toUpperCase();
		}
		function validModifiers(modifiersIn = '') {
			let modsArr = modifiersIn.split('+');
			for(let i=0; i < modsArr; i++) {
				let mod = modsArr[i].trim();
				if(modifiersEnum.indexOf(mod) < 0) {
					console.error(`${mod} is not a valid modifier`);
					return false;
				}
			}
			return true;
		}

		function isValidType(typeIn = '', debug = false) {
			if(typeEnum.indexOf(typeIn) < 0) {
				if(debug) console.error(`${typeIn} is not a valid type`);
				return false;
			}
			return true;
		}
	}

	toString() {
		return this.type+"["+this.label+"]";
	}

	_mouseoverHandle_menubarTop() {
		let pmenu = this.parentMenu;
		if (pmenu.activeItemNode) {
			pmenu.activeItemNode.classList.remove('active');
			pmenu.activeItemNode = null;
		}
		if(this.parentMenu.hasActiveSubmenu) {
			if(this.node.classList.contains('submenu-active')) return;

			this.parentMenu.clearActiveSubmenuStyling(this.node);
			this.node.classList.add('submenu-active');

			if(this.parentMenu.currentSubmenu) {
				this.parentMenu.currentSubmenu.popdown();
				this.parentMenu.currentSubmenu = null;
			}

			if(this.submenu) {
				this.popupSubmenu(this.node.offsetLeft, this.node.clientHeight, true);
			}
		}
	}

	buildItem(menuNode, menuBarTopLevel = false) {
		let node = document.createElement('li');
		node.jsMenuNode = menuNode;
		node.jsMenu = menuNode.jsMenu;
		node.jsMenuItem = this;
		node.classList.add('menu-item', this.type);

		menuBarTopLevel = menuBarTopLevel || this.menuBarTopLevel || false;
		this.menuBarTopLevel = menuBarTopLevel;

		if(menuBarTopLevel) {
			node.addEventListener('mouseenter', this._mouseoverHandle_menubarTop.bind(this));
		}

		let iconWrapNode = document.createElement('div');
		iconWrapNode.classList.add('icon-wrap');

		if(this.icon) {
			let iconNode = new Image();
			iconNode.src = this.icon;
			iconNode.classList.add('icon');
			iconWrapNode.appendChild(iconNode);
		}

		let labelNode = document.createElement('div');
		labelNode.classList.add('label');

		let modifierNode = document.createElement('div');
		modifierNode.classList.add('modifiers');

		let checkmarkNode = document.createElement('div');
		checkmarkNode.classList.add('checkmark');

		if(!menuBarTopLevel) {
                    if (this.checked)
			node.classList.add('checked');
                    else
			node.classList.remove('checked');
		}

		let text = '';

		if(this.submenu && !menuBarTopLevel) {
			text = '▶︎';

			node.addEventListener('mouseleave', (e) => {
				if(node !== e.target) {
					if(!isDescendant(node, e.target)) this.submenu.popdown();
				}
			});
		} else {
			node.addEventListener('mouseleave', (e) => {
				let pmenu = this.parentMenu;
				if (pmenu.activeItemNode)
					pmenu.activeItemNode.classList.remove('active');
				pmenu.activeItemNode = null;
			});
		}

		if(this.modifiers && !menuBarTopLevel) {
			let mods = this.modifiers.split('+');

			// Looping this way to keep order of symbols - required by macOS
			for(let symbol in modifierSymbols) {
				if(mods.indexOf(symbol) > -1) {
					text += modifierSymbols[symbol];
				}
			}
		}

		if(this.key && !menuBarTopLevel) {
			text += this.key;
		}
		if (this.accelerator && !menuBarTopLevel) {
			let acc = this.accelerator;
                    let mac = false; // FIXME
                    let cmd = mac ? "Cmd" : "Ctrl";
                    acc = acc.replace("CommandOrControl", cmd);
                    acc = acc.replace("Mod+", cmd+"+");
			text += acc;
		}

		if(!this.enabled) {
			node.classList.add('disabled');
		}

		if(!menuBarTopLevel) {
			node.addEventListener('mouseenter', () => {
				let pmenu = this.parentMenu;
				if (pmenu.activeItemNode) {
					pmenu.activeItemNode.classList.remove('active');
					pmenu.activeItemNode = null;
				}
				if(this.parentMenu.currentSubmenu) {
					this.parentMenu.currentSubmenu.popdown();
					this.parentMenu.currentSubmenu.parentMenuItem.node.classList.remove('submenu-active');
				    this.parentMenu.currentSubmenu = null;
                                }
				if(this.submenu) {
					this.parentMenu.currentSubmenu = this.submenu;
					if(this.submenu.node) {
						if(this.submenu.node.classList.contains('show')) {
							return;
						}
					}

					let parentNode = node.parentNode;

					let x = parentNode.offsetWidth + parentNode.offsetLeft - 2;
					let y = parentNode.offsetTop + node.offsetTop - 4;
					this.popupSubmenu(x, y, menuBarTopLevel);
					node.classList.add('submenu-active');
				} else
					node.classList.add('active');
				this.parentMenu.activeItemNode = this.node;
			});
		}

		if(this.icon) labelNode.appendChild(iconWrapNode);

		let textLabelNode = document.createElement('span');
		textLabelNode.textContent = this.label;
		textLabelNode.classList.add('label-text');

		node.appendChild(checkmarkNode);

		labelNode.appendChild(textLabelNode);
		node.appendChild(labelNode);

		modifierNode.appendChild(document.createTextNode(text));
		node.appendChild(modifierNode);

		node.title = this.tooltip;
		this.node = node;
		return node;
	}

	popupSubmenu(x, y, menubarSubmenu = false) {
		this.submenu.popup(x, y, true, menubarSubmenu);
		this.submenu.node.menuItem = this.node;
		this.parentMenu.currentSubmenu = this.submenu;
	}
}

export default MenuItem;
// Local Variables:
// js-indent-level: 8
// indent-tabs-mode: t
// End:
