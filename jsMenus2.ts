interface MenuSettings {
    type?: string;
    beforeShow?: (menu: Menu) => void;
}

interface MenuItemSettings {
    type?: string;
    submenu?: Menu | MenuItemSettings[];
    click?: (item: MenuItem) => void;
    modifiers?: string;
    label?: string;
    enabled?: boolean;
    visible?: boolean;
    beforeShow?: (item: MenuItem) => void;
    icon?: string;
    iconIsTemplate?: boolean;
    tooltip?: string;
    checked?: boolean;
    key?: string;
    accelerator?: string | string[];
}

interface ExtendedHTMLElement extends HTMLElement {
    jsMenu?: Menu;
    jsMenuItem?: MenuItem;
    activeItemNode?: ExtendedHTMLElement;
    currentSubmenu?: Menu | null;
    menuItem?: ExtendedHTMLElement;
    parentMenuNode?: ExtendedHTMLElement;
}

class Menu {
    private items: MenuItem[] = [];
    private type: string;
    private beforeShow?: (menu: Menu) => void;
    public node: ExtendedHTMLElement | null = null;
    public submenu: boolean = false;
    public menubarSubmenu: boolean = false;
    
    static contextMenuParent: HTMLElement | null = null;
    static _currentMenuNode: ExtendedHTMLElement | null = null;
    static _menubarNode: ExtendedHTMLElement | null = null;
    static _menubar: Menu | null = null;
    static _topSheet: HTMLElement | undefined;
    static _topmostMenu: Menu | null = null;
    static _listenerElement: HTMLElement | null = null;
    static topsheetZindex: number = 5;
    static _keydownListening: boolean = false;
    static showMenuNode?: (menu: Menu, node: HTMLElement, width: number, height: number, baseX: number, baseY: number, x: number, y: number) => boolean;
    static hideMenuNode?: (menu: Menu, node: HTMLElement) => void;
    static menuDone?: (item: MenuItem | null) => void;
   
