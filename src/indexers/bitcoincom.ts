import fetch from "node-fetch";
import { SlpIndexerClient } from "../interface";

class _BitcoinComSlpIndexerClient implements SlpIndexerClient {
    public static Instance() {
        return this._instance || (this._instance = new _BitcoinComSlpIndexerClient());
    }
    private static _instance: _BitcoinComSlpIndexerClient;

    public async validity(txid: string): Promise<{ validity: boolean, invalidReason?: string }> {
        const res = await (await fetch(process.env.BITCOINCOM_URL + txid)).json();
        if (! res.valid) {
            throw Error(`Bitcoin.com API response failed for ${res.txid} .`);
        }

        if (res.valid === "VALID") {
            return { validity: true };
        } else {
            console.log(`Bitcoin.com judgement: ${res.reason} (${res.txid})`);
            return { validity: false, invalidReason: res.reason };
        }
    }

    public indexerName() {
        return "bitcoin.com";
    }
}

export const BitcoinComSlpIdexerClient = _BitcoinComSlpIndexerClient.Instance();
