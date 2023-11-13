import {assertNotNull} from '@subsquid/util-internal'
import * as erc20abi from './abi/erc20'
import {BigQuery} from '@google-cloud/bigquery'
import {
	Column,
	Table,
	Types,
	Database
} from '@subsquid/bigquery-store'

import {processor, USDC_CONTRACT} from './processor'

assertNotNull(process.env.GOOGLE_APPLICATION_CREDENTIALS, 'Please define GOOGLE_APPLICATION_CREDENTIALS. See https://cloud.google.com/docs/authentication/application-default-credentials#GAC')
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
	}
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