    static _keydownListener = (e: KeyboardEvent): void => {
        function nextItem(menuNode: ExtendedHTMLElement, curNode: ExtendedHTMLElement | null, forwards: boolean): ExtendedHTMLElement | null {
            let nullSeen = false;
            let next: Element | null = curNode;
            
            for (;;) {
                next = !next ? null
                    : forwards ? next.nextElementSibling
                    : next.previousElementSibling;
                    
                if (!next) {
                    next = forwards ? menuNode.firstElementChild
                        : menuNode.lastElementChild;
                    if (nullSeen || !next)
                        return null;
                    nullSeen = true;
                }
                
                if (next instanceof HTMLElement
                    && next.classList.contains("menu-item")
                    && (next as ExtendedHTMLElement).jsMenuItem?.type !== 'separator'
                    && !next.classList.contains("disabled"))
                    return next as ExtendedHTMLElement;
            }
        }

        function nextMenu(menuNode: ExtendedHTMLElement, forwards: boolean): ExtendedHTMLElement | null {
            const menubarNode = menuNode.menuItem?.parentNode as ExtendedHTMLElement;
            const next = nextItem(menubarNode,
                menubarNode.activeItemNode || null,
                forwards);
            if (next) {
                next.jsMenuItem?.select(next, true, true, true);
            }
            return next;
        }

        function openSubmenu(active: ExtendedHTMLElement): void {
            active.jsMenuItem?.selectSubmenu(active, false);
            menuNode = Menu._currentMenuNode;
            const next = nextItem(menuNode as ExtendedHTMLElement, null, true);
            if (next) {
                next.jsMenuItem?.select(next, true, false);
            }
        }

        let menuNode = Menu._currentMenuNode;
        if (menuNode) {
            const active = menuNode.activeItemNode;
            
            switch (e.keyCode) {
                case 27: // Escape
                case 37: // Left
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.keyCode == 37
                        && menuNode.jsMenu?.menubarSubmenu
                        && nextMenu(menuNode, false))
                        return;
                    menuNode.jsMenu?.popdown();
                    if (!Menu._topmostMenu && Menu.menuDone)
                        Menu.menuDone(null);
                    break;

                case 32: // Space
                case 13: // Enter
                    e.preventDefault();
                    e.stopPropagation();
                    if (active) {
                        if (active.jsMenuItem?.submenu)
                            openSubmenu(active);
                        else
                            active.jsMenuItem?.doit(active);
                    }
                    break;

                case 39: // Right
                    e.preventDefault();
                    e.stopPropagation();
                    if (active && active.jsMenuItem?.submenu)
                        openSubmenu(active);
                    else if (Menu._topmostMenu?.menubarSubmenu)
                        nextMenu(menuNode, true);
                    break;

                case 38: // Up
                case 40: // Down
                    e.preventDefault();
                    e.stopPropagation();
                    const next = nextItem(
                        menuNode as ExtendedHTMLElement,
                        menuNode.activeItemNode || null,
                        e.keyCode == 40
                    );
                    if (next)
                        next.jsMenuItem?.select(next, true, false);
                    break;
            }
        }
    };

    static _isMac: boolean = (() => {
        if (typeof navigator === "undefined") return false;

        if ('userAgentData' in navigator) {
            return (navigator as any).userAgentData?.platform === 'macOS';
        }
        
        return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
    })();

    static _inMenubar(node: HTMLElement): boolean {
        if (Menu._menubarNode === null) return false;
        
        let current: Element | null = node;
        while (current instanceof Element && !current.classList.contains('submenu')) {
            if (current === Menu._menubarNode) return true;
            current = current.parentElement;
        }
        return false;
    }

    static _activateSubmenu(miNode: HTMLElement): void {
        const item = (miNode as any).jsMenuItem;
        if (!item) return;
        
        const wasActive = miNode.classList.contains('submenu-active');
        Menu.showSubmenuActive(miNode, !wasActive);
        
        if (item.submenu) {
            if (!wasActive) {
                const menu = (miNode as any).jsMenu;
                if (menu && menu.node) {
                    menu.node.activeItemNode = miNode;
                    const rect = miNode.getBoundingClientRect();
                    item.popupSubmenu(rect.left, rect.bottom, true);
                }
            } else {
                item.submenu.popdown();
                const menu = (miNode as any).jsMenu;
                if (menu && menu.node) {
                    menu.node.currentSubmenu = null;
                    menu.node.activeItemNode = null;
                }
            }
        }
    }    

    constructor(settings: MenuSettings = {}, itemArgs: (MenuItem | MenuItemSettings)[] = []) {
        const typeEnum = ['contextmenu', 'menubar'];
        this.type = this.isValidType(settings.type) ? settings.type : 'contextmenu';
        this.beforeShow = settings.beforeShow;

        itemArgs.forEach(item => {
            if (item instanceof MenuItem) {
                this.items.push(item);
            } else {
                this.items.push(new MenuItem(item));
            }
        });
    }

    private isValidType(typeIn: string = '', debug: boolean = false): boolean {
        const typeEnum = ['contextmenu', 'menubar'];
        if (typeEnum.indexOf(typeIn) < 0) {
            if (debug) console.error(`${typeIn} is not a valid type`);
            return false;
        }
        return true;
    }

    getItems(): MenuItem[] {
        return this.items;
    }

    getBeforeShow(): ((menu: Menu) => void) | undefined {
        return this.beforeShow;
    }

    getType(): string {
        return this.type;
    }

    setType(typeIn: string): void {
        this.type = this.isValidType(typeIn) ? typeIn : this.type;
    }

    append(item: MenuItem): number | false {
        if (!(item instanceof MenuItem)) {
            console.error('appended item must be an instance of MenuItem');
            return false;
        }
        return this.items.push(item);
    }

    insert(item: MenuItem, index: number): boolean {
        if (!(item instanceof MenuItem)) {
            console.error('inserted item must be an instance of MenuItem');
            return false;
        }
        this.items.splice(index, 0, item);
        return true;
    }

    remove(item: MenuItem): boolean {
        if (!(item instanceof MenuItem)) {
            console.error('item to be removed is not an instance of MenuItem');
            return false;
        }

        const index = this.items.indexOf(item);
        if (index < 0) {
            console.error('item to be removed was not found in this.items');
            return false;
        }
        
        this.items.splice(index, 1);
        return true;
    }

    removeAt(index: number): boolean {
        this.items.splice(index, 1);
        return true;
    }

    popup(x: number, y: number, itemNode: ExtendedHTMLElement | null = null, menubarSubmenu: boolean = false): void {
        Menu._keydownListen(true);

        let setRight = false;
        let submenu = itemNode != null || this.submenu;
        this.submenu = menubarSubmenu;

        menubarSubmenu = menubarSubmenu || this.menubarSubmenu;
        this.menubarSubmenu = menubarSubmenu;
        let top: HTMLElement = Menu.contextMenuParent || document.body;
        
        if (!Menu._topSheet && Menu.topsheetZindex > 0) {
            let topSheet = document.createElement("div");
            topSheet.setAttribute("style",
                `position: fixed; top: 0px; bottom: 0px; left: 0px; right: 0px; z-index: ${Menu.topsheetZindex}`);
            top.appendChild(topSheet);
            Menu._topSheet = topSheet;
            top = topSheet;
        }

        if (!Menu._topmostMenu) {
            Menu._topmostMenu = this;
            Menu._listenerElement = top;
            top.addEventListener('mouseup', Menu._mouseHandler, false);
            top.addEventListener('mousedown', Menu._mouseHandler, false);
        }

        let menuNode = this.buildMenu(submenu, menubarSubmenu);
        (menuNode as any).jsMenu = this;
        this.node = menuNode;
        Menu._currentMenuNode = menuNode;

        if (this.node.parentNode) {
            if (menuNode === this.node) return;
            this.node.parentNode.replaceChild(menuNode, this.node);
        } else {
            (!!(menubarSubmenu && Menu._topSheet) && itemNode || top).appendChild(this.node);
        }

        let width = menuNode.clientWidth;
        let height = menuNode.clientHeight;
        let wwidth = top.offsetWidth;

        if ((x + width) > wwidth) {
            setRight = true;
            if (submenu && !menubarSubmenu) {
                x = wwidth - (itemNode?.parentNode as HTMLElement)?.offsetLeft + 2;
                if (width + x > wwidth) {
                    x = 0;
                    setRight = false;
                }
            } else {
                x = 0;
            }
        }

        let wheight = top.offsetHeight;
        if ((y + height) > wheight) {
            y = wheight - height;
            if (y < -0.5) y = wheight - height;
        }

        if (!setRight) {
            menuNode.style.left = x + 'px';
            menuNode.style.right = 'auto';
        } else {
            menuNode.style.right = x + 'px';
            menuNode.style.left = 'auto';
        }

        if (Menu._menubarNode && Menu._topSheet) {
            Menu._topSheet.style.top = `${Menu._menubarNode.offsetHeight}px`;
        }

        menuNode.style.top = y + 'px';
        if (!Menu.showMenuNode || !Menu.showMenuNode(this, menuNode, width, height, x, y, x, y)) {
            menuNode.classList.add('show');
        }
    }

    popdown(): void {
        this.items.forEach(item => {
            if (item.submenu) {
                item.submenu.popdown();
            } else {
                item.node = null;
            }
        });

        if (this.node && this.type !== 'menubar') {
            Menu._currentMenuNode = this.node.parentNode as HTMLElement;
            if (this.menubarSubmenu) {
                Menu.showSubmenuActive((this.node as any).menuItem, false);
            }
            if (Menu.hideMenuNode) {
                Menu.hideMenuNode(this, this.node);
            }
            this.node.parentNode?.removeChild(this.node);
            if (Menu._topSheet && Menu._topSheet.firstChild == null) {
                Menu._topSheet.parentNode?.removeChild(Menu._topSheet);
                Menu._topSheet = undefined;
            }
            this.node = null;
        }

        if (this === Menu._topmostMenu) {
            Menu._topmostMenu = null;
            let el = Menu._listenerElement;
            if (el) {
                el.removeEventListener('mouseup', Menu._mouseHandler, false);
                el.removeEventListener('mousedown', Menu._mouseHandler, false);
                Menu._listenerElement = null;
            }
        }

        if (this.type === 'menubar') {
            this.clearActiveSubmenuStyling();
        }
    }

    static showSubmenuActive(node: HTMLElement, active: boolean): void {
        if (active) {
            node.classList.add('submenu-active');
        } else {
            node.classList.remove('submenu-active');
        }
        
        if (node.firstChild instanceof Element) {
            node.firstChild.setAttribute('aria-expanded', active ? 'true' : 'false');
        }
    }

    static popdownAll(): void {
        Menu._topmostMenu?.popdown();
    }

    buildMenu(submenu: boolean = false, menubarSubmenu: boolean = false): ExtendedHTMLElement {
        if (this.beforeShow) {
            this.beforeShow(this);
        }

        let menuNode = document.createElement('ul') as ExtendedHTMLElement;
        menuNode.classList.add('nwjs-menu', this.type);
        menuNode.spellcheck = false;
        menuNode.setAttribute('contenteditable', 'true');
        menuNode.setAttribute('role', this.type === 'menubar' ? 'menubar' : 'menu');

        if (submenu) menuNode.classList.add('submenu');
        if (menubarSubmenu) menuNode.classList.add('menubar-submenu');

        (menuNode as any).jsMenu = this;
        (menuNode as any).parentMenuNode = Menu._currentMenuNode;

        this.items.forEach(item => {
            if (item.beforeShow) {
                item.beforeShow(item);
            }
            if (item.visible) {
                item.buildItem(menuNode, this.type === 'menubar');
            }
        });

        return menuNode;
    }

    static isDescendant(parent: Node, child: Node): boolean {
        let node: Node | null = child.parentNode;
        while (node !== null) {
            if (node === parent) {
                return true;
            }
            node = node.parentNode;
        }
        return false;
    }

    clearActiveSubmenuStyling(notThisNode?: HTMLElement): void {
        if (!this.node) return;
        
        let submenuActive = this.node.querySelectorAll('.submenu-active');
        submenuActive.forEach(node => {
            if (node === notThisNode) return;
            Menu.showSubmenuActive(node as HTMLElement, false);
        });
    }

    static _keydownListen(value: boolean): void {
        if (value !== Menu._keydownListening) {
            if (value) {
                document.addEventListener('keydown', Menu._keydownListener, true);
            } else {
                document.removeEventListener('keydown', Menu._keydownListener, true);
            }
        }
        Menu._keydownListening = value;
    }

    static _mouseHandler(e: MouseEvent): void {
        e.preventDefault();
        let inMenubar = Menu._inMenubar(e.target as HTMLElement);
        let menubarHandler = e.currentTarget == Menu._menubarNode;
        let miNode = e.target as HTMLElement;
        
        while (miNode && !(miNode as any).jsMenuItem) {
            miNode = miNode.parentNode as HTMLElement;
        }

        if (e.type == "mousedown" && inMenubar == menubarHandler
            && (!miNode || (miNode as any).jsMenuItem.menuBarTopLevel)) {
            if (Menu._topmostMenu) {
                Menu.popdownAll();
                if (Menu.menuDone) {
                    Menu.menuDone(null);
                }
            }
        }

        if ((inMenubar == menubarHandler) && miNode) {
            if (e.type == "mousedown") {
                Menu._activateSubmenu(miNode);
            }
            if (e.type == "mouseup") {
                (miNode as any).jsMenuItem.doit(miNode);
            }
        }
    }
}

