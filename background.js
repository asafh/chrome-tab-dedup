"use strict";
class BidiListMap {
    constructor() {
        this.valueToKeys = new Map();
        this.map = new Map();
    }
    set(key, value) {
        // if(this.map.get(key) === value) {
        //     return this.getKeys(value);
        // }
        this.delete(key); //remove reverse mapping for the values at the key, if exists

        let keyList = this.valueToKeys.get(value);
        if(!keyList) {
            keyList = [];
            this.valueToKeys.set(value, keyList);
        }
        keyList.push(key);
        this.map.set(key, value);

        return keyList.length ? keyList.slice() : [];
    }
    get(key) {
        return this.map.get(key);
    }
    getKeys(value) {
        let keyList = this.valueToKeys.get(value);
        return keyList ? keyList.slice() : [];
    }
    delete(key) {
        if(!this.map.has(key)) {
            return [];
        }
        const value = this.map.get(key);

        const list = this.valueToKeys.get(value);
        const index = list.indexOf(key);
        list.splice(index, 1);
        this.map.delete(key);
        if(list.length === 0) {
            this.valueToKeys.delete(value);
        }

        return list.length ? list.slice() : [];
    }
}


function showPageAction(id) {
    console.log("Showing page action for tab "+id);
    chrome.pageAction.show(id);
}
function hidePageAction(id) {
    console.log("Hiding page action for tab "+id);
    chrome.pageAction.hide(id);
}

class Model {
    constructor() {
        this.mapper = new BidiListMap();
        chrome.tabs.onCreated.addListener((tab) => {
            if (tab.id !== undefined) {
                this.setURL(tab.id, tab.url);
            }
        });
        chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
            if (changeInfo.url) {
                this.setURL(tab.id, changeInfo.url);
            }
        });
        chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
            this.setURL(tabId, undefined)
        });
        chrome.pageAction.onClicked.addListener(tab => {
            const list = this.mapper.getKeys(tab.url);
            const index = list.indexOf(tab.id);
            const nextFocusIndex = (index + 1) % list.length;
            const nextFocusId = list[nextFocusIndex];
            chrome.tabs.update(nextFocusId, {active: true});
            chrome.tabs.get(nextFocusId, (tab) => {
                const windowId = tab.windowId;
                chrome.windows.update(windowId, {focused: true});
            })
        });
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if(tab.url) {
                    this.setURL(tab.id, tab.url);
                }
            })
        })
    }

    setURL(tabId, url) {
        const tabsInPreviousUrl = this.mapper.delete(tabId);
        if(tabsInPreviousUrl.length === 1) {
            hidePageAction(tabsInPreviousUrl[0]); //left alone
        }
        if(url === undefined) { //tab deleted.
            return;
        }
        hidePageAction(tabId); //this tab isn't deleted

        const nowWithUrl = this.mapper.set(tabId, url);
        if(nowWithUrl.length > 1) {
            showPageAction(tabId);
            if(nowWithUrl.length === 2) {
                showPageAction(nowWithUrl.find(id => id !== tabId)); //other id.
            }
        }
    }
}


const work = new Model();