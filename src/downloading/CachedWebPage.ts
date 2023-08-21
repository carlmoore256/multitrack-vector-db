import { JSDOM } from "jsdom";
import { convertUrlToFileName } from "../utils/utils.js";
import { loadFileFromCache } from "./file-cache.js";
import { PrismaClient, CachedDocument } from "@prisma/client";
import client from "../database/prisma.js";
import axios from "axios";

export class CachedWebDocument {
    private _document: Document | null = null;

    constructor(public url: string, public label?: string) {}

    async load(
        onCreateNew?: (doc: CachedDocument) => void,
        checkFileCache: boolean = true // legacy option
    ) {
        if (this._document) return;

        let cachedDocument = await client.cachedDocument.findUnique({
            where: {
                url: this.url,
            },
        });

        if (!cachedDocument) {
            let htmlBuffer;

            const fetchDocument = async () => {
                const res = await axios.get(this.url);
                if (!res.data) {
                    throw new Error("Failed to fetch data");
                }

                const buffer = Buffer.from(res.data);
                return buffer;
            };

            if (checkFileCache) {
                try {
                    htmlBuffer = loadFileFromCache(this.url, "html");
                } catch (e) {
                    htmlBuffer = await fetchDocument();
                }
            } else {
                htmlBuffer = await fetchDocument();
            }

            if (!htmlBuffer) {
                throw new Error("Failed to fetch data");
            }

            cachedDocument = await client.cachedDocument.create({
                data: {
                    url: this.url,
                    html: htmlBuffer,
                    label: this.label,
                },
            });
            if (onCreateNew) {
                onCreateNew(cachedDocument);
            }
        }

        const { window } = new JSDOM(cachedDocument.html);
        this._document = window.document;
    }

    get document(): Document {
        if (!this._document) {
            throw new Error("Page not loaded, call init()");
        }
        return this._document;
    }
}