class MenuItem {
    private _type: string;
    private _submenu: Menu | null;
    private _click: ((item: MenuItem) => void) | null;
    private _enabled: boolean;
    private _visible: boolean;
    private _label: string;
    private _beforeShow?: (item: MenuItem) => void;
    
    public node: ExtendedHTMLElement | null = null;
    public modifiers?: string;
    public icon: string | null;
    public iconIsTemplate: boolean;
    public tooltip: string;
    public checked: boolean;
    public key: string | null;
    public accelerator: string | null;
    public menuBarTopLevel: boolean = false;

    static submenuSymbol: string = '\u27a7';
    static useModifierSymbols: boolean = Menu._isMac;

    static modifierSymbols: { [key: string]: string } = {
        shift: '⇧',
        ctrl: '⌃',
        alt: '⌥',
        cmd: '⌘',
        super: '⌘',
        command: '⌘'
    };

    static keySymbols: { [key: string]: string } = {
        up: '↑',
        esc: '⎋',
        tab: '⇥',
        left: '←',
        down: '↓',
        right: '→',
        pageUp: '⇞',
        escape: '⎋',
        pageDown: '⇟',
        backspace: '⌫',
        space: 'Space'
    };

    constructor(settings: MenuItemSettings = {}) {
        const typeEnum = ['separator', 'checkbox', 'radio', 'normal'];
        this._type = this.isValidType(settings.type) ? settings.type : 'normal';
        
        if (settings.submenu) {
            if (settings.submenu instanceof Menu) {
                this._submenu = settings.submenu;
            } else {
                this._submenu = new Menu({}, settings.submenu.map(item => new MenuItem(item)));
            }
        } else {
            this._submenu = null;
        }

        this._click = settings.click || null;
        this.modifiers = settings.modifiers;
        this._label = settings.label || '';
        this._enabled = typeof settings.enabled === 'undefined' ? true : settings.enabled;
        this._visible = typeof settings.visible === 'undefined' ? true : settings.visible;
        this._beforeShow = settings.beforeShow;

        this.icon = settings.icon || null;
        this.iconIsTemplate = settings.iconIsTemplate || false;
        this.tooltip = settings.tooltip || '';
        this.checked = settings.checked || false;

        this.key = settings.key || null;
        let accelerator = settings.accelerator;
        if (!accelerator && settings.key) {
            accelerator = (settings.modifiers ? (settings.modifiers + "+") : "") + settings.key;
        }
        if (accelerator instanceof Array) {
            accelerator = accelerator.join(" ");
        }
        if (accelerator) {
            accelerator = accelerator
                .replace(/Command[+]/i, "Cmd+")
                .replace(/Control[+]/i, "Ctrl+")
                .replace(/(Mod|((Command|Cmd)OrCtrl))[+]/i,
                    Menu._isMac ? "Cmd+" : "Ctrl+");
        }
        this.accelerator = accelerator;

        if (accelerator && !settings.key) {
            const plus = accelerator.lastIndexOf("+", accelerator.length - 2);
            if (plus > 0) {
                this.modifiers = accelerator.substring(0, plus);
                this.key = accelerator.substring(plus + 1);
            } else {
                this.key = accelerator;
            }
        }

        if (this.key) {
            this.key = this.key.toUpperCase();
        }
    }

