import fs from "fs";

class _Logger {
    public static Instance() {
        return this._instance || (this._instance = new _Logger());
    }
    private static _instance: _Logger;

    constructor() {}

    addInvalid(indexerName: string, txidHex: string) {
        fs.appendFileSync(`MISMATCHES-${indexerName}.txt`, `${txidHex}\n`);
    }

}

export const Logger = _Logger.Instance();
