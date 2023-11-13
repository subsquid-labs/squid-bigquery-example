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

const projectId = assertNotNull(process.env.GOOGLE_PROJECT_ID, 'Please define the GOOGLE_PROJECT_ID env variable')
const datasetId = assertNotNull(process.env.GOOGLE_DATASET_ID, 'Please define the GOOGLE_DATASET_ID env variable')
const privateKey = assertNotNull(process.env.GOOGLE_PRIVATE_KEY, 'Please define the GOOGLE_PRIVATE_KEY env variable')

const bq = new BigQuery({
	projectId,
	credentials: {
		client_id: assertNotNull(process.env.GOOGLE_CLIENT_ID, 'Please define the GOOGLE_CLIENT_ID env variable'),
		client_email: assertNotNull(process.env.GOOGLE_CLIENT_EMAIL, 'Please define the GOOGLE_CLIENT_EMAIL env variable'),
		private_key: privateKey.replace(/\\n/g, '\n')
	}
})

const db = new Database({
	bq,
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
