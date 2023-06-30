import {JSDOM} from "jsdom";
import { checkLoadCache, convertUrlToFileName } from "../utils/utils.js";

export class CachedWebPage {

    private _page : Document | null = null;
    private _cacheId : string;

    constructor(public id : string, public pageURL : string) {
        this._cacheId = convertUrlToFileName(pageURL);
    }

    async load() {
        if (this._page) return;
        const html = await checkLoadCache<string>(this.pageURL, this._cacheId);
        const page = new JSDOM(html);
        this._page = page.window.document;
    }

    get page() : Document {
        if (!this._page) {
            throw new Error("Page not loaded, call init()");
        }
        return this._page;
    }
}