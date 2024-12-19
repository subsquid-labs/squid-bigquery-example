import fs from 'fs'
import {assertNotNull} from '@subsquid/util-internal'
import * as erc20abi from './abi/erc20'
import {BigQuery} from '@google-cloud/bigquery'
import {
	Column,
	Table,
	Types,
	Database
} from '@subsquid/bigquery-store'
import {createLogger} from '@subsquid/logger'

import {processor, USDC_CONTRACT} from './processor'

// Uncomment the section below and define a GAC_JSON_FILE secret when deploying to Subsquid Cloud
// See https://docs.subsquid.io/sdk/resources/persisting-data/bigquery/#deploying-to-subsquid-cloud
/*
assertNotNull(process.env.GAC_JSON_FILE, 'Please define GAC_JSON_FILE. See https://cloud.google.com/docs/authentication/application-default-credentials#GAC')
let logger = createLogger('creds')
logger.info('Attempting to write the credentials JSON')
fs.writeFileSync('google_application_credentials.json', process.env.GAC_JSON_FILE!)
logger.info('Wrote the creds')
*/

const projectId = assertNotNull(process.env.GOOGLE_PROJECT_ID, 'Please define the GOOGLE_PROJECT_ID env variable')
const datasetId = assertNotNull(process.env.GOOGLE_DATASET_ID, 'Please define the GOOGLE_DATASET_ID env variable')

const db = new Database({
	bq: new BigQuery(), // set GOOGLE_APPLICATION_CREDENTIALS at .env
	dataset: `${projectId}.${datasetId}`,
	tables: {
		TransfersTable: new Table(
			'transfers',
			{
				from: Column(Types.String()),
				to: Column(Types.String()),
				value: Column(Types.BigNumeric(38))
			}
		)
	},
	// Consider enabling abortAllProjectSessionsOnStartup and setting datasetRegion if you run into
	// "Transaction is aborted due to concurrent update" errors.
	// DANGEROUS: using abortAllProjectSessionsOnStartup can lead to data loss in certain setups.
	// See /sdk/resources/persisting-data/bigquery/#transaction-is-aborted-due-to-concurrent-update
})

processor.run(db, async (ctx) => {
	for (let block of ctx.blocks) {
		for (let log of block.logs) {
			if (log.address===USDC_CONTRACT && log.topics[0]===erc20abi.events.Transfer.topic) {
				let { from, to, value } = erc20abi.events.Transfer.decode(log)
				ctx.store.TransfersTable.insert({ from, to, value })
			}
		}
	}
})
