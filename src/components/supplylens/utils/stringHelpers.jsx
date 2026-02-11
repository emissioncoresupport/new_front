/**
 * Safe string utilities - null-safe transformations
 */

export const safeStr = (value) => String(value ?? "");

export const safeReplace = (value, search, replacement) => {
  return safeStr(value).replace(search, replacement);
};

export const safeSubstring = (value, start, end) => {
  return safeStr(value).substring(start, end);
};

export const safeToUpperCase = (value) => {
  return safeStr(value).toUpperCase();
};

export const safeToLowerCase = (value) => {
  return safeStr(value).toLowerCase();
};