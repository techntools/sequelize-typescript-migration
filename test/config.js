const { TEST_DATABASE } = require('./constant')

module.exports = {

  // test_{dialect} needed to pass to sequelize-cli

  test_mysql: {
    username: 'santosh',
    password: 'Sant0sh',
    database: TEST_DATABASE,
    dialect: 'mysql'
  },

  test_postgres: {
    username: 'santosh',
    password: 'Sant0sh',
    database: TEST_DATABASE,
    dialect: 'postgres'
  },

}
