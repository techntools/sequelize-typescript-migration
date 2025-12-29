import { join } from 'path'
import { exec } from 'child_process'
import { promisify } from 'util'

import { CarBrand, Car } from './models'
import setup, { sequelize } from './setup'

// @ts-ignore module is js file instead of ts for the sequelize-cli
import { TEST_MIGRATIONS_DIR } from './constant'

import { SequelizeTypescriptMigration } from '../src/index'


describe('Migration options', function () {
  setup({ dialect: 'mysql'})

  describe('SequelizeTypescriptMigration', () => {
    it(`throws without migrations folder`, async () => {
      try {
        await SequelizeTypescriptMigration.makeMigration(sequelize, {
          outDir: join(__dirname, 'no-such-folder'),
          preview: false,
        });
      } catch(err) {
        return expect(err).toBeInstanceOf(Error)
      }

      throw new Error('Did not expect this')
    })

    it(`without preview migration directory is needed`, async () => {
      try {
        await SequelizeTypescriptMigration.makeMigration(sequelize, {
          migrationName: "test-one-to-many",
          preview: false,
        });
      } catch(err) {
        return expect(err).toBeInstanceOf(Error)
      }

      throw new Error('Did not expect this')
    })

    it(`no migrations without models`, async () => {
      await expect(SequelizeTypescriptMigration.makeMigration(sequelize, {
        outDir: TEST_MIGRATIONS_DIR,
        migrationName: "test-one-to-many",
        preview: false,
      })).resolves.toEqual(expect.objectContaining({ noChangesFound: true }))
    })

    it(`previews migration without save`, async () => {
      sequelize.addModels([CarBrand, Car])

      await expect(SequelizeTypescriptMigration.makeMigration(sequelize, {
        preview: true,
      })).resolves.toEqual(expect.objectContaining({ successWithoutSave: true }))
    })

    it(`creates migration with models`, async () => {
      sequelize.addModels([CarBrand, Car])

      const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
        outDir: TEST_MIGRATIONS_DIR,
        migrationName: "migX",
        preview: false,
      })

      expect(migration).toEqual(expect.objectContaining({ success: true }))
      expect(require(migration.filename!)).toBeDefined()
    })

    it(`success even after failed to delete/insert migration `, async () => {
      sequelize.addModels([CarBrand, Car])

      const qi = sequelize.getQueryInterface()

      const bulkDeleteSpy = jest.spyOn(qi, 'bulkDelete').mockRejectedValueOnce(new Error('Failed to ...'))
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

      const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
        outDir: TEST_MIGRATIONS_DIR,
        migrationName: "migX",
        preview: false,
        debug: true
      })

      expect(migration).toEqual(expect.objectContaining({ successAnyway: true }))
      expect(errorSpy).toHaveBeenCalled()

      bulkDeleteSpy.mockRestore()
    })

    it(`no name for migration`, async () => {
      sequelize.addModels([CarBrand])

      const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
        outDir: TEST_MIGRATIONS_DIR,
        preview: false,
      })

      expect(migration.filename).toMatch('-noname')
    })

    it(`migration file name with space or -`, async () => {
      sequelize.addModels([CarBrand])

      const migration = await SequelizeTypescriptMigration.makeMigration(sequelize, {
        outDir: TEST_MIGRATIONS_DIR,
        migrationName: 'mig gamma-1',
        preview: false,
      })

      expect(migration.filename).toMatch('mig_gamma_1')
    })

    it("columns are snake cased", async () => {
      const { SnakeCasedModel } = await import('./models')

      sequelize.addModels([SnakeCasedModel])

      const fm = await SequelizeTypescriptMigration.makeMigration(sequelize, {
        outDir: TEST_MIGRATIONS_DIR,
        migrationName: 'mig-adventure',
        useSnakeCase: true
      })

      await promisify(exec)(`npx sequelize-cli db:migrate --debug --env test_${sequelize.getDialect()} --config test/config.js --to ${fm.filename!.split('/').reverse()[0]} --migrations-path=${TEST_MIGRATIONS_DIR}`)

      const queryInterface = sequelize.getQueryInterface()
      const desc = await queryInterface.describeTable('SnakeCasedModels')
      expect(desc).toHaveProperty('this_is_that')
      expect(desc).toHaveProperty('created_at')
      expect(desc).toHaveProperty('updated_at')
    })
  })
})
