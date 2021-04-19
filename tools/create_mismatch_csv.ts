import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

// connect to bchd full node - must have slpindex turned on!
import { GrpcClient } from "grpc-bchrpc-node";
import { actionString } from "./enums";
const client = new GrpcClient({ url: process.env.BCHD_GRPC_URL });

// read from a mismatch file (an slp-comps output)
const mismatchFilename = "./MISMATCHES-Bitcoin_Verde.txt";
const lines = fs.readFileSync(mismatchFilename, "utf-8").split(/\r?\n/);

// create a new file for writing csv report
const reportFilename = `${mismatchFilename}-report.csv`
const report: Array<string>  = [];

// populate report in a floating promise
(async () => {
    report.push(["TXID", "EXPECTED_VALIDITY", "ACTION", "TOKEN_TYPE"].join());

    let count = 0;
    for (const line of lines) {
        const txidHex = line.split(" ")[0];
        const txn = await client.getTransaction({
            hash: txidHex,
            reversedHashOrder: true,
            includeTokenMetadata: true    
        });

        const ti = txn.getTransaction()!.getSlpTransactionInfo()!;
        const tm = txn.getTokenMetadata()!;

        const row: Array<string> = [];
        row.push(txidHex);
        
        row.push(ti.getValidityJudgement() === 1 ? "VALID" : "INVALID");
        row.push(actionString(ti.getSlpAction()));

        if (tm) {
            row.push(tm.getTokenType().toFixed());
        } else {
            row.push("na");
        }

        report.push(row.join());
        console.log(row);
        count++;
    }

    if (count !== lines.length) {
        throw Error("no all lines reported!");
    }

    fs.writeFileSync(reportFilename, report.join('\n'));

    console.log("done.");
})();
