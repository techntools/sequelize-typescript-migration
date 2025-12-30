import { existsSync } from "fs";
import beautify from "js-beautify";
import type { Model, ModelStatic } from "sequelize/types";
import type { Sequelize } from "sequelize-typescript";

import type { MigrationState } from "./constants";
import createMigrationTable from "./utils/createMigrationTable";
import getDiffActionsFromTables from "./utils/getDiffActionsFromTables";
import getLastMigrationState from "./utils/getLastMigrationState";
import getMigration from "./utils/getMigration";
import getTablesFromModels, { ReverseModelsOptions } from "./utils/getTablesFromModels";
import writeMigration from "./utils/writeMigration";

export type IMigrationOptions = {
  /**
   * directory where migration file saved. We recommend that you specify this
   * path to sequelize migration path.
   */
  outDir?: string;

  /**
   * if true, it doesn't generate files but just prints result action.
   */
  preview?: boolean;

  /**
   * migration file name, default is "noname"
   */
  migrationName?: string;

  /**
   * comment of migration.
   */
  comment?: string;

  debug?: boolean;
  verbose?: boolean;
} & ReverseModelsOptions

export class SequelizeTypescriptMigration {
  /**
   * generates migration file including up, down code after this, run 'npx sequelize-cli db:migrate'.
   *
   * @param sequelize sequelize-typescript instance
   * @param options options
   */
  public static makeMigration = async (
    sequelize: Sequelize,
    options: IMigrationOptions
  ) => {
    options.preview = options.preview || false;

    if (!options.preview) {
      if (!options.outDir)
          throw new Error(
            `migrations directory is needed without preview`
          )

      if (!existsSync(options.outDir))
          throw new Error(
            `${options.outDir} does not exist. Check path and if you did 'npx sequelize init' you must use path used in sequelize migration path`
          )
    }

    await sequelize.authenticate();

    const models: { [key: string]: ModelStatic<Model> } = sequelize.models;

    const queryInterface = sequelize.getQueryInterface();

    await createMigrationTable(sequelize);

    const lastMigrationState = await getLastMigrationState(sequelize);
    const previousState: MigrationState = {
      revision: lastMigrationState?.revision ?? 0,
      version: lastMigrationState?.version ?? 1,
      tables: lastMigrationState?.tables ?? {},
    };
    const currentState: MigrationState = {
      revision: (previousState.revision || 0) + 1,
      tables: getTablesFromModels(sequelize, models, options),
    };

    const upActions = getDiffActionsFromTables(
      previousState.tables,
      currentState.tables
    );
    const downActions = getDiffActionsFromTables(
      currentState.tables,
      previousState.tables
    );

    const migration = getMigration(upActions);
    const tmp = getMigration(downActions);

    migration.commandsDown = tmp.commandsUp;

    if (migration.commandsUp.length === 0)
      return { noChangesFound: true, filename: null };

    // log
    console.log();
    migration.consoleOut.forEach((v) => {
      console.log(`[Actions] ${v}`);
    });

    if (options.preview) {
      console.log("\nMigration commands:\n");
      console.log(beautify(`[${migration.commandsUp.join(",")}];`));

      console.log("\nUndo commands:\n");
      console.log(beautify(`[${migration.commandsDown.join(",")}];`));

      return { successWithoutSave: true, filename: null };
    }

    const info = await writeMigration(currentState, migration, options);

    console.log(
      `\nNew migration to revision ${currentState.revision} has been saved to file '${info.filename}'`
    );

    // save current state, Ugly hack, see https://github.com/sequelize/sequelize/issues/8310
    const rows = [
      {
        revision: currentState.revision,
        name: info.info.name,
        state: JSON.stringify(currentState),
      },
    ];

    try {
      if (sequelize.options.logging) console.log()

      await queryInterface.bulkDelete("SequelizeMigrationsMeta", {
        revision: currentState.revision,
      });
      await queryInterface.bulkInsert("SequelizeMigrationsMeta", rows);

      console.log(`\nUse sequelize CLI:\n\tnpx sequelize db:migrate --to ${info.revisionNumber}-${info.info.name}.js ${`--migrations-path=${options.outDir}`}`);

      return { success: true, filename: info.filename };
    } catch (err) {
      if (options.debug) console.error(err);
    }

    return { successAnyway: true, filename: info.filename };
  };
}
