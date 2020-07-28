import fetch from "node-fetch";
import { SlpIndexerClient } from "../interface";

class _SlpdbClient implements SlpIndexerClient {
    public static Instance() {
        return this._instance || (this._instance = new _SlpdbClient());
    }
    private static _instance: _SlpdbClient;

    public async validity(txid: string): Promise<boolean> {

        const query = {
            v: 3,
            q: {
                db: [
                    "c",
                    "u",
                ],
                aggregate: [
                    {
                        $match: {
                        "tx.h": txid,
                        },
                    },
                    {
                        $project: {
                        "slp.valid": 1, "slp.invalidReason": 1,
                        },
                    },
                ],
                limit: 1,
            },
        };
        const b64 = Buffer.from(JSON.stringify(query)).toString("base64");
        const res: { c: any[]; u: any[]; } = await (await fetch(process.env.SLPDB_URL + b64)).json();
        let obj: any;
        if (res.c.length === 0 && res.u.length === 0) {
            console.log(`SLPDB record is missing (${txid})`);
            return false;
        } else if (res.c.length > 0) {
            obj = res.c[0];
        } else if (res.u.length > 0) {
            obj = res.u[0];
        }

        if (obj.slp.valid === true) {
            return true;
        } else {
            console.log(`SLPDB judgement: ${obj.slp.invalidReason} (${txid})`);
            return false;
        }
    }

    public indexerName() {
        return "SLPDBv1";
    }
}

export const SlpdbClient = _SlpdbClient.Instance();
