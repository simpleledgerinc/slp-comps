import * as dotenv from "dotenv";
dotenv.config();

import fs from "fs";
import { SlpIndexerClient } from "./interface";

const protons = require("protons");
const pb = protons(`
    syntax = "proto3";
    message PersistedCache {
        uint32 lastBlock = 1;
        repeated string indexerList = 2;
        uint32 totalChecked = 3;
        uint32 totalValid = 4;
    }
`);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface IPbCache {
    lastBlock: number;
    indexerList: string[];
}

class _PbCache {
    public static Instance() {
        return this._instance || (this._instance = new _PbCache());
    }

    private static _instance: _PbCache;

    public lastBlock: number = parseInt(process.env.START_BLOCK!, 10) - 1;
    public indexerList = new Set<string>();
    public totalChecked = 0;
    public totalValid = 0;

    constructor() {
        let file: Buffer;
        try {
            fs.writeFileSync(".cache_lock", Buffer.from([0]));
            file = fs.readFileSync(".cache");
        } catch (_) {
            return;
        } finally {
            try {
                fs.unlinkSync(".cache_lock");
            } catch (_) { }
        }

        const _pb = pb.PersistedCache.decode(file);
        const _lastBlock = _pb.getLastBlock() as number;
        if (_lastBlock) {
            this.lastBlock = _lastBlock;
        }

        const _indexerList = _pb.getIndexerList() as string[];
        if (_indexerList) {
            for (const name of _indexerList) {
                this.indexerList.add(name);
            }
        }

        const _totalChecked = _pb.getTotalChecked() as number;
        if (_totalChecked) {
            this.totalChecked = _totalChecked;
        }

        const _totalValid = _pb.getTotalValid() as number;
        if (_totalValid) {
            this.totalValid = _totalValid;
        }

        if (this.lastBlock < 543375) {
            throw Error(`Start block cannot be less than 543375`);
        }
    }

    public async write() {
        const pbuf = pb.PersistedCache.encode({
            lastBlock: this.lastBlock,
            indexerList: Array.from(this.indexerList),
            totalChecked: this.totalChecked,
            totalValid: this.totalValid
        } as IPbCache);
        if (fs.existsSync(".cache_lock")) {
            while (fs.existsSync(".cache_lock")) {
                await sleep(100);
            }
        }
        try {
            fs.writeFileSync(".cache_lock", Buffer.from([0]));
            try {
                fs.unlinkSync(".cache");
            } catch (_) { }
            fs.writeFileSync(".cache", pbuf);
        } catch (error) {
            throw error;
        } finally {
            try {
                fs.unlinkSync(".cache_lock");
            } catch (_) { }
        }
    }

    public reset(indexers: SlpIndexerClient[]) {
        this.lastBlock = parseInt(process.env.START_BLOCK as string, 10);
        this.indexerList.clear();
        this.totalChecked = 0;
        this.totalValid = 0;
        for (const idx of indexers) {
            if (this.indexerList.has(idx.indexerName())) {
                throw Error(`Cannot have two indexers with the same name ${idx.indexerName()}.`);
            }
            this.indexerList.add(idx.indexerName());
        }
        this.write();
    }
}

export const PbCache = _PbCache.Instance();