    get type(): string {
        return this._type;
    }

    get beforeShow(): ((item: MenuItem) => void) | undefined {
        return this._beforeShow;
    }

    get submenu(): Menu | null {
        return this._submenu;
    }

    set submenu(inputMenu: Menu | null) {
        console.warn('submenu should be set on initialisation, changing this at runtime could be slow on some platforms.');
        if (inputMenu && !(inputMenu instanceof Menu)) {
            console.error('submenu must be an instance of Menu');
            return;
        }
        this._submenu = inputMenu;
    }

    get click(): ((item: MenuItem) => void) | null {
        return this._click;
    }

    set click(inputCallback: ((item: MenuItem) => void) | null) {
        if (inputCallback && typeof inputCallback !== 'function') {
            console.error('click must be a function');
            return;
        }
        this._click = inputCallback;
    }

    get enabled(): boolean {
        return this._enabled;
    }

    set enabled(inputEnabled: boolean) {
        this._enabled = inputEnabled;
    }

    get visible(): boolean {
        return this._visible;
    }

    set visible(inputVisible: boolean) {
        this._visible = inputVisible;
    }

    get label(): string {
        return this._label;
    }

    set label(inputLabel: string) {
        this._label = inputLabel;
    }

    toString(): string {
        return this.type + "[" + this.label + "]";
    }

