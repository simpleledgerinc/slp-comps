import fs from "fs";

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

}

export const Logger = _Logger.Instance();
