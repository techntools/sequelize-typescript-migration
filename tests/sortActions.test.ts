import sortActions from '../src/utils/sortActions'
import type { IAction } from '../src/utils/getDiffActionsFromTables'


function names(actions: IAction[]): string[] {
  return actions.map((a) => a.tableName)
}

it('orders dropTable so child tables drop before their parents', () => {
  // Children (tables with outgoing FKs) must drop before parents.
  const input: IAction[] = [
    { actionType: 'dropTable', tableName: 'Owners',    depends: ['CarBrands'] },
    { actionType: 'dropTable', tableName: 'CarBrands', depends: ['Cars'] },
    { actionType: 'dropTable', tableName: 'Cars',      depends: [] },
  ]
  const order = names(sortActions(input))
  expect(order).toEqual(['Cars', 'CarBrands', 'Owners'])
})

it('orders createTable so parents are created before children', () => {
  // Parents (tables referenced by FKs) must come first.
  const input: IAction[] = [
    { actionType: 'createTable', tableName: 'Cars',      depends: ['CarBrands'] },
    { actionType: 'createTable', tableName: 'CarBrands', depends: ['Owners'] },
    { actionType: 'createTable', tableName: 'Owners',    depends: [] },
  ]
  const order = names(sortActions(input))
  expect(order).toEqual(['Owners', 'CarBrands', 'Cars'])
})

it('breaks a 2-node FK cycle by appending the cycle in input order', () => {
  // A and B both reference each other. Kahn can place neither first, so the
  // cycle fallback appends them after any acyclic node (here, C).
  const input: IAction[] = [
    { actionType: 'changeColumn', tableName: 'A', depends: ['B'] },
    { actionType: 'changeColumn', tableName: 'B', depends: ['A'] },
    { actionType: 'changeColumn', tableName: 'C', depends: [] },
  ]
  const order = names(sortActions(input))
  expect(order).toEqual(['C', 'A', 'B'])
})

it('breaks a 3-node FK cycle by appending the cycle in input order', () => {
  const input: IAction[] = [
    { actionType: 'addColumn', tableName: 'A', depends: ['B'] },
    { actionType: 'addColumn', tableName: 'B', depends: ['C'] },
    { actionType: 'addColumn', tableName: 'C', depends: ['A'] },
    { actionType: 'addColumn', tableName: 'D', depends: [] },
  ]
  const order = names(sortActions(input))
  expect(order).toEqual(['D', 'A', 'B', 'C'])
})

it('sorts a realistic Cars/CarBrands/Owners up migration', () => {
  // createTables first (parents before children), then addIndexes (each
  // depends on its own table, so they preserve input order).
  const input: IAction[] = [
    { actionType: 'createTable', tableName: 'Cars',
      attributes: { carBrandId: { references: { model: 'CarBrands' } } },
      options: {}, depends: ['CarBrands'] },
    { actionType: 'createTable', tableName: 'CarBrands',
      attributes: { ownerId: { references: { model: 'Owners' } } },
      options: {}, depends: ['Owners'] },
    { actionType: 'createTable', tableName: 'Owners',
      attributes: { email: {} }, options: {}, depends: [] },
    { actionType: 'addIndex', tableName: 'Owners',
      fields: ['email'], depends: ['Owners'] },
    { actionType: 'addIndex', tableName: 'CarBrands',
      fields: ['ownerId'], depends: ['CarBrands'] },
  ]
  const order = names(sortActions(input))
  expect(order).toEqual([
    'Owners',
    'CarBrands',
    'Cars',
    'Owners',
    'CarBrands',
  ])
})

it('sorts a realistic Cars/CarBrands/Owners down migration', () => {
  // dropTable: each depends on tables that reference it, so children
  // (Cars) drop first.
  const input: IAction[] = [
    { actionType: 'dropTable', tableName: 'Cars',      depends: [] },
    { actionType: 'dropTable', tableName: 'CarBrands', depends: ['Cars'] },
    { actionType: 'dropTable', tableName: 'Owners',    depends: ['CarBrands'] },
  ]
  const order = names(sortActions(input))
  expect(order).toEqual(['Cars', 'CarBrands', 'Owners'])
})

it('counts a duplicate depends entry as one predecessor', () => {
  // A has two FK columns pointing at B, so depends = [B, B]. The single
  // true edge is B -> A; A must not be left stranded by an inflated
  // in-degree.
  const input: IAction[] = [
    { actionType: 'createTable', tableName: 'A',
      attributes: { aToB1: { references: { model: 'B' } }, aToB2: { references: { model: 'B' } } },
      options: {}, depends: ['B', 'B'] },
    { actionType: 'createTable', tableName: 'B', attributes: {}, options: {}, depends: [] },
  ]
  const order = names(sortActions(input))
  expect(order).toEqual(['B', 'A'])
})

it('counts duplicate depends across multiple targets once each', () => {
  // A depends on [B, C, B]; the duplicate 'B' must not double-count.
  // Combined with C depending on B, A has exactly two predecessors.
  const input: IAction[] = [
    { actionType: 'createTable', tableName: 'A',
      attributes: { x: { references: { model: 'B' } }, y: { references: { model: 'C' } } },
      options: {}, depends: ['B', 'C', 'B'] },
    { actionType: 'createTable', tableName: 'B', attributes: {}, options: {}, depends: [] },
    { actionType: 'createTable', tableName: 'C',
      attributes: { z: { references: { model: 'B' } } }, options: {}, depends: ['B', 'B'] },
  ]
  const order = names(sortActions(input))
  expect(order).toEqual(['B', 'C', 'A'])
})

it('breaks a self-referencing FK cycle on Employees', () => {
  // Employees.managerId -> Employees forms a 2-node cycle in the
  // changeColumn bucket. The unrelated Departments createTable goes first;
  // the two Employees changeColumns are appended in input order.
  const input: IAction[] = [
    { actionType: 'changeColumn', tableName: 'Employees',
      attributeName: 'managerId', options: { references: { model: 'Employees' } },
      depends: ['Employees', 'Employees'] },
    { actionType: 'changeColumn', tableName: 'Employees',
      attributeName: 'title', options: {}, depends: ['Employees'] },
    { actionType: 'createTable', tableName: 'Departments',
      attributes: { name: {} }, options: {}, depends: [] },
    { actionType: 'addIndex', tableName: 'Employees',
      fields: ['managerId'], depends: ['Employees'] },
    { actionType: 'addIndex', tableName: 'Departments',
      fields: ['name'], depends: ['Departments'] },
  ]
  const order = names(sortActions(input))
  expect(order).toEqual([
    'Departments',
    'Employees',
    'Employees',
    'Employees',
    'Departments',
  ])
})