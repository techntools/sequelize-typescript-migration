import { mkdir, rm } from 'fs/promises'

import { Sequelize } from 'sequelize-typescript'

// @ts-ignore module is js file instead of ts for the sequelize-cli
import { TEST_MIGRATIONS_DIR, TEST_DATABASE } from './constant'


export let sequelize: Sequelize

const options = {
  username: 'santosh',
  password: 'Sant0sh',
}

export async function init(dialect: string) {
  if (dialect == 'mysql') {
    sequelize = new Sequelize({ ...options, dialect })
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS ${TEST_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await sequelize.query(`USE ${TEST_DATABASE}`);
  } else if (dialect == 'postgres') {
    sequelize = new Sequelize({ ...options, dialect, database: 'postgres' })
    await sequelize.query(`CREATE DATABASE ${TEST_DATABASE}`);
    await sequelize.close()
    sequelize = new Sequelize({ ...options, dialect, database: TEST_DATABASE })
    /*
     * Note that enabling extension is specific to a particular database that
     * you are using. It is not installation-wide.
     */
    await sequelize.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
    await sequelize.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  }

  try {
    await mkdir(TEST_MIGRATIONS_DIR)
  } catch(err: any) {
    if (err && err['code'] !== 'EEXIST')
      throw err
  }

  return sequelize
}

export async function cleanup() {
  try {
    const dialect = sequelize.getDialect()

    if (dialect == 'postgres') {
      await sequelize.close()
      sequelize = new Sequelize({ ...options, dialect, database: 'postgres' })
    }

    if (['postgres', 'mysql', 'mariadb'].includes(dialect))
      await sequelize.query(`DROP DATABASE IF EXISTS ${TEST_DATABASE}`)

    await sequelize.close()
  } catch(err) {
    console.error(err)
  }

  await rm(TEST_MIGRATIONS_DIR, { recursive: true })
}

export default function(options: { dialect: string }) {
  let logSpy: jest.SpyInstance

  beforeAll(async () => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterAll(async () => {
    logSpy.mockRestore()
  })

  beforeEach(async () => {
    sequelize = await init(options.dialect)
  })

  afterEach(async () => {
    await cleanup()
  })
}
