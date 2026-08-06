import { mkdir, rm } from 'fs/promises'

import { Sequelize, ModelCtor } from 'sequelize-typescript'

import randomName from '@scaleway/random-name'

// @ts-ignore module is js file instead of ts for the sequelize-cli
import { TEST_MIGRATIONS_DIR } from './constant'

import config from './config'


const databases: Sequelize[] = []


export async function setupDatabase(dialect: string, models?: ModelCtor[]) {
  let sequelize: Sequelize

  const database = randomName('db', '_')

  if (dialect == 'mysql') {
    sequelize = new Sequelize({ ...config.mysql, database: undefined, dialect })

    await sequelize.query(`CREATE DATABASE IF NOT EXISTS ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
    await sequelize.query(`USE ${database}`)
    await sequelize.close()

    sequelize = new Sequelize({ ...config.mysql, database, dialect })
  }

  if (dialect == 'postgres') {
    sequelize = new Sequelize({ ...config.postgres, dialect, database: 'postgres' })
    await sequelize.query(`CREATE DATABASE ${database}`)
    await sequelize.close()

    sequelize = new Sequelize({ ...config.postgres, dialect, database })

    /*
     * Note that enabling extension is specific to a particular database that
     * you are using. It is not installation-wide.
     */
    await sequelize.query(`CREATE EXTENSION IF NOT EXISTS postgis`)
    await sequelize.query(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
  }

  databases.push(sequelize!)

  if (models)
    sequelize!.addModels(models)

  return { sequelize: sequelize!, database }
}

export async function cleanupDatabases(dialect: string) {
  let sequelize: Sequelize

  if (dialect == 'mysql') {
    sequelize = new Sequelize({ ...config.mysql, database: undefined, dialect })
  }

  if (dialect == 'postgres') {
    sequelize = new Sequelize({ ...config.postgres, dialect, database: 'postgres' })
  }

  await Promise.all(databases.map(async (seq) => {
    await seq.close()
    await sequelize.query(`DROP DATABASE IF EXISTS ${seq.config.database}`)
  }))

  await sequelize!.close()
}

let logSpy: jest.SpyInstance

export async function groupBeforeAll() {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  try { await mkdir(TEST_MIGRATIONS_DIR) } catch(err) {}
}

export async function groupAfterAll(dialect: string) {
  logSpy.mockRestore()
  await cleanupDatabases(dialect)
  await rm(TEST_MIGRATIONS_DIR, { recursive: true })
}
