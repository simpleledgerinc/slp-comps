export interface SlpIndexerClient {
    validity(txid: string): Promise<boolean>;
    indexerName(): string;
}
