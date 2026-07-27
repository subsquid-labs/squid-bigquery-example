import fs from 'fs'
import {assertNotNull} from '@subsquid/util-internal'
import * as erc20abi from './abi/erc20'
import {run} from '@subsquid/batch-processor'
import {augmentBlock} from '@subsquid/evm-objects'
import {DataSourceBuilder} from '@subsquid/evm-stream'
import {BigQuery} from '@google-cloud/bigquery'
import {
	Column,
	Table,
	Types,
	Database
} from '@subsquid/bigquery-store'
import {createLogger} from '@subsquid/logger'

const USDC_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48'.toLowerCase()

// A DataSourceBuilder defines where to get the data and what data to fetch.
const dataSource = new DataSourceBuilder()
	// The SQD Network Portal is the primary source of blockchain data: it is public,
	// needs no API key, and streams pre-filtered data — including real-time unfinalized
	// blocks — far faster than a plain RPC endpoint.
	// Browse the available datasets at https://docs.sqd.ai/subsquid-network/reference/networks/
	.setPortal('https://portal.sqd.dev/datasets/ethereum-mainnet')
	// To use a private or rate-limit-lifted Portal, supply an API key
	// through the HTTP client headers (create a key at https://portal.sqd.dev/app):
	// .setPortal({
	//     url: 'https://portal.sqd.dev/datasets/ethereum-mainnet',
	//     http: {
	//         headers: {'x-api-key': process.env.SQD_API_KEY},
	//     },
	// })
	.setBlockRange({
		from: 6082465
	})
	// Field selection is explicit: there are no default fields, so list every field the
	// handler reads. See
	// https://docs.sqd.dev/en/sdk/squid-sdk/evm/reference/evm-stream/field-selection
	.setFields({
		log: {
			address: true,
			topics: true,
			data: true
		}
	})
	.addLog({
		where: {
			address: [USDC_CONTRACT],
			topic0: [erc20abi.events.Transfer.topic]
		}
	})
	.build()

// Uncomment the section below and define a GAC_JSON_FILE secret when deploying to SQD Cloud
// See https://docs.sqd.dev/en/sdk/squid-sdk/evm/reference/data-stores/bigquery
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
	//5000 // <- page size for the insert operations on the table. It's optional.

	// Consider enabling abortAllProjectSessionsOnStartup and setting datasetRegion if you run into
	// "Transaction is aborted due to concurrent update" errors.
	// DANGEROUS: using abortAllProjectSessionsOnStartup can lead to data loss in certain setups.
	// See https://docs.sqd.dev/en/sdk/squid-sdk/evm/reference/data-stores/bigquery
})

// run() drives the processing loop, passing each batch of data to the handler.
run(dataSource, db, async (ctx) => {
	// augmentBlock() enriches raw block items with ids and navigation helpers.
	const blocks = ctx.blocks.map(augmentBlock)
	for (let block of blocks) {
		for (let log of block.logs) {
			if (log.address===USDC_CONTRACT && log.topics[0]===erc20abi.events.Transfer.topic) {
				let { from, to, value } = erc20abi.events.Transfer.decode(log)
				ctx.store.TransfersTable.insert({ from, to, value })
			}
		}
	}
})
