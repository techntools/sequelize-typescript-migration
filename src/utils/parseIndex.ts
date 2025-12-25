import * as crypto from "crypto";
import type { IndexesOptions } from "sequelize/types";

export default function parseIndex(idx: IndexesOptions) {
  const result: { [x: string]: unknown } = {};

  [
    "name",
    "unique",
    "concurrently",
    "fields",
    "operator",
    "where",
  ].forEach((key) => {
    if (idx[key] !== undefined) result[key] = idx[key];
  });

  const options: { [x: string]: unknown } = {};

  [
    "type",
    "using",
  ].forEach((key) => {
    if (idx[key] !== undefined) options[key] = idx[key];
  });

  // The name of the index. Default is __
  if (idx.name) options.name = idx.name;

  if (idx.unique) options.type = "UNIQUE";

  // For FULLTEXT columns set your parser
  if (idx.parser && idx.parser !== "") options.parser = idx.parser;

  result.options = options;

  // result["hash"] = hash(idx);
  result.hash = crypto.createHash("sha1").update(JSON.stringify(idx)).digest("hex");

  return result;
}
