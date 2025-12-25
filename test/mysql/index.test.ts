import fs from 'fs/promises';
import { constants } from 'fs';
import { exec } from 'child_process'
import { promisify } from 'util'

import { CarBrand, Car } from '../models'
import setup, { sequelize } from '../setup'

// @ts-ignore module is js file instead of ts for the sequelize-cli
import { TEST_MIGRATIONS_DIR, TEST_DATABASE } from '../constant'

import { SequelizeTypescriptMigration } from '../../src/index'


describe("Mysql Migrations", function () {
  setup({ dialect: 'mysql' })

  it("noname migration executes successfully", async () => {
    sequelize.addModels([CarBrand, Car])

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const queryInterface = sequelize.getQueryInterface()
    await expect(queryInterface.describeTable('CarBrands')).resolves.toBeDefined()
    await expect(queryInterface.describeTable('Cars')).resolves.toBeDefined()
  })

  it("migration without changes", async () => {
    sequelize.addModels([CarBrand, Car])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-gold',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${fm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const { CarBrandWithoutModification } = await import('../models')

    sequelize.addModels([CarBrandWithoutModification])

    const sm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-gold',
    })

    expect(sm.filename).toBeNull()
  })

  it("migration preview is successful", async () => {
    sequelize.addModels([CarBrand, Car])

    await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-nightstars',
      preview: true
    })
  })

  it("new and only column migration is successful", async () => {
    const { CarBrandWithEmail } = await import(`../models`)

    sequelize.addModels([CarBrand, CarBrandWithEmail, Car]);

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'migY',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const desc = await sequelize.getQueryInterface().describeTable('CarBrands')
    expect(desc).toHaveProperty('email')
  })

  it("column has new attribute", async () => {
    const { CarBrandWithRequiredRegNo } = await import(`../models`)

    sequelize.addModels([CarBrand, CarBrandWithRequiredRegNo, Car]);

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-galaxy',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const queryInterface = sequelize.getQueryInterface()
    const desc = await queryInterface.describeTable('CarBrands')
    expect(desc['regNo']['allowNull']).toBe(false)
  })

  it("new column has unique constraint", async () => {
    const { CarBrandWithUniqueEmail } = await import(`../models`)

    sequelize.addModels([CarBrand, CarBrandWithUniqueEmail, Car]);

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'migZ',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const [results, _] = await sequelize.query("SHOW INDEXES FROM CarBrands WHERE Column_name = 'email';");
    if (results.length)
      expect((results[0] as any)['Non_unique']).toEqual(0)
  })

  it("column attribute drop is successful", async () => {
    sequelize.addModels([CarBrand, Car])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-andromeda',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${fm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const { CarBrandIsCertifiedDefaultRemoved } = await import(`../models`)

    sequelize.addModels([CarBrandIsCertifiedDefaultRemoved]);

    const sm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-andromeda',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${sm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const desc = await sequelize.getQueryInterface().describeTable('CarBrands')
    expect(desc['isCertified']['defaultValue']).toBeNull()
  })

  it("column has default value", async () => {
    const { Contact } = await import(`../models`)

    sequelize.addModels([Contact]);

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-alpha',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const desc = await sequelize.getQueryInterface().describeTable('Contacts')
    expect(desc['isVerified']['defaultValue']).toEqual("0")
    expect(desc['points']['defaultValue']).toEqual("1")
  })

  it("column has internal default value", async () => {
    const { TestDefaultValue } = await import(`../models`)

    sequelize.addModels([TestDefaultValue]);

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-elephant',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const desc = await sequelize.getQueryInterface().describeTable('TestDefaultValues')
    expect(desc['fieldDefaultByFn']['defaultValue']).toBeNull()
    expect(desc['fieldNOW']['defaultValue']).toBeNull()
    expect(desc['fieldUUIDV1']['defaultValue']).toBeNull()
    expect(desc['fieldUUIDV4']['defaultValue']).toBeNull()
  })

  it("column is char of fixed length", async () => {
    const { Squad } = await import(`../models`)

    sequelize.addModels([Squad]);

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-beta',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const desc = await sequelize.getQueryInterface().describeTable('Squads')
    expect(desc['badge']['type']).toEqual('CHAR(2)')
  })

  it("new column type migration is successful", async () => {
    sequelize.addModels([CarBrand, Car])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-city',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${fm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const { CarBrandWithStringOrderNumber } = await import(`../models`)

    sequelize.addModels([CarBrandWithStringOrderNumber])

    const sm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-city',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${sm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const queryInterface = sequelize.getQueryInterface()
    const desc = await queryInterface.describeTable('CarBrands')
    expect(desc['orderNo']['type']).toEqual('VARCHAR(255)')
  })

  it("attribute is promoted to a foreign key reference", async () => {
    const { CarBrandWithOwnerId } = await import('../models')

    sequelize.addModels([CarBrandWithOwnerId, Car])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-jupiter',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${fm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const { CarBrandWithOwnerReference, Owner } = await import('../models')

    sequelize.addModels([CarBrandWithOwnerReference, Owner])

    const sm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-jupiter',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${sm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const res = await sequelize.query(
      `
      SELECT
        TABLE_NAME, COLUMN_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
      FROM
        INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE
        REFERENCED_TABLE_SCHEMA = '${TEST_DATABASE}' AND
        REFERENCED_TABLE_NAME = 'Owners'
      `
    )

    for (const r of res) {
      for (const _r of r as []) {
        if (_r['TABLE_NAME'] == 'CarBrands' && _r['COLUMN_NAME'] == 'ownerId')
          return
      }
    }

    expect(true).toBe(false)
  })

  it("new foreign key reference migration is successful", async () => {
    sequelize.addModels([CarBrand, Car])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-jungle',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${fm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const { CarBrandWithOwnerReference, Owner } = await import('../models')

    sequelize.addModels([CarBrandWithOwnerReference, Owner])

    const sm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-jungle',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${sm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const queryInterface = sequelize.getQueryInterface()
    const desc = await queryInterface.describeTable('CarBrands')
    expect(desc['ownerId']['type']).toEqual('INT')
  })

  it("foreign key references new table", async () => {
    const { CarBrandWithOwnerReference, Owner } = await import('../models')

    sequelize.addModels([CarBrandWithOwnerReference, Owner])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-tribe',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${fm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const { CarBrandWithStylishOwnerReference, OwnerWithStyle } = await import('../models')

    sequelize.addModels([CarBrandWithStylishOwnerReference, OwnerWithStyle])

    const sm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-tribe',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${sm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const queryInterface = sequelize.getQueryInterface()
    const desc = await queryInterface.describeTable('CarBrands')
    expect(desc['ownerId']['type']).toEqual('INT')
  })

  it("adding new index is successful", async () => {
    sequelize.addModels([CarBrand, Car])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-atlas',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${fm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const { CarBrandWithUniqueImg } = await import('../models')

    sequelize.addModels([CarBrandWithUniqueImg])

    const sm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-atlas',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${sm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const queryInterface = sequelize.getQueryInterface()
    const desc = await queryInterface.describeTable('CarBrands')
    expect(desc['imgUrl']['type']).toEqual('VARCHAR(255)')
  })

  /*
   * Test to cover some lines in removeCurrentRevisionMigrations.ts
   */
  it("make migrations multiple times", async () => {
    sequelize.addModels([CarBrand, Car])

    await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-venus',
    })

    const mk = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-venus',
      verbose: true
    })

    try {
      await fs.access(mk.filename!, constants.R_OK | constants.W_OK);
    } catch(err) {
      console.error(err)
      expect(true).toBe(false)
    }
  })

  it("geometry and geography", async () => {
    const { Place } = await import('../models')

    sequelize.addModels([Place])

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-tundra',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const queryInterface = sequelize.getQueryInterface()

    const descPlace = await queryInterface.describeTable('Places')
    expect(descPlace['location']['type']).toBe('POINT')

    const indexes = await queryInterface.showIndex('Places')
    for (const index of indexes as []) {
      for (const field of (index as any).fields as []) {
        if (field['attribute'] == 'location')
          return expect(index['type']).toEqual('SPATIAL')
      }
    }

    expect(1).toBe(0)
  })

  it("adding full text index is successful", async () => {
    const { CarWithStory } = await import('../models')

    sequelize.addModels([CarWithStory])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-gigantic',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --debug --env test_${sequelize.getDialect()} --config test/config.js --to ${fm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const queryInterface = sequelize.getQueryInterface()
    const indexes = await queryInterface.showIndex('CarWithStories')
    for (const index of indexes as []) {
      for (const field of (index as any).fields as []) {
        if (field['attribute'] == 'story')
          return expect(index['type']).toEqual('FULLTEXT')
      }
    }

    expect(1).toBe(0)
  })
})
