import { GetTrustedValidationResponse, GrpcClient } from "grpc-bchrpc-node";
import { SlpIndexerClient } from "../interface";

class _BchdClient implements SlpIndexerClient {
    public static Instance() {
        return this._instance || (this._instance = new _BchdClient());
    }
    private static _instance: _BchdClient;

    private client = new GrpcClient({ url: process.env.BCHD_GRPC_URL, rootCertPath: process.env.BCHD_GRPC_CERT });

    public async validity(txid: string): Promise<boolean> {
        let res: GetTrustedValidationResponse;
        try {
            res = await this.client.getTrustedValidation({ txos: [{ hash: txid, vout: 1 }], reversedHashOrder: true });
        } catch (err) {
            if (err.message.includes("slp output index cannot be 0 or > 19")) {
                return true;
            }
            console.log(`BCHD judgement: ${err.message}`);
            return false;
        }
        // console.log(`Token amount: ${res.getResultsList()[0].getV1TokenAmount()}`);
        // console.log(`Mint baton: ${res.getResultsList()[0].getV1MintBaton()}`);
        // console.log(`SLP Msg: ${Buffer.from(res.getResultsList()[0].getSlpTxnOpreturn()).toString("hex")}`)
        return true;
    }

    public indexerName() {
        return "bchd_beta";
    }
}

export const BchdClient = _BchdClient.Instance();
