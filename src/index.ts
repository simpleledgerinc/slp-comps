import * as dotenv from "dotenv";
dotenv.config();

import { GrpcClient } from "grpc-bchrpc-node";
import { PbCache } from "./cache";
import { SlpIndexerClient } from "./interface";

import { BchdClient } from "./indexers/bchd";
import { GsppTrustedValidationClient } from "./indexers/gs++tv";
import { SlpdbClient } from "./indexers/slpdb";
import { BitcoinComSlpIdexerClient } from "./indexers/bitcoincomslpindexer";

const client = new GrpcClient({ url: process.env.BCHD_GRPC_URL, rootCertPath: process.env.BCHD_GRPC_CERT });

const indexers: SlpIndexerClient[] = [
    BchdClient,
    SlpdbClient,
    GsppTrustedValidationClient,
    BitcoinComSlpIdexerClient
 ];

const main = async () => {
    const args = process.argv;

    // compare all slp transactions since genesis
    if (! args.find((a) => a === "--nosync")) {

        // check if current height should be reset based on set of indexers of interest
        for (const indexer of indexers) {
            if (! PbCache.indexerList.has(indexer.indexerName())) {
                PbCache.reset(indexers);
                break;
            }
        }

        let bestBlock = (await client.getBlockchainInfo()).getBestHeight();
        while (PbCache.lastBlock < bestBlock) {
            await compareBlock(PbCache.lastBlock);
            PbCache.lastBlock++;
            bestBlock = (await client.getBlockchainInfo()).getBestHeight();
            if (PbCache.lastBlock % 100 === 0) {
                PbCache.write();
                console.log(`---------------------------------------------------------------`);
                console.log(`Progress saved at ${PbCache.lastBlock}.`);
                console.log(`Total SLP transactions checked: ${PbCache.totalChecked}`);
                console.log(`Total SLP transactions valid: ${PbCache.totalValid}`);
                console.log(`---------------------------------------------------------------`);
            }
        }
    }

    // monitor blocks in real-time
    if (args.find((a) => a === "--monitor")) {
        // TODO... listen for new blocks
    }

    console.log("exiting.");
};

const compareBlock = async (blockIndex: number) => {
    console.log(`Processing block ${blockIndex}`);
    const res = await client.getBlock({ index: blockIndex, fullTransactions: true });
    const block = res.getBlock()!.getTransactionDataList();

    // loop through block
    for (const txn of block) {
        const txid = Buffer.from(txn.getTransaction()!.getHash_asU8().slice().reverse()).toString("hex");
        const slpMsgBuf = txn.getTransaction()!.getOutputsList()[0].getPubkeyScript_asU8();

        if (hasSlpLokadId(slpMsgBuf)) {
            console.log(`checking txid: ${txid}`);
            PbCache.totalChecked++;
            let validity: boolean|null = null;
            for (const idxr of indexers) {
                const _val = await idxr.validity(txid);
                if (validity !== null && _val !== validity) {
                    throw Error(`Judgement mismatch for ${txid} with indexer named "${idxr.indexerName()}"`);
                } else {
                    validity = _val;
                }
            }
            if (validity === true) {
                PbCache.totalValid++;
            }
        }
    }
};

const hasSlpLokadId = (scriptPubKey: Uint8Array): boolean => {
    const slpLokadIdHex = "534c5000";
    return Buffer.from(scriptPubKey).includes(Buffer.from(slpLokadIdHex, "hex"));
};

main();
