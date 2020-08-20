import * as dotenv from "dotenv";
dotenv.config();

import fs from "fs";

const protons = require("protons");
const pb = protons(`
    syntax = "proto3";
    message PersistedCache {
        uint32 bchdBlock = 1;
        message Indexer {
            uint32 lastBlock = 1;
            string name = 2;
        }
        repeated Indexer indexerList = 2;
        uint32 totalChecked = 3;
        uint32 totalValid = 4;
    }
`);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface IPbCache {
    bchdBlock: number;
    indexerList: { name: string, lastBlock: number }[];
    totalChecked: number;
    totalValid: number;
}

class _PbCache {
    public static Instance() {
        return this._instance || (this._instance = new _PbCache());
    }

    private static _instance: _PbCache;

    public bchdBlock: number = parseInt(process.env.START_BLOCK!, 10) - 1;
    public indexerList = new Map<string, number>();
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
        const _bchdBlock = _pb.getBchdBlock() as number;
        if (_bchdBlock) {
            this.bchdBlock = _bchdBlock;
        }

        const _indexerList = _pb.getIndexerList() as { name: string, lastBlock: number }[];
        if (_indexerList) {
            for (const idxr of _indexerList) {
                this.indexerList.set(idxr.name, idxr.lastBlock);
                if (idxr.lastBlock < 543375) {
                    throw Error(`Start block cannot be less than 543375`);
                }
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
    }

    public async write() {
        const pbuf = pb.PersistedCache.encode({
            bchdBlock: this.bchdBlock,
            indexerList: Array.from(this.indexerList).map((indexer, i) => {
                return { name: indexer[0], lastBlock: indexer[1] };
            }) as { name: string, lastBlock: number }[],
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
}

export const PbCache = _PbCache.Instance();
