/**
 * Misc. utility functions to make my life easier
 */

export const includesAny = (source, ...values) => {
  if (!source) return false;

  const found = values.find((value, _, __) => source.includes(value));

  return Boolean(found);
};

export const includesAll = (source, ...values) => {
  if (!source) return false;

  const hasEvery = values.every((value, _, __) => source.includes(value));

  return Boolean(hasEvery);
};

export const assertSuccess = (status) => {
  if (!status.success) {
    console.error(status.output);
    process.exit();
  }
};
