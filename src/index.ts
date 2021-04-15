import * as dotenv from "dotenv";
dotenv.config();

import { GrpcClient, SlpAction, SlpTransactionInfo } from "grpc-bchrpc-node";
import { PbCache } from "./cache";
import { SlpIndexerClient } from "./interface";

import { BchdClient } from "./indexers/bchd";
import { BitcoinComSlpIdexerClient } from "./indexers/bitcoincom";
import { BitcoinVerdeIndexerClient } from "./indexers/verde";
import { GsppTrustedValidationClient } from "./indexers/gs++tv";
import { SlpdbClient } from "./indexers/slpdb";
import { Logger } from "./log";

if (!process.env.BCHD_GRPC_URL) {
    throw Error("missing environment variable 'BCHD_GRPC_URL' for connecting to BCHD, see README for setup instructions.");
}

let indexers: SlpIndexerClient[] = [ BchdClient ];

// check for SLPDB
if (! process.env.SLPDB_URL) {
    console.log("[WARN] missing SLPDB URL, SLPDB indexer will not be checked.");
} else {
    indexers = indexers.concat(SlpdbClient);
}

// check for Graph Search
if (! process.env.GS_GRPC_URL) {
    console.log("[WARN] missing Graph Search URL, GS++ indexer will not be checked.");
} else {
    indexers = indexers.concat(GsppTrustedValidationClient);
}

// check for bitcoin.com
if (! process.env.BITCOINCOM_URL) {
    console.log("[WARN] missing bitcoin.com indexer, bitcoin.com indexer will not be checked.");
} else {
    indexers = indexers.concat(BitcoinComSlpIdexerClient);
}

// check Bitcoin Verde
if (! process.env.VERDE_URL) {
    console.log("[WARN] missing Bitcoin Verde indexer, this indexer will be skipped")
} else {
    indexers = indexers.concat(BitcoinVerdeIndexerClient);
}

if (indexers.length < 2) {
    throw Error("Cannot run slp-comps without at least two indexers setup.");
}

const client = new GrpcClient({
    url: process.env.BCHD_GRPC_URL,
    rootCertPath: process.env.BCHD_GRPC_CERT
});

const args = process.argv;

// by default the program quits when a indexer mismatch is found,
// use "--log-errors" to optionally log the errors and continue past the mismatch
let throwOnError = true;
if (args.find((a) => a === "--log-errors")) {
    throwOnError = false;
}

const main = async () => {

    // compare all slp transactions since genesis
    if (! args.find((a) => a === "--nosync")) {

        // figure out the first block to start indexing on
        let lowestHeight = PbCache.bchdBlock;
        for (const indexer of indexers) {
            if (! PbCache.indexerList.has(indexer.indexerName())) {
                lowestHeight = parseInt(process.env.START_BLOCK as string, 10);
            } else if (PbCache.indexerList.get(indexer.indexerName())! < lowestHeight) {
                lowestHeight = PbCache.indexerList.get(indexer.indexerName())!;
            }
        }

        let bestBlock = (await client.getBlockchainInfo()).getBestHeight();
        while (lowestHeight < bestBlock) {
            await compareIndexersForBlock(lowestHeight + 1);
            if (lowestHeight % 100 === 0) {
                PbCache.write();
                console.log(`---------------------------------------------------------------`);
                console.log(`Progress at ${lowestHeight}.`);
                console.log(`Total SLP transactions checked: ${PbCache.totalChecked}`);
                console.log(`Total SLP transactions valid: ${PbCache.totalValid}`);
                indexers.forEach((idxr, _) => {
                    console.log(`Indexer "${idxr.indexerName()}" last checked txid at block: ${PbCache.indexerList.get(idxr.indexerName())}`);
                });
                console.log(`---------------------------------------------------------------`);
            }

            // increase counters after processing block
            lowestHeight++;
            if (lowestHeight > PbCache.bchdBlock) {
                PbCache.bchdBlock++;
            }
            bestBlock = (await client.getBlockchainInfo()).getBestHeight();
        }
    }

    // monitor blocks in real-time
    if (args.find((a) => a === "--monitor")) {
        // TODO... listen for new blocks
    }

    console.log("slp-comps has caught up to tip, exiting.");
};

