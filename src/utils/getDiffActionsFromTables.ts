import { diff } from "deep-diff";

import type { Json } from "../constants";
import sortActions from "./sortActions";

export interface IAction {
  actionType:
    | "addColumn"
    | "addIndex"
    | "changeColumn"
    | "createTable"
    | "dropTable"
    | "removeColumn"
    | "removeIndex";
  tableName: string;
  attributes?: any;
  attributeName?: any;
  options?: any;
  columnName?: any;
  fields?: any[];
  depends: string[];
}

export default function getDiffActionsFromTables(
  previousStateTables: Json,
  currentStateTables: Json
) {
  const actions: IAction[] = [];
  const differences = diff(previousStateTables, currentStateTables);

  if (!differences) return actions;

  differences.forEach((df) => {
    if (!df.path) throw new Error("Missing path");

    if (df.kind === 'N') {  // add new
      // create new table
      if (df.path.length === 1) {
        const depends: string[] = [];
        const tableName = df.rhs.tableName as string;

        Object.values(df.rhs.schema).forEach((v: any) => {
          if (v.references) depends.push(v.references.model as string);
        });

        actions.push({
          actionType: "createTable",
          tableName,
          attributes: df.rhs.schema,
          options: {},
          depends,
        });

        // create indexes
        if (df.rhs.indexes)
          for (const i in df.rhs.indexes) {
            const copied = JSON.parse(JSON.stringify(df.rhs.indexes[i]));

            actions.push({
              actionType: "addIndex",
              tableName,
              depends: [tableName],
              ...copied,
            });
          }

          return;
      }

      const tableName = df.path[0];
      const depends = [tableName];

      if (df.path[1] === "schema") {
        // new field
        if (df.path.length === 3) {
          if (df.rhs && df.rhs.references)
            depends.push(df.rhs.references.model);

          actions.push({
            actionType: "addColumn",
            tableName,
            attributeName: df.path[2],
            options: df.rhs,
            depends,
          });

          return;
        }

        // add new attribute to column (change col)
        if (df.path.length > 3)
          if (df.path[1] === "schema") {
            const options = currentStateTables[tableName].schema[df.path[2]];

            if (options.references)
              depends.push(options.references.model);

            actions.push({
              actionType: "changeColumn",
              tableName,
              attributeName: df.path[2],
              options,
              depends,
            });

            return;
          }
      }

      // new index
      if (df.path[1] === "indexes" && df.rhs) {
        const tableName = df.path[0];
        const index = JSON.parse(JSON.stringify(df.rhs));

        index.actionType = "addIndex";
        index.tableName = tableName;
        index.depends = [tableName];
        actions.push(index);

        return;
      }
    } else if (df.kind === 'D') {  // drop
      const tableName = df.path[0];

      // drop table
      if (df.path.length === 1) {
        const depends: string[] = [];
        Object.values(df.lhs.schema).forEach((v: any) => {
          if (v.references) depends.push(v.references.model);
        });

        actions.push({
          actionType: "dropTable",
          tableName,
          depends,
        });

        return;
      }

      if (df.path[1] === "schema") {
        // drop column
        if (df.path.length === 3) {
          actions.push({
            actionType: "removeColumn",
            tableName,
            columnName: df.path[2],
            depends: [tableName],
          });

          return;
        }

        // drop attribute from column
        if (df.path.length > 3) {
          const depends = [tableName];
          const options = currentStateTables[tableName].schema[df.path[2]];

          if (options.references)
            depends.push(options.references.model);

          actions.push({
            actionType: "changeColumn",
            tableName,
            attributeName: df.path[2],
            options,
            depends,
          });

          return;
        }
      }

      if (df.path[1] === "indexes" && df.lhs) {
        actions.push({
          actionType: "removeIndex",
          tableName,
          fields: df.lhs.fields,
          options: df.lhs.options,
          depends: [tableName],
        });

        return;
      }
    } else if (df.kind === 'E') {  // edit
      const tableName = df.path[0];
      const depends = [tableName];

      if (df.path[1] === "schema") {
        const options = currentStateTables[tableName].schema[df.path[2]];

        if (options.references)
          depends.push(options.references.model);

        actions.push({
          actionType: "changeColumn",
          tableName,
          attributeName: df.path[2],
          options,
          depends,
        });
      }
    } else if (df.kind === 'A') {  // array change indexes
        console.log(
          "[Not supported] Array model changes! Problems are possible. Please, check result more carefully!"
        );
        console.log("[Not supported] Difference: ");
        console.log(JSON.stringify(df, null, 4));
    }
  });

  const result = sortActions(actions);

  return result;
}
