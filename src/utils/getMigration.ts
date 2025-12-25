export default function getMigration(actions) {
  const commandsUp: string[] = [];
  const commandsDown: string[] = [];
  const consoleOut: string[] = [];

  for (const i in actions) {
    const action = actions[i];

    if (action.actionType == 'createTable') {
      const res = `
      {
        fn: "createTable",
        params: [
          "${action.tableName}",
          ${getAttributes(action.attributes)},
          ${JSON.stringify(action.options)}
        ]
      }`;
      commandsUp.push(res);

      consoleOut.push(`createTable "${action.tableName}", deps: [${action.depends.join(", ")}]`);
    } else if (action.actionType == 'dropTable') {
      const res = `{ fn: "dropTable", params: ["${action.tableName}"] }`;
      commandsUp.push(res);

      consoleOut.push(`dropTable "${action.tableName}"`);
    } else if (action.actionType == 'addColumn') {
      const res = `
      {
        fn: "addColumn",
        params: [
          "${action.tableName}",
          "${action.attributeName}",
          ${propertyToStr(action.options)}
        ]
      }`;
      commandsUp.push(res);

      consoleOut.push(`addColumn "${action.attributeName}" to table "${action.tableName}"`);
    } else if (action.actionType == 'removeColumn') {
      const res = `
      {
        fn: "removeColumn",
        params: ["${action.tableName}", "${action.columnName}"]
      }`;
      commandsUp.push(res);

      consoleOut.push(`removeColumn "${action.columnName}" from table "${action.tableName}"`);
    } else if (action.actionType == 'changeColumn') {
      const res = `
      {
        fn: "changeColumn",
        params: [
          "${action.tableName}",
          "${action.attributeName}",
          ${propertyToStr(action.options)}
        ]
      }`;
      commandsUp.push(res);

      consoleOut.push(`changeColumn "${action.attributeName}" on table "${action.tableName}"`);
    } else if (action.actionType == 'addIndex') {
      const res = `
      {
        fn: "addIndex",
        params: [
          "${action.tableName}",
          ${JSON.stringify(action.fields)},
          ${JSON.stringify(action.options)}
        ]
      }`;
      commandsUp.push(res);

      const nameOrAttrs = action.options && action.options.indexName ? `"${action.options.indexName}"` : JSON.stringify(action.fields);
      consoleOut.push(`addIndex ${nameOrAttrs} to table "${action.tableName}"`);
    } else if (action.actionType == 'removeIndex') {
      const nameOrAttrs = action.options && action.options.indexName ? `"${action.options.indexName}"` : JSON.stringify(action.fields);

      const res = `
      {
        fn: "removeIndex",
        params: [
          "${action.tableName}",
          ${nameOrAttrs}
        ]
      }`;
      commandsUp.push(res);

      consoleOut.push(`removeIndex ${nameOrAttrs} from table "${action.tableName}"`);
    }
  }

  return { commandsUp, commandsDown, consoleOut };
}

const propertyToStr = (obj) => {
  const values: string[] = [];

  for (const k in obj) {
    if (k === "seqType") {
      values.push(`"type": ${obj[k]}`);

      continue;
    }

    if (k === "defaultValue") {
      if (obj[k].internal) {
        values.push(`"defaultValue": ${obj[k].value}`);

        continue;
      }

      if (obj[k].notSupported) continue;

      const x = {};

      x[k] = obj[k];
      const value = JSON.stringify(x).slice(1, -1);
      values.push(value);

      continue;
    }

    const x = {};

    x[k] = obj[k];
    values.push(JSON.stringify(x).slice(1, -1));
  }

  return `{ ${values.filter((v) => v !== "").reverse().join(", ")} }`;
};

const getAttributes = (attrs) => {
  const ret: string[] = [];

  for (const attrName in attrs)
    ret.push(`"${attrName}": ${propertyToStr(attrs[attrName])}`);

  return `{\n${ret.join(",\n")}\n}`;
};