const compareIndexersForBlock = async (blockIndex: number) => {
    console.log(`Processing block ${blockIndex}`);
    const res = await client.getBlock({ index: blockIndex, fullTransactions: true });
    const block = res.getBlock()!.getTransactionDataList();
    const indexersUsed = new Set<string>();
    let hadAnySlp = false;

    // loop through block
    for (const txn of block) {
        const txid = Buffer.from(txn.getTransaction()!.getHash_asU8().slice().reverse()).toString("hex");
        const slpMsgBuf = txn.getTransaction()!.getOutputsList()[0].getPubkeyScript_asU8();
        if (hasSlpId(slpMsgBuf)) {
            hadAnySlp = true;
            console.log(`checking txid: ${txid}`);
            PbCache.totalChecked++;
            let validity: boolean|null = null;

            // logging for burn flag instances
            const slpInfo = txn.getTransaction()!.getSlpTransactionInfo();
            const slpAction = slpInfo!.getSlpAction()!;
            const isValidSlp = slpInfo!.getValidityJudgement() === SlpTransactionInfo.ValidityJudgement.VALID
            if (slpInfo!.getBurnFlagsList().length > 0) {
                const flags = slpInfo!.getBurnFlagsList();
                for (const flag of flags) {

                    // we'll ignore NFT group token burns for NFT children
                    if (flag === SlpTransactionInfo.BurnFlags.BURNED_INPUTS_OTHER_TOKEN &&
                        slpAction === SlpAction.SLP_V1_NFT1_UNIQUE_CHILD_GENESIS &&
                        isValidSlp &&
                        txn.getTransaction()!.getInputsList().filter(i => i.getSlpToken() ? true : false).length === 1) {
                            continue;
                    }

                    Logger.AddBurnCase(flag, txid);
                    if (flag === SlpTransactionInfo.BurnFlags.BURNED_OUTPUTS_MISSING_BCH_VOUT) {
                        const maxOutputIndex = txn.getTransaction()!.getOutputsList().length-1
                        switch (slpInfo!.getSlpAction()) {
                        case SlpAction.SLP_V1_GENESIS:
                            if (slpInfo?.getV1Genesis()!.getMintBatonVout()! > maxOutputIndex)  {
                                Logger.AddBurnedMintBatonCase(slpInfo!.getSlpAction(), txid);
                            }
                            break;
                        case SlpAction.SLP_V1_MINT:
                            if (slpInfo?.getV1Mint()!.getMintBatonVout()! > txn.getTransaction()!.getOutputsList().length-1)  {
                                Logger.AddBurnedMintBatonCase(slpInfo!.getSlpAction(), txid);
                            }
                            break;
                        }
                    }
                }
            }

            for (const idxr of indexers) {
                const currHeight = PbCache.indexerList.get(idxr.indexerName())!;
                if (!currHeight || currHeight < blockIndex || idxr.indexerName().includes("bchd")) {
                    const _val = await idxr.validity(txid);

                    let invalidReason = "";
                    if (idxr.indexerName().includes("bchd") && _val.validity === false) {
                        invalidReason = _val.invalidReason!;
                    }

                    if (validity !== null && _val.validity !== validity) {
                        if (throwOnError) {
                            throw Error(`Judgement mismatch for ${txid} with indexer named "${idxr.indexerName()}"`);
                        } else {
                            Logger.AddMismatch(idxr.indexerName(), txid, validity, invalidReason);
                        }

                    } else {
                        validity = _val.validity;
                    }
                    indexersUsed.add(idxr.indexerName());
                }
            }
            if (validity === true) {
                PbCache.totalValid++;
            }
        }
    }
    // update used indexer heights, and log if indexer was skipped in this block
    indexers.forEach((idxr, i) => {
        if (indexersUsed.has(idxr.indexerName())) {
            if (PbCache.indexerList.has(idxr.indexerName())) {
                if (PbCache.indexerList.get(idxr.indexerName())! < blockIndex) {
                    PbCache.indexerList.set(idxr.indexerName(), blockIndex);
                }
            } else {
                PbCache.indexerList.set(idxr.indexerName(), blockIndex);
            }
        } else if (hadAnySlp) {
            console.log(`[INFO] skipping "${idxr.indexerName()}" which has processed up to block ${PbCache.indexerList.get(idxr.indexerName())!}`);
        }
    });
};

const hasSlpId = (scriptPubKey: Uint8Array): boolean => {
    const slpLokadIdHex = "534c5000";
    return Buffer.from(scriptPubKey).includes(Buffer.from(slpLokadIdHex, "hex"));
};

main();
