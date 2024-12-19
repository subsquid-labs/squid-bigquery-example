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

Visit [the documentation page](https://docs.sqd.dev/sdk/resources/persisting-data/bigquery/) for more details on using squids with BigQuery.

## Troubleshooting

### Transaction is aborted due to concurrent update

This means that your project has an open [session](https://cloud.google.com/bigquery/docs/sessions-intro) that is updating some of the tables used by the squid.

Most commonly, the session is left by a squid itself after an unclean termination. You have two options:

1. If you are not sure if your squid is the only app that uses sessions to access your BigQuery project, find the faulty session manually and terminate it. See [Get a list of your active sessions](https://cloud.google.com/bigquery/docs/sessions-get-ids#list_active) and [Terminate a session by ID](https://cloud.google.com/bigquery/docs/sessions-terminating#terminate_a_session_by_id).

2. **DANGEROUS** If you are absolutely certain that the squid is the only app that uses sessions to access your BigQuery project, you can terminate all the dangling sessions by running

   ```sql
   FOR session in (
     SELECT
       session_id,
       MAX(creation_time) AS last_modified_time,
     FROM `region-us`.INFORMATION_SCHEMA.SESSIONS_BY_PROJECT
     WHERE
       session_id IS NOT NULL
       AND is_active
     GROUP BY session_id
     ORDER BY last_modified_time DESC
   )
   DO
     CALL BQ.ABORT_SESSION(session.session_id);
   END FOR;
   ```
   Replace `region-us` with your dataset's region in the code above.

   You can also enable `abortAllProjectSessionsOnStartup` and supply `datasetRegion` in your database config to perform this operation at startup:
   ```ts
   const db = new Database({
     // ...
     abortAllProjectSessionsOnStartup: true,
     datasetRegion: 'region-us'.
   })
   ```

   This method **will** cause data loss if, at the moment when the squid starts, some other app happens to be writing data anywhere in the project using the sessions mechanism.
