import { snakeCase } from "../src/utils/snakeCase";

type Case = { input: string, expected: string }

const cases: Case[] = [
  {
    input: "camelCase",
    expected: "camel_case",
  },
  {
    input: "CamelCase123",
    expected: "camel_case_123",
  },
  {
    input: "__FOO-BAR__123.2CamelCase_",
    expected: "foo_bar_123_2_camel_case",
  },
  {
    input: "Camel2Lower",
    expected: "camel_2_lower",
  },
  {
    input: "CAMELCase",
    expected: "camel_case",
  },
  {
    input: "CAMELCaseWord",
    expected: "camel_case_word",
  },
  {
    input: "camelCASE2Lower",
    expected: "camel_case_2_lower",
  },
  {
    input: "  spaces  here  ",
    expected: "spaces_here",
  },
  {
    input: "foo bar-baz.qux",
    expected: "foo_bar_baz_qux",
  },
];

it.each(cases)("snakeCase($input) should return $expected", ({ input, expected }) => {
  expect(snakeCase(input)).toEqual(expected);
});
