import fetch from "node-fetch";
import { SlpIndexerClient } from "../interface";

// https://<host>/api/v1/slp/validate/${txid}
// Response:
// {"isValid":true,"errorMessage":null,"wasSuccess":1,"transactionHash":"34DD2FE8F0C5BBA8FC4F280C3815C1E46C2F52404F00DA3067D7CE12962F2ED0"}

type VerdeResponse = { isValid: boolean, errorMessage: null|string, transactionHash: string, wasSuccess: number };

class _BitcoinVerdeIndexerClient implements SlpIndexerClient {
    public static Instance() {
        return this._instance || (this._instance = new _BitcoinVerdeIndexerClient());
    }
    private static _instance: _BitcoinVerdeIndexerClient;

    public async validity(txid: string): Promise<{ validity: boolean, invalidReason?: string }> {
        const res: VerdeResponse = await (await fetch(process.env.VERDE_URL + txid)).json();
        if (res.isValid === true) {
            return { validity: true };
        } else {
            console.log(`Bitcoin Verde judgement: ${res.errorMessage} (${txid})`);
            return { validity: false, invalidReason: res.errorMessage! };
        }
    }

    public indexerName() {
        return "Bitcoin_Verde";
    }
}

export const BitcoinVerdeIndexerClient = _BitcoinVerdeIndexerClient.Instance();
