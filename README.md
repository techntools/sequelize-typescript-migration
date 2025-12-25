# sequelize-typescript-migration

Based on work of [mandarvl](https://github.com/mandarvl) at [sequelize-typescript-migration](https://github.com/mandarvl/sequelize-typescript-migration).

Full credits to mmRoshani, mandarvl, kimjbstar, mricharz, syon-development, viinzzz and lou2013 for the awesome lib.

#### Installation

```bash
npm i @techntools/sequelize-typescript-migration

// Or

yarn add @techntools/sequelize-typescript-migration
```

## General info

It is based on [sequelize-typescript](https://www.npmjs.com/package/sequelize-typescript) and does not support "sequelize" based model codes and you need prior knowledge of migration of Sequelize.

This scans models and its decorators to find changes, and generates migration code with this changes so don't need to write up, down function manually. This is like `makemigration` in django framework.

After generation is successful, you can use "migrate" in [Sequelize Migration Manual](https://sequelize.org/docs/v6/other-topics/migrations/)

Sometimes, undo(down) action may not work, then you should modify manually. Maybe it's because of ordering of relations of models. That issue is currently in the works.

### Tested with

- sequelize@^6.37.7
- sequelize-typescript@^2.1.6

## Usage Example

```typescript
import { join } from 'path'
import { Sequelize } from "sequelize-typescript";
import { SequelizeTypescriptMigration } from "sequelize-typescript-migration-lts";

const sequelize: Sequelize = new Sequelize({
  // .. options
});

await SequelizeTypescriptMigration.makeMigration(sequelize, {
  outDir: join(__dirname, './migrations'),
  migrationName: "add-awesome-field-in-my-table",
  preview: false,
});
```

If you have these two models and run first makeMigration, it detects all table changes from nothing.

```typescript
@Table
export class CarBrand extends Model<CarBrand> {
  @Column
  name: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  isCertified: boolean;

  @Column
  imgUrl: string;

  @Column
  orderNo: number;

  @Column
  carsCount: number;
}
```

```typescript
@Table
export class Car extends Model<Car> {
  @Column
  name: string;

  @ForeignKey(() => CarBrand)
  @Column
  carBrandId: number;

  @BelongsTo(() => CarBrand)
  carBrand: CarBrand;
}
```

This will generate 00000001-noname.js in migrations path.

```javascript
"use strict";

var Sequelize = require("sequelize");

/**
 * Actions summary:
 *
 * createTable "CarBrands", deps: []
 * createTable "Cars", deps: [CarBrands]
 *
 **/

var info = {
  revision: 1,
  name: "noname",
  created: "2020-04-12T15:49:58.814Z",
  comment: "",
};

var migrationCommands = [
  {
    fn: "createTable",
    params: [
      "CarBrands",
      {
        id: {
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
          type: Sequelize.INTEGER,
        },
        name: {
          type: Sequelize.STRING,
        },
        isCertified: {
          type: Sequelize.BOOLEAN,
        },
        imgUrl: {
          type: Sequelize.STRING,
        },
        orderNo: {
          type: Sequelize.INTEGER,
        },
        carsCount: {
          type: Sequelize.INTEGER,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      },
      {},
    ],
  },

  {
    fn: "createTable",
    params: [
      "Cars",
      {
        id: {
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
          type: Sequelize.INTEGER,
        },
        name: {
          type: Sequelize.STRING,
        },
        carBrandId: {
          onDelete: "NO ACTION",
          onUpdate: "CASCADE",
          references: {
            model: "CarBrands",
            key: "id",
          },
          allowNull: true,
          type: Sequelize.INTEGER,
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      },
      {},
    ],
  },
];

var rollbackCommands = [
  {
    fn: "dropTable",
    params: ["Cars"],
  },
  {
    fn: "dropTable",
    params: ["CarBrands"],
  },
];

module.exports = {
  pos: 0,
  up: function (queryInterface, Sequelize) {
    var index = this.pos;
    return new Promise(function (resolve, reject) {
      function next() {
        if (index < migrationCommands.length) {
          let command = migrationCommands[index];
          console.log("[#" + index + "] execute: " + command.fn);
          index++;
          queryInterface[command.fn]
            .apply(queryInterface, command.params)
            .then(next, reject);
        } else resolve();
      }
      next();
    });
  },
  down: function (queryInterface, Sequelize) {
    var index = this.pos;
    return new Promise(function (resolve, reject) {
      function next() {
        if (index < rollbackCommands.length) {
          let command = rollbackCommands[index];
          console.log("[#" + index + "] execute: " + command.fn);
          index++;
          queryInterface[command.fn]
            .apply(queryInterface, command.params)
            .then(next, reject);
        } else resolve();
      }
      next();
    });
  },
  info: info,
};
```

Run `npx sequelize db:migrate --to 00000001-noname.js` to apply this

## Possible Usage Scenario
Make sure to have writeMigration in your System under development and that sequelize is all set up

If you change a model and re-run the backend there should be a new file under `db/migrations`, but the database won't update automatically. There are easy but important steps:

1) Rename the file's name as well as the content (Info: name), so that everyone knows what this migration is about
2) Migrate your database with `sequelize db:migrate`
3) Re-Serve the backend. You should see no changes.
4) Test the automatically created file's down function with `sequelize db:migrate:undo`
5) If there are any troubles, fix the auto-generated file (ordering!)
6) Run `sequelize db:migrate:undo` and continue your amazing work

## Contributors

- [Manda Ravalison](https://github.com/mandarvl)
- [MohammadMojtaba Roshani](https://github.com/mmRoshani)
- [Anthony Luzquiños](https://github.com/anthonylzq)
- [Alexandr Cherednichenko](https://github.com/alexandr2110pro)
