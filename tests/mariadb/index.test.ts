import { exec } from 'child_process'
import { promisify } from 'util'

import config from '../config'

import { CarBrand, Car } from '../models'
import { setupDatabase, groupAfterAll, groupBeforeAll } from '../setup'

import { TEST_MIGRATIONS_DIR } from '../constant'

import { SequelizeTypescriptMigration } from '../../src/index'


/*
 * Most of the tests for MySQL pass for MariaDB as well. Only tests needed to be
 * tweaked for MariaDB are here.
 */
describe("Mariadb Migrations", function () {
  const dialect = 'mariadb'

  const setupDB = setupDatabase.bind(null, dialect)

  beforeAll(async () => {
    await groupBeforeAll()
  })

  afterAll(async () => {
    await groupAfterAll(dialect)
  })

  function migrationCommand(database: string, migration: Record<string, any>) {
    const { username, password, host, port } = config.mariadb
    return `npx sequelize-cli db:migrate --env testing --url ${dialect}://${username}:${password}@${host}:${port}/${database} --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`
  }

  it("new foreign key reference migration is successful", async () => {
    const { sequelize, database } = await setupDB([CarBrand, Car])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-jungle',
    })

    await promisify(exec)(migrationCommand(database, fm))

    const { CarBrandWithOwnerReference, Owner } = await import('../models')

    sequelize.addModels([CarBrandWithOwnerReference, Owner])

    const sm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-jungle',
    })

    await promisify(exec)(migrationCommand(database, sm))

    const queryInterface = sequelize.getQueryInterface()
    const desc = await queryInterface.describeTable('CarBrands')
    expect(desc['ownerId']['type']).toEqual('INT(11)')
  })

  it("foreign key references new table", async () => {
    const { CarBrandWithOwnerReference, Owner } = await import('../models')

    const { sequelize, database } = await setupDB([CarBrandWithOwnerReference, Owner])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-tribe',
    })

    await promisify(exec)(migrationCommand(database, fm))

    const { CarBrandWithStylishOwnerReference, OwnerWithStyle } = await import('../models')

    sequelize.addModels([CarBrandWithStylishOwnerReference, OwnerWithStyle])

    const sm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-tribe',
    })

    await promisify(exec)(migrationCommand(database, sm))

    const queryInterface = sequelize.getQueryInterface()
    const desc = await queryInterface.describeTable('CarBrands')
    expect(desc['ownerId']['type']).toEqual('INT(11)')
  })

  it("adding full text index is successful", async () => {
    const { CarWithCarriage } = await import('../models')

    const { sequelize, database } = await setupDB([CarWithCarriage])

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-gigantic',
    })

    await promisify(exec)(migrationCommand(database, migration))

    const queryInterface = sequelize.getQueryInterface()
    const indexes = await queryInterface.showIndex('CarWithCarriages')
    for (const index of indexes as []) {
      for (const field of (index as any).fields as []) {
        if (field['attribute'] == 'story')
          return expect(index['type']).toEqual('FULLTEXT')
      }
    }

    expect(1).toBe(0)
  })
})
