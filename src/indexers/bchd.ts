import { GetSlpTrustedValidationResponse, GrpcClient } from "grpc-bchrpc-node";
import { SlpIndexerClient } from "../interface";

class _BchdClient implements SlpIndexerClient {
    public static Instance() {
        return this._instance || (this._instance = new _BchdClient());
    }
    private static _instance: _BchdClient;

    private client = new GrpcClient({
        url: process.env.BCHD_GRPC_URL,
        rootCertPath: process.env.BCHD_GRPC_CERT
    });

    public async validity(txid: string): Promise<{ validity: boolean, invalidReason?: string }> {
        let res: GetSlpTrustedValidationResponse;
        try {
            res = await this.client.getTrustedSlpValidation({
                txos: [{ hash: txid, vout: 1 }],
                reversedHashOrder: true,
            });
        } catch (err) {
            if (err.message.includes("slp output index cannot be 0 or > 19")) {
                return { validity: true };
            }
            console.log(`BCHD judgement: ${err.message}`);
            return { validity: false, invalidReason: err.message };
        }
        return { validity: true };
    }

    public indexerName() {
        return "bchd_beta";
    }
}

export const BchdClient = _BchdClient.Instance();
