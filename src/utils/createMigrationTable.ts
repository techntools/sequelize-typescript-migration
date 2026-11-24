import {
  DataType as SequelizeTypescriptDataType,
  Sequelize,
} from "sequelize-typescript";

export default async function createMigrationTable(sequelize: Sequelize) {
  const queryInterface = sequelize.getQueryInterface();

  let defaultValue: ReturnType<typeof Sequelize.fn | typeof Sequelize.literal>

  if (sequelize.getDialect() === 'sqlite')
    defaultValue = Sequelize.literal('CURRENT_TIMESTAMP')
  else
    defaultValue = Sequelize.fn('now')

  await queryInterface.createTable("SequelizeMeta", {
    name: {
      type: SequelizeTypescriptDataType.STRING,
      allowNull: false,
      unique: true,
      primaryKey: true,
    },
    date: {
      type: SequelizeTypescriptDataType.DATE,
      defaultValue,
    },
  });

  await queryInterface.createTable("SequelizeMigrationsMeta", {
    revision: {
      type: SequelizeTypescriptDataType.INTEGER,
      allowNull: false,
      unique: true,
      primaryKey: true,
    },
    name: {
      type: SequelizeTypescriptDataType.STRING,
      allowNull: false,
    },
    state: {
      type: SequelizeTypescriptDataType.JSON,
      allowNull: false,
    },
    date: {
      type: SequelizeTypescriptDataType.DATE,
      defaultValue,
    },
  });
}
