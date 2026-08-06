import { DataType } from 'sequelize-typescript'

import { setupDatabase, groupAfterAll, groupBeforeAll } from './setup'
import { TEST_MIGRATIONS_DIR } from './constant'

import { SequelizeTypescriptMigration } from '../src/index'


describe('getDiffActionsFromTables', () => {
  const dialect = 'mysql'

  beforeAll(async () => {
    await groupBeforeAll()
  })

  afterAll(async () => {
    await groupAfterAll(dialect)
  })

  it('throws when references is set without a model', async () => {
    const { sequelize } = await setupDatabase(dialect, [])

    sequelize.define(
      'BareFkWithBadRef',
      {
        ownerId: {
          type: DataType.INTEGER,
          references: { key: 'id' } as any,
        },
      },
      { tableName: 'BareFkWithBadRefs' }
    )

    let caught: unknown
    try {
      await SequelizeTypescriptMigration.makeMigration(sequelize, {
        outDir: TEST_MIGRATIONS_DIR,
        preview: false,
      })
    } catch (err) {
      caught = err
    }

    expect(caught).toBeInstanceOf(Error)
    expect((caught as Error).message).toMatch(/Foreign key on "BareFkWithBadRefs" is missing references\.model/)
  })
})
