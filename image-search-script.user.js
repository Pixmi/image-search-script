// ==UserScript==
// @name        Image Search Script
// @namespace   http://tampermonkey.net/
// @version     1.0.2
// @description Quickly access an intuitive and visually pleasing image search menu with a long right-click on any image.
// @description:zh-TW 長按滑鼠右鍵，快速呼叫圖片搜尋選單，提供簡潔流暢的使用體驗。
// @description:zh-CN 长按滑鼠右键，快速呼叫图片搜寻选单，提供简洁流畅的使用体验。
// @author      Pixmi
// @homepage    https://github.com/Pixmi/image-search-script
// @updateURL   https://github.com/Pixmi/image-search-script/raw/main/twitter-plus.meta.js
// @downloadURL https://github.com/Pixmi/image-search-script/raw/main/twitter-plus.user.js
// @supportURL  https://github.com/Pixmi/image-search-script/issues
// @icon        https://raw.githubusercontent.com/Pixmi/image-search-script/refs/heads/main/icon.svg
// @match       *://*/*
// @require     https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant       GM_setValue
// @grant       GM_getValue
// @grant       GM_addStyle
// @grant       GM_registerMenuCommand
// @grant       GM_xmlhttpRequest
// @connect     ascii2d.net
// @license     GPL-3.0
// @run-at      document-body
// @noframes
// ==/UserScript==

GM_addStyle(`
#image-search-menu {
    background-color: rgba(0, 0, 0, .75);
    color: rgb(255, 255, 255);
    display: none;
    flex-direction: column;
    font-size: 16px;
    opacity: 0;
    width: unset;
    min-width: 150px;
    height: unset;
    min-height: unset;
    transition: opacity .5s;
    position: fixed;
    top: unset;
    left: unset;
    z-index: 9999;
}
#image-search-menu.show {
    display: flex;
    opacity: 1;
}
.image-search-option {
    cursor: pointer;
    display: block;
    padding: 5px 10px;
}
.image-search-option + .image-search-option {
    border-top: 1px solid rgba(255, 255, 255, .5);
}
.image-search-option:hover {
    background-color: rgba(255, 255, 255, .3);
}
iframe#image-search-setting {
    width: 300px !important;
    height: 300px !important;
}
`);

const searchOptions = new Map([
    {
        label: 'Google Lens',
        key: 'GOOGLE_LENS',
        url: 'https://lens.google.com/uploadbyurl?url=%s'
    }, {
        label: 'SauceNAO',
        key: 'SAUCENAO',
        url: 'https://saucenao.com/search.php?db=999&url=%s'
    }, {
        label: 'Ascii2D',
        key: 'ASCII2D',
        url: ''
    }, {
        label: 'IQDB',
        key: 'IQDB',
        url: 'https://iqdb.org/?url=%s'
    }, {
        label: 'TinEye',
        key: 'TINEYE',
        url: 'https://www.tineye.com/search?url=%s'
    }, {
        label: 'Baidu',
        key: 'BAIDU',
        url: 'https://image.baidu.com/n/pc_search?queryImageUrl=%s'
    }, {
        label: 'Bing',
        key: 'BING',
        url: 'https://www.bing.com/images/searchbyimage?FORM=IRSBIQ&cbir=sbi&imgurl=%s'
    }
].map(item => [item.key, item]));

