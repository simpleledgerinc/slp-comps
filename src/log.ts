import fs from "fs";
import { SlpAction, SlpTransactionInfo } from "grpc-bchrpc-node";

class _Logger {
    public static Instance() {
        return this._instance || (this._instance = new _Logger());
    }
    private static _instance: _Logger;

    constructor() {}

    public AddMismatch(indexerName: string, txidHex: string, shouldBeValid: boolean, invalidReason: string) {
        const fileName = `MISMATCHES-${indexerName}.txt`;
        console.log(`[WARN] Judgement mismatch for ${txidHex} with indexer named "${indexerName}"`);
        fs.appendFileSync(
            fileName,
            `${txidHex} (should be ${shouldBeValid ? "valid" : "invalid"}${invalidReason ? ` cause: ${invalidReason}` : ""})\n`
        );
        console.log(`[WARN] Logged mismatch to ${fileName}`);
    }

    public AddBurnCase(flag: SlpTransactionInfo.BurnFlags, txidHex: string) {
        let flagStr: string;
        switch (flag) {
            case 0:
                flagStr = "BURNED_INPUTS_OUTPUTS_TOO_HIGH";
                break;
            case 1:
                flagStr = "BURNED_INPUTS_BAD_OPRETURN";
                break;
            case 2:
                flagStr = "BURNED_INPUTS_OTHER_TOKEN";
                break;
            case 3:
                flagStr = "BURNED_OUTPUTS_MISSING_BCH_VOUT";
                break;
            case 4:
                flagStr = "BURNED_INPUTS_GREATER_THAN_OUTPUTS";
                break;
            default:
                throw Error("unknown burn flag");
        }

        const fileName = `${flagStr}.txt`;
        fs.appendFileSync(
            fileName,
            `${txidHex}\n`
        );
    }

    public AddBurnedMintBatonCase(action: SlpAction, txid: string) {
        let fileName = "";
        if (action === SlpAction.SLP_V1_GENESIS) {
            fileName = "MINT_BURN_IN_GENESIS.txt";
        } else if (action === SlpAction.SLP_V1_MINT) {
            fileName = "MINT_BURN_IN_MINT.txt";
        }
        fs.appendFileSync(
            fileName,
            `${txid}\n`
        );
    }

}

export function getStringValuesFromEnum<T>(myEnum: T): keyof T {
    return Object.keys(myEnum).filter((k) => typeof (myEnum as any)[k] === "number") as any;
}

export const Logger = _Logger.Instance();
