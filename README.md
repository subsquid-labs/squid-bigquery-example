# A squid that saves USDC Transfers to TSV files

This tiny blockchain indexer scrapes `Transfer` events emitted by the [USDC contract](https://etherscan.io/address/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48) and saves the data in a file-based dataset in a local folder `./data`. It is built with the [Subsquid framework](https://subsquid.io), hence the term "squid".

The squid uses [`@subsquid/file-store`](https://docs.subsquid.io/basics/store/file-store/) and [`@subsquid/file-store-csv`](https://docs.subsquid.io/basics/store/file-store/csv-table/) packages to store the dataset. A less common _tab separated values_ (TSV) format was chosen to highlight the flexibility of the CSV writing subsystem.

Dependencies: NodeJS, [Squid CLI](https://docs.subsquid.io/squid-cli).

To see it in action, spin up a *processor*, a process that ingests the data from the Ethereum Archive:

```bash
$ git clone https://github.com/subsquid-labs/file-store-csv-example
$ cd file-store-csv-example/
$ npm i
$ sqd process
```
You should see a `./data` folder populated with indexer data appear in a bit:
```bash
$ tree ./data/
./data/
├── 0000000000-0007242369
│   └── transfers.tsv
├── 0007242370-0007638609
│   └── transfers.tsv
...
└── status.txt
```
