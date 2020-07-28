import { GraphSearchClient, TrustedValidationReply } from "grpc-graphsearch-node";
import { SlpIndexerClient } from "../interface";

class _GsppTrustedValidationClient implements SlpIndexerClient {
    public static Instance() {
        return this._instance || (this._instance = new _GsppTrustedValidationClient());
    }
    private static _instance: _GsppTrustedValidationClient;

    private client: GraphSearchClient;

    constructor() {
        if (process.env.GS_GRPC_CERT) {
            this.client = new GraphSearchClient({
                url: process.env.GS_GRPC_URL, rootCertPath: process.env.GS_GRPC_CERT
            });
        } else {
            this.client = new GraphSearchClient({
                url: process.env.GS_GRPC_URL
            });
        }
    }

    public async validity(txid: string): Promise<boolean> {
        let res: TrustedValidationReply;
        res = await this.client.trustedValidationFor({ hash: txid, reversedHashOrder: true });
        return res.getValid();
    }

    public indexerName() {
        return "gs++_trustedvalidation";
    }
}

export const GsppTrustedValidationClient = _GsppTrustedValidationClient.Instance();
