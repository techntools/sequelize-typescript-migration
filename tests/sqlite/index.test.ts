import path from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

import { CarBrand, Car } from '../models'
import { setupDatabase, groupAfterAll, groupBeforeAll } from '../setup'

import { TEST_MIGRATIONS_DIR } from '../constant'

import { SequelizeTypescriptMigration } from '../../src/index'


/*
 * A lot of tests for MySQL/MariaDB pass for sqlite as well. Only tests
 * needed to be tweaked for sqlite are here.
 *
 * Following are not supported for sqlite:
 * 1. GEOMETRY and GEOGRAPHY data types
 * 2. FULLTEXT indexes
 *
 * See https://sequelize.org/docs/v6/other-topics/other-data-types/
 *
 * Sqlite support those through extensions and can be managed with raw
 * queries in up/down calls in migrations.
 */
describe("Sqlite Migrations", function () {
  const dialect = 'sqlite'

  const setupDB = setupDatabase.bind(null, dialect)

  beforeAll(async () => {
    await groupBeforeAll()
  })

  afterAll(async () => {
    await groupAfterAll(dialect)
  })

  function migrationCommand(database: string, migration: Record<string, any>) {
    return `npx sequelize-cli db:migrate --env testing --url ${dialect}:${path.resolve(process.cwd(), `tests/sqlite/${database}.sqlite`)} --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`
  }

  it("new column has unique constraint", async () => {
    const { CarBrandWithUniqueEmail } = await import(`../models`)

    const { sequelize, database } = await setupDB([CarBrand, CarBrandWithUniqueEmail, Car])

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'migZ',
    })

    await promisify(exec)(migrationCommand(database, migration))

    const [results, _] = await sequelize.query(
      `
        SELECT
          il.name AS indexName,
          il."unique" AS isUnique,
          il.origin
        FROM pragma_index_list(:tableName) AS il
        JOIN pragma_index_info(il.name) AS ii
        WHERE ii.name = :columnName;
      `,
      {
        replacements: {
          tableName: 'CarBrands',
          columnName: 'email'
        }
      }
    );

    expect(results.length).toEqual(1)
    expect((results[0] as any)['origin']).toEqual('u')
  })

  it("column attribute drop is successful", async () => {
    const { sequelize, database } = await setupDB([CarBrand, Car])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-andromeda',
    })

    await promisify(exec)(migrationCommand(database, fm))

    const { CarBrandIsCertifiedDefaultNulled } = await import(`../models`)

    sequelize.addModels([CarBrandIsCertifiedDefaultNulled]);

    const sm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-andromeda',
    })

    const { stdout } = await promisify(exec)(migrationCommand(database, sm))
    console.log(stdout)

    const desc = await sequelize.getQueryInterface().describeTable('CarBrands')
    expect(desc['isCertified']['defaultValue']).toBeUndefined()
  })

  it("attribute is promoted to a foreign key reference", async () => {
    const { CarBrandWithOwnerId } = await import('../models')

    const { sequelize, database } = await setupDB([CarBrandWithOwnerId, Car])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-jupiter',
    })

    await promisify(exec)(migrationCommand(database, fm))

    const { CarBrandWithOwnerReference, Owner } = await import('../models')

    sequelize.addModels([CarBrandWithOwnerReference, Owner])

    const sm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-jupiter',
    })

    await promisify(exec)(migrationCommand(database, sm))

    const res = await sequelize.query(
      `
      SELECT m.name    AS table_name,
             f."from"  AS column_name,
             f."table" AS references_table,
             f."to"    AS referenced_table
      FROM sqlite_master AS m
      JOIN pragma_foreign_key_list(m.name) AS f
      WHERE m.type = 'table';
      `
    )

    const r = res[0] as []
    for (const _r of r) {
      if (_r['table_name'] == 'CarBrands' && _r['column_name'] == 'ownerId')
        return
    }

    expect(true).toBe(false)
  })

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
    expect(desc['ownerId']['type']).toEqual('INTEGER')
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
    expect(desc['ownerId']['type']).toEqual('INTEGER')
  })
})