    private isValidType(typeIn: string = '', debug: boolean = false): boolean {
        const typeEnum = ['separator', 'checkbox', 'radio', 'normal'];
        if (typeEnum.indexOf(typeIn) < 0) {
            if (debug) console.error(`${typeIn} is not a valid type`);
            return false;
        }
        return true;
    }

    _mouseoverHandle_menubarTop(): void {
        let pmenu = (this.node as any).jsMenuNode;
        if (pmenu.activeItemNode) {
            pmenu.activeItemNode.classList.remove('active');
            pmenu.activeItemNode = null;
        }
        if (pmenu && pmenu.querySelector('.submenu-active')) {
            if (this.node?.classList.contains('submenu-active')) return;
            Menu.showSubmenuActive(this.node as HTMLElement, true);
            this.select(this.node as HTMLElement, true, true, true);
        }
    }

    doit(node: HTMLElement): void {
        if (!this.submenu) {
            Menu.popdownAll();
            if (this.type === 'checkbox') {
                this.checked = !this.checked;
            } else if (this.type === 'radio') {
                this.checked = true;
                for (let dir = 0; dir <= 1; dir++) {
                    for (let n = node; ;) {
                        const nextNode = dir ? 
                            node.nextElementSibling as HTMLElement : 
                            node.previousElementSibling as HTMLElement;
                        
                        if (!nextNode || !nextNode.classList.contains("radio")) {
                            break;
                        }
                        
                        const menuItem = (nextNode as any).jsMenuItem;
                        if (menuItem) {
                            menuItem.checked = false;
                        }
                        
                        n = nextNode;
                    }
                }
            }
            if (this.click) this.click(this);
            if (Menu.menuDone) {
                Menu.menuDone(this);
            }
        }
    }

