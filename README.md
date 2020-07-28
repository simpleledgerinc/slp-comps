## slp-comps

This project compares SLP validity between different indexer implementations.  If a discrepancy is found the application will throw and error with the `txid` and name of the indexer where the discrepancy was encountered.

Currently this project provides consistency checks between the following SLP indexers:
* [SLPDB](https://github.com/simpleledger/slpdb)
* [gs++ Trusted Validation](https://github.com/blockparty-sh/cpp_slp_graph_search)
* [BCHD slp-index branch](https://github.com/simpleledgerinc/bchd/tree/slp-index)

Adding additional indexers to the consistency checking is as simple as implementing the `SlpIndexerClient` interface similar to the existing indexers and adding any necessary `.env` variables.  In the future the following SLP indexers can also be added to this project if necessary:
* [Bitcoin Verde](https://github.com/softwareverde/bitcoin-verde)
* [slp-indexer](https://github.com/Bitcoin-com/slp-indexer)
* [Electron Cash SLP](https://github.com/simpleledger/electron-cash-slp) (technically EC is not an indexer, adding to this project may significantly degrade performance)



## Get Started

Running this application requires building and running the BCHD locally ["slp-index" branch](https://github.com/simpleledgerinc/bchd/tree/slp-index) which is used to crawl raw blocks to check the validity of all possible SLP transactions.  The following settings are needed in your `bchd.conf`:

```
[Application Options]

txindex=1
slpindex=1
rpccert=/<some path>/localhost.crt
rpckey=/<some path>/localhost.key
grpclisten=0.0.0.0
```

Next, rename the file named `example.env` to `.env`, and update the values using the following guidance:

**BCHD `.env` variables**

* `BCHD_GRPC_URL`   - ex. `localhost:8335`
* `BCHD_GRPC_CERT`  - ex. `/<some dir>/localhost.crt`

**SLPDB `.env` variables**

* `SLPDB_URL`       - ex. `https://nyc1.slpdb.io/q/`

**gs++ `.env` variables**

* `GS_GRPC_URL`     - leave blank to default to `gs.fountainhead.cash:50051`
* `GS_GRPC_CERT`    - optional

**slp-comp `.env` variables**

* `START_BLOCK`     - where to start indexing



After `.env` is updated, start the checking from SLP Genesis using:


```
$ npm i
$ npm start
```



## Planned Features

1. <u>**Monitor mode**</u>: After consistency checks have been synchronized between all nodes we can monitory for consistency in real-time.
2. **<u>Deep consistency</u>**: We can further interrogate indexer consistency beyond just  `validity == true`.  This would include checking current baton location and output amount values.
3. <u>**Store Valid Results**</u>: Consistent results can be stored to disk by txid to allow service to leverage the consistency checks (e.g., used by an API server for fetch SLP validity).

