export interface SlpIndexerClient {
    validity(txid: string): Promise<{ validity: boolean, invalidReason?: string }>;
    indexerName(): string;
}
