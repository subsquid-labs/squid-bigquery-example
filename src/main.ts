import * as erc20abi from './abi/erc20'
import {BigQuery} from '@google-cloud/bigquery'
import {
	Column,
	Table,
	Types,
	Database
} from '@subsquid/bigquery-store'

import {processor, USDC_CONTRACT} from './processor'

const db = new Database({
	bq: new BigQuery(), // set GOOGLE_APPLICATION_CREDENTIALS at .env
	dataset: 'subsquid-datasets.test_dataset',
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
