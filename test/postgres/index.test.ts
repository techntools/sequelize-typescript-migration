import fs from 'fs/promises';
import { constants } from 'fs';
import { exec } from 'child_process'
import { promisify } from 'util'

import { CarBrand, Car } from '../models'
import setup, { sequelize } from '../setup'

// @ts-ignore module is js file instead of ts for the sequelize-cli
import { TEST_MIGRATIONS_DIR } from '../constant'

import { SequelizeTypescriptMigration } from '../../src/index'


describe("Postgres Migrations", function () {
  setup({ dialect: 'postgres' })

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

  it("new and only column migration executes successfully", async () => {
    const { CarBrandWithEmail } = await import(`../models`)

    sequelize.addModels([CarBrand, CarBrandWithEmail, Car]);

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-y',
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
      migrationName: 'mig-z',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const queryInterface = sequelize.getQueryInterface()
    const indexes = await queryInterface.showIndex('CarBrands')
    for (const index of indexes as []) {
      for (const field of (index as any).fields as []) {
        if (field['attribute'] == 'email')
          expect(index['unique']).toBe(true)
      }
    }
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
        constraint_schema,
        table_name,
        constraint_type,
        constraint_name
      FROM
        information_schema.table_constraints
      WHERE
        constraint_schema = 'public'
        AND constraint_type IN ('FOREIGN KEY', 'PRIMARY KEY')
      ORDER BY
        table_name,
        constraint_type;
      `
    )

    for (const r of res) {
      for (const _r of r as []) {
        if (_r['table_name'] == 'CarBrands' && /CarBrands_ownerId_fkey\d+/.test(_r['constraint_name']))
          return
      }
    }

    expect(true).toBe(false)
  })

  it("column attribute drop is successful", async () => {
    sequelize.addModels([CarBrand, Car])

    const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-andromeda',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${fm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const descBefore = await sequelize.getQueryInterface().describeTable('CarBrands')
    expect(descBefore['isCertified']['defaultValue']).toBe(true)

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
    const { Contact, TestDefaultValueWithFn } = await import(`../models`)

    sequelize.addModels([Contact, TestDefaultValueWithFn]);

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-alpha',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const desc = await sequelize.getQueryInterface().describeTable('Contacts')
    expect(desc['isVerified']['defaultValue']).toEqual(false)
    expect(desc['points']['defaultValue']).toEqual("1")

    const descTestDefaultValueWithFn = await sequelize.getQueryInterface().describeTable('TestDefaultValueWithFns')
    expect(descTestDefaultValueWithFn['fieldUUID']['defaultValue']).toEqual('gen_random_uuid()')
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
    expect(desc['badge']['type']).toEqual('CHARACTER(2)')
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
    expect(desc['orderNo']['type']).toEqual('CHARACTER VARYING(255)')
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
    expect(desc['ownerId']['type']).toEqual('INTEGER')
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
    expect(desc['imgUrl']['type']).toEqual('CHARACTER VARYING(255)')
  })

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
      throw err
    }
  })

  it("array and range", async () => {
    const { CarWithSparePart } = await import('../models')

    sequelize.addModels([CarBrand, CarWithSparePart])

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-tundra',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const queryInterface = sequelize.getQueryInterface()

    const descCars = await queryInterface.describeTable('Cars')
    expect(descCars['cameras']['type']).toBe('ARRAY')
    expect(descCars['engineLife']['type']).toBe('DATERANGE')
  })

  it("geometry and geography", async () => {
    const { PlaceWithParadise } = await import('../models')

    sequelize.addModels([PlaceWithParadise])

    const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
      outDir: TEST_MIGRATIONS_DIR,
      migrationName: 'mig-alaska',
    })

    await promisify(exec)(`npx sequelize-cli db:migrate --env test_${sequelize.getDialect()} --config test/config.js --to ${migration.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

    const queryInterface = sequelize.getQueryInterface()

    const descPlaceWithParadise = await queryInterface.describeTable('PlaceWithParadises')
    expect(descPlaceWithParadise['entry']['type']).toBe('USER-DEFINED')
    expect(descPlaceWithParadise['location']['type']).toBe('USER-DEFINED')

    const indexes = await queryInterface.showIndex('PlaceWithParadises')
    for (const index of indexes as []) {
      for (const field of (index as any).fields as []) {
        if (field['attribute'] == 'location')
          return expect(index['definition']).toContain('gist')
      }
    }

    expect(1).toEqual(0)
  })
})
