import { QueryTypes } from "sequelize";
import type { Sequelize } from "sequelize-typescript";

import type {
  MigrationState,
  SequelizeMigrations,
  SequelizeMigrationsMeta,
} from "../constants";
import getTableNamePerDialect from "../utils/getTableNamePerDialect"


export default async function getLastMigrationState(sequelize: Sequelize) {
  const [lastExecutedMigration] = await sequelize.query<SequelizeMigrations>(
    `SELECT name FROM ${getTableNamePerDialect(sequelize.getDialect(), 'SequelizeMeta')} ORDER BY name desc limit 1`,
    { type: QueryTypes.SELECT }
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const lastRevision: number =
    lastExecutedMigration !== undefined
      ? parseInt(lastExecutedMigration.name.split("-")[0])
      : -1;

  const [lastMigration] = await sequelize.query<SequelizeMigrationsMeta>(
    `SELECT state FROM ${getTableNamePerDialect(sequelize.getDialect(), 'SequelizeMigrationsMeta')} where revision = '${lastRevision}'`,
    { type: QueryTypes.SELECT }
  );

  if (lastMigration)
    return typeof lastMigration.state === "string"
      ? JSON.parse(lastMigration.state) as MigrationState
      : lastMigration.state;
}
