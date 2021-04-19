import { SlpAction } from "grpc-bchrpc-node";

export const actionString = (action: SlpAction) => {
    switch (action) {
        case SlpAction.NON_SLP:
            return "NON_SLP";
        case SlpAction.NON_SLP_BURN:
            return "NON_SLP_BURN";
        case SlpAction.SLP_PARSE_ERROR:
            return "SLP_PARSE_ERROR";
        case SlpAction.SLP_UNSUPPORTED_VERSION:
            return "SLP_UNSUPPORTED_VERSION";
        case SlpAction.SLP_V1_GENESIS:
            return "SLP_V1_GENESIS";
        case SlpAction.SLP_V1_MINT:
            return "SLP_V1_MINT";
        case SlpAction.SLP_V1_SEND:
            return "SLP_V1_SEND";
        case SlpAction.SLP_V1_NFT1_GROUP_GENESIS:
            return "SLP_V1_NFT1_GROUP_GENESIS";
        case SlpAction.SLP_V1_NFT1_GROUP_MINT:
            return "SLP_V1_NFT1_GROUP_MINT";
        case SlpAction.SLP_V1_NFT1_GROUP_SEND:
            return "SLP_V1_NFT1_GROUP_SEND";
        case SlpAction.SLP_V1_NFT1_UNIQUE_CHILD_GENESIS:
            return "SLP_V1_NFT1_UNIQUE_CHILD_GENESIS";
        case SlpAction.SLP_V1_NFT1_UNIQUE_CHILD_SEND:
            return "SLP_V1_NFT1_UNIQUE_CHILD_SEND";
    }
};