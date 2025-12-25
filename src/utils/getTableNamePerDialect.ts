export default function getTableNamePerDialect(dialect: string, name: string) {
  if (dialect == 'postgres')
    return `"${name}"`

  return name
}
