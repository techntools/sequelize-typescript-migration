import { fn } from 'sequelize'
import {
  Table,
  Column,
  Default,
  DataType,
  Model,
  ForeignKey,
  BelongsTo,
  Index,
} from 'sequelize-typescript'


@Table({
  indexes: [
    {
      fields: ['regNo'],
      unique: true
    }
  ]
})
export class CarBrand extends Model {
  @Column({
    unique: 'carBrandName'
  })
  declare name: string;

  @Default(true)
  @Column(DataType.BOOLEAN)
  declare isCertified: boolean;

  @Column
  declare imgUrl: string;

  @Column
  declare regNo: number;

  @Column
  declare orderNo: number;

  @Column
  declare carsCount: number;
}

@Table({
  tableName: 'CarBrands',
  indexes: [
    {
      fields: ['imgUrl'],
      unique: true,
    }
  ]
})
export class CarBrandWithUniqueImg extends CarBrand {
  @Column
  declare imgUrl: string;
}

export class CarBrandWithStringOrderNumber extends CarBrand {
  @Column({
    type: DataType.STRING
  })
  declare orderNo;
}

@Table
export class Owner extends Model {
  @Column
  declare name: string;
}

@Table
export class OwnerWithStyle extends Model {
  @Column
  declare name: string;
}

export class CarBrandWithOwnerId extends CarBrand {
  @Column({
    unique: true
  })
  declare ownerId: number;
}

@Table({
  tableName: 'CarBrands'
})
export class CarBrandWithOwnerReference extends CarBrand {
  @ForeignKey(() => Owner)
  @Column
  declare ownerId: number;

  @BelongsTo(() => Owner)
  declare owner: Owner;
}

@Table({
  tableName: 'CarBrands'
})
export class CarBrandWithNonNullOwnerReference extends CarBrand {
  @ForeignKey(() => Owner)
  @Column({
    allowNull: false
  })
  declare ownerId: number;

  @BelongsTo(() => Owner)
  declare owner: Owner;
}

@Table({
  tableName: 'CarBrands'
})
export class CarBrandWithStylishOwnerReference extends CarBrand {
  @ForeignKey(() => OwnerWithStyle)
  @Column
  declare ownerId: number;

  @BelongsTo(() => OwnerWithStyle)
  declare owner: OwnerWithStyle;
}

@Table({
  tableName: 'CarBrands'
})
export class CarBrandWithEmail extends CarBrand {
  @Column
  declare email: string;
}

@Table({
  tableName: 'CarBrands'
})
export class CarBrandWithUniqueEmail extends CarBrand {
  @Column({
    unique: true
  })
  declare email: string;
}

@Table({
  tableName: 'CarBrands'
})
export class CarBrandWithRequiredRegNo extends CarBrand {
  @Column({
    allowNull: false
  })
  declare regNo: number;
}

@Table({
  tableName: 'CarBrands'
})
export class CarBrandIsCertifiedDefaultRemoved extends CarBrand {
  @Column(DataType.BOOLEAN)
  declare isCertified: boolean;
}

@Table({
  tableName: 'CarBrands'
})
export class CarBrandWithoutModification extends CarBrand {
  @Column
  declare carsCount: number;
}

@Table
export class Car extends Model {
  @Column
  declare name: string;

  @ForeignKey(() => CarBrand)
  @Column
  declare carBrandId: number;

  @BelongsTo(() => CarBrand)
  declare carBrand: CarBrand;

  @Column(DataType.TEXT)
  declare description: string;

  @Column(DataType.TEXT('tiny'))
  declare info: string;

  @Column(DataType.VIRTUAL)
  declare nameAndBrand: string;

  @Column(DataType.DECIMAL)
  declare rating: number;

  @Column(DataType.ENUM('BAD', 'Good', 'Great'))
  declare ratingName: string;

  @Column(DataType.BLOB('long'))
  declare manual: string;
}

@Table({
  indexes: [
    {
      fields: ['story'],
      type: 'FULLTEXT',  // mysql only
      parser: 'ngram'
    }
  ]
})
export class CarWithStory extends Model {
  @Column
  declare name: string;

  @Column({
    type: DataType.TEXT
  })
  declare story: string;
}

@Table({
  tableName: 'Cars'
})
export class CarWithSparePart extends Car {
  @Column(DataType.ARRAY(DataType.STRING))
  declare cameras: string[];

  @Column(DataType.RANGE(DataType.DATEONLY))
  declare engineLife: [string, string];
}

/*
 * From https://github.com/mandarvl/sequelize-typescript-example/blob/main/src/app/contact.model.ts
 */
@Table
export class Contact extends Model {
  @Column({
    primaryKey: true,
    autoIncrement: true,
  })
  declare id: number;

  @Column({
    allowNull: false
  })
  declare name: string;

  @Column({
    allowNull: true,
    unique: true
  })
  declare phone: string;

  @Column({
    allowNull: true,
    unique: true
  })
  declare email: string;

  @Column({
    allowNull: false
  })
  declare isActive: boolean;

  @Column({
    allowNull: false,
    defaultValue: 1
  })
  declare points: number;

  @Column({
    allowNull: false,
    defaultValue: false
  })
  declare isVerified: boolean;
}

@Table
export class Squad extends Model {
  @Column(DataType.STRING(13))
  declare name: string;

  @Column(DataType.CHAR(2))
  declare badge: string;

  @Column(DataType.CHAR().BINARY)
  declare flag: string;
}

@Table
export class TestDefaultValue extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV1,
  })
  declare fieldUUIDV1: string;

  @Column({
    type: DataType.UUID,
    defaultValue: DataType.UUIDV4,
  })
  declare fieldUUIDV4: string;

  @Column({
    type: DataType.DATE,
    defaultValue: DataType.NOW,
  })
  declare fieldNOW: string;

  @Column({
    type: DataType.DATE,
    defaultValue: () => {
      return '2025-12-22T13:11:32.183Z'
    },
  })
  declare fieldDefaultByFn: string;
}

@Table
export class TestDefaultValueWithFn extends Model {
  @Column({
    type: DataType.UUID,
    defaultValue: fn('gen_random_uuid'),
  })
  declare fieldUUID: string;
}

@Table
export class Place extends Model {
  @Index({ type: 'SPATIAL' })
  @Column({
    type: DataType.GEOMETRY('POINT', 4326),
    allowNull: false
  })
  declare location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}

@Table
export class PlaceWithParadise extends Model {
  @Index({ using: 'GIST' })
  @Column({
    type: DataType.GEOMETRY('POINT', 4326),
    allowNull: false
  })
  declare entry: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };

  @Index({ using: 'GIST' })
  @Column({
    type: DataType.GEOGRAPHY('POINT', 4326),
    allowNull: false
  })
  declare location: {
    type: 'Point';
    coordinates: [number, number]; // [lng, lat]
  };
}
