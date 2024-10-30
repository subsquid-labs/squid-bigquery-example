# A squid that saves USDC Transfers to a BigQuery dataset

This tiny blockchain indexer scrapes `Transfer` events emitted by the [USDC contract](https://etherscan.io/address/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48) and saves the data to a dataset on [Google BigQuery](https://cloud.google.com/bigquery).

**Dependencies:** NodeJS, Git, [Squid CLI](https://docs.subsquid.io/squid-cli).

To try it out, first download it and install local dependencies:
```bash
git clone https://github.com/subsquid-labs/squid-bigquery-example
cd squid-bigquery-example
npm i
```
then populate the `.env` file and execute
```bash
sqd process
```
Make sure to use an ID of an existing dataset for `GOOGLE_DATASET_ID`!

If you visit [the console](https://console.cloud.google.com/bigquery) now you should see that the two new tables `status` and `transfers` have been created and are being populated within your dataset.

Visit [the documentation page](https://docs.subsquid.io/store/bigquery-store/) for more details on using squids with BigQuery.