(function () {
    'use strict';

    document.addEventListener('mousedown', (event) => {
        searchMenu.holding = false;
        if (event.button === 2 && event.target.nodeName === 'IMG') {
            searchMenu.timer = setTimeout(() => {
                searchMenu.holding = true;
                searchMenu.open(event.target);
            }, 500);
        } else {
            if (event.target !== searchMenu.pane && !event.target.classList.contains('image-search-option')) {
                searchMenu.clear();
            }
        }
    });

    document.addEventListener('mouseup', (event) => {
        if (event.button === 2) {
            clearTimeout(searchMenu.timer);
            if (searchMenu.holding) {
                event.preventDefault();
            }
        }
    });

    document.addEventListener('contextmenu', (event) => {
        if (searchMenu.holding) {
            event.preventDefault();
        } else {
            searchMenu.clear();
        }
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            searchMenu.update();
        }
    });
    document.addEventListener('scroll', () => { searchMenu.update() });
    window.addEventListener('resize', () => { searchMenu.update() });

    const newTab = (url) => {
        let tab = document.createElement('a');
        tab.href = url;
        tab.dispatchEvent(new MouseEvent('click', {ctrlKey: true, metaKey: true}));
    }

    class searchMenuController {
        constructor() {
            this.panel = null;
            this.image = null;
            this.holding = false;
            this.timer = null;
            this.init();
        }

        init() {
            this.panel = document.createElement('div');
            this.panel.id = 'image-search-menu';
            this.panel.addEventListener('click', (event) => {
                const action = event.target.dataset.action || false;
                console.log(action);
                if (action) {
                    switch (action) {
                        case 'ASCII2D':
                            GM_xmlhttpRequest({
                                method: 'POST',
                                url: 'https://ascii2d.net/imagesearch/search/',
                                data: JSON.stringify({ uri: this.image.src }),
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                timeout: 10000,
                                onload: function(response) {
                                    if (response.status == 200) {
                                        newTab(response.finalUrl);
                                    }
                                },
                                onerror: function(error) {
                                    console.error('請求錯誤:', error);
                                },
                                ontimeout: function() {
                                    console.error('請求超時');
                                }
                            });
                            break;
                        default: {
                            const option = searchOptions.get(action) || false;
                            if (!option) break;
                            newTab(option.url.replace('%s', this.image.src));
                            break;
                        }
                    }
                }
                this.clear();
            });
            document.body.append(this.panel);
        }

        open(target) {
            if (target.nodeName === 'IMG') {
                for (const [key, option] of searchOptions) {
                    if (!GM_getValue(key, true)) continue;
                    const item = document.createElement('div');
                    item.className = 'image-search-option';
                    item.textContent = option.label;
                    item.dataset.action = key;
                    this.panel.append((item));
                }
                this.panel.style.minHeight = `calc(${this.panel.childNodes.length} * (1.5rem + 10px))`;
                this.image = target;
                this.update();
                this.panel.classList.add('show');
            }
        }

        update() {
            if (this.image) {
                const status = {
                    width: this.image.width,
                    left: this.image.x,
                    top: this.image.y
                };
                for (const key of Object.keys(status)) {
                    this.panel.style[key] = `${status[key]}px`;
                };
            }
        }

        clear() {
            this.image = null;
            this.panel.classList.remove('show');
            this.panel.style.width = 0;
            this.panel.style.height = 0;
            this.panel.style.left = 0;
            this.panel.style.top = 0;
            while (this.panel.hasChildNodes()) {
                this.panel.lastChild.remove();
            }
        }
    }

    const searchMenu = new searchMenuController();
})();

GM_registerMenuCommand('Setting', () => config.open());

const config = new GM_config({
    'id': 'image-search-setting',
    'css': `
        #image-search-setting * {
            box-sizing: border-box;
        }
        #image-search-setting {
            box-sizing: border-box;
            width: 100%;
            height: 100%;
            padding: 10px;
            margin: 0;
        }
        #image-search-setting_buttons_holder {
            text-align: center;
        }
        .config_var {
            display: flex;
            align-items: center;
            flex-direction: row-reverse;
            justify-content: start;
        }
    `,
    'title': 'Search Options',
    'fields': {
        'GOOGLE_LENS': {
            'label': 'Google Lens',
            'type': 'checkbox',
            'default': true,
        },
        'SAUCENAO': {
            'label': 'SauceNAO',
            'type': 'checkbox',
            'default': true,
        },
        'ASCII2D': {
            'label': 'Ascii2D',
            'type': 'checkbox',
            'default': true,
        },
        'IQDB': {
            'label': 'IQDB',
            'type': 'checkbox',
            'default': true,
        },
        'TINEYE': {
            'label': 'TinEye',
            'type': 'checkbox',
            'default': true,
        },
        'BAIDU': {
            'label': 'Baidu',
            'type': 'checkbox',
            'default': true,
        },
        'BING': {
            'label': 'Bing',
            'type': 'checkbox',
            'default': true,
        }
    },
    'events': {
        'init': () => {
            for (const [key] of searchOptions) {
                config.set(key, GM_getValue(key, true));
            }
        },
        'save': () => {
            for (const [key] of searchOptions) {
                GM_setValue(key, config.get(key));
            }
            config.close();
        }
    }
});