    select(node: HTMLElement, turnOn: boolean, popupSubmenu: boolean, menubarSubmenu: boolean = false): void {
        let pmenu = (node as any).jsMenuNode;
        if (pmenu.activeItemNode) {
            pmenu.activeItemNode.classList.remove('active');
            Menu.showSubmenuActive(pmenu.activeItemNode, false);
            pmenu.activeItemNode = null;
        }
        if (pmenu.currentSubmenu) {
            pmenu.currentSubmenu.popdown();
            pmenu.currentSubmenu = null;
        }
        if (this.submenu && popupSubmenu) {
            this.selectSubmenu(node, menubarSubmenu);
        } else {
            node.classList.add('active');
        }
        (node as any).jsMenuNode.activeItemNode = node;
    }

    selectSubmenu(node: HTMLElement, menubarSubmenu: boolean): void {
        (node as any).jsMenuNode.currentSubmenu = this.submenu;
        if (this.submenu?.node) return;

        let parentNode = node.parentNode as HTMLElement;
        let x: number, y: number;
        
        if (menubarSubmenu) {
            let rect = node.getBoundingClientRect();
            x = rect.left;
            y = rect.bottom;
        } else {
            x = parentNode.offsetWidth + parentNode.offsetLeft - 2;
            y = parentNode.offsetTop + node.offsetTop - 4;
        }
        
        this.popupSubmenu(x, y, menubarSubmenu);
        Menu.showSubmenuActive(node, true);
    }

    buildItem(menuNode: HTMLElement, menuBarTopLevel: boolean = false): void {
        let node = document.createElement('li');
        node.setAttribute('role', this.type === 'separator' ? 'separator' : 'menuitem');
        (node as any).jsMenuNode = menuNode;
        (node as any).jsMenu = (menuNode as any).jsMenu;
        (node as any).jsMenuItem = this;
        node.classList.add('menu-item', this.type);

        menuBarTopLevel = menuBarTopLevel || this.menuBarTopLevel || false;
        this.menuBarTopLevel = menuBarTopLevel;

        if (menuBarTopLevel) {
            node.addEventListener('mouseenter', this._mouseoverHandle_menubarTop.bind(this));
        }

        let iconWrapNode = document.createElement('div');
        iconWrapNode.classList.add('icon-wrap');

        if (this.icon) {
            let iconNode = new Image();
            iconNode.src = this.icon;
            iconNode.classList.add('icon');
            iconWrapNode.appendChild(iconNode);
        }

        let labelNode = document.createElement('span');
        labelNode.classList.add('label');

        let checkmarkNode = document.createElement('span');
        checkmarkNode.classList.add('checkmark');

        if (this.checked && !menuBarTopLevel) {
            node.classList.add('checked');
        }

        if (this.submenu) {
            node.setAttribute('aria-haspopup', 'true');
        }

        if (this.submenu && !menuBarTopLevel) {
            node.addEventListener('mouseleave', (e) => {
                if (node !== e.target) {
                    if (!Menu.isDescendant(node, e.target as Node)) {
                        this.submenu?.popdown();
                    }
                }
            });
        }

        if (this.icon) labelNode.appendChild(iconWrapNode);

        let buttonNode: HTMLElement;
        if (this.type !== 'separator') {
            buttonNode = document.createElement('span');
            buttonNode.setAttribute('role', 'button');
            node.appendChild(buttonNode);
            if (this.submenu) {
                buttonNode.setAttribute('aria-expanded', 'false');
            }
            if (!menuBarTopLevel) {
                buttonNode.addEventListener('mouseenter', () => {
                    this.select(node, true, true);
                });
            }
        } else {
            buttonNode = node;
        }

        let textLabelNode = document.createElement('span');
        textLabelNode.textContent = this.label;
        textLabelNode.classList.add('label-text');

        buttonNode.appendChild(checkmarkNode);
        labelNode.appendChild(textLabelNode);
        buttonNode.appendChild(labelNode);

        if (this.submenu && !menuBarTopLevel) {
            const n = document.createElement('span');
            n.classList.add('modifiers');
            n.append(MenuItem.submenuSymbol);
            buttonNode.appendChild(n);
        }

        if (this.accelerator) {
            let keyNode = document.createElement('span');
            keyNode.classList.add('keys');
            let i = 0;
            const len = this.accelerator.length;
            for (;;) {
                if (i > 0) {
                    keyNode.append(" ");
                }
                let sp = this.accelerator.indexOf(' ', i);
                let key = this.accelerator.substring(i, sp < 0 ? len : sp);
                let pl = key.lastIndexOf('+', key.length - 2);
                if (pl > 0) {
                    let mod = key.substring(0, pl);
                    let modNode = document.createElement('span');
                    modNode.classList.add('modifiers');
                    if (MenuItem.useModifierSymbols) {
                        let mods = mod.toLowerCase().split('+');
                        mod = "";
                        for (let symbol in MenuItem.modifierSymbols) {
                            if (mods.indexOf(symbol) >= 0) {
                                mod += MenuItem.modifierSymbols[symbol];
                            }
                        }
                    } else {
                        mod += "+";
                    }
                    modNode.append(mod);
                    keyNode.append(modNode);
                    key = key.substring(pl + 1);
                }
                keyNode.append(key);
                if (sp < 0) break;
                i = sp + 1;
            }
            keyNode.normalize();
            buttonNode.appendChild(keyNode);
        }

        node.title = this.tooltip;
        this.node = node;
        menuNode.appendChild(node);
    }

    popupSubmenu(x: number, y: number, menubarSubmenu: boolean = false): void {
        this.submenu?.popup(x, y, this.node, menubarSubmenu);
        if (this.submenu?.node) {
            (this.submenu.node as any).menuItem = this.node;
        }
        (this.node as any).jsMenuNode.currentSubmenu = this.submenu;
    }
}

// Export pro Node.js prostředí
if (typeof module !== "undefined" && module.exports) {
    module.exports = { Menu, MenuItem };
}
