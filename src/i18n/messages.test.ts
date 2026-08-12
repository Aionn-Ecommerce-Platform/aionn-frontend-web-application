import { describe, expect, it } from "vitest";
import en from "./messages/en.json";
import vi from "./messages/vi.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      out.set(path, value);
    } else {
      for (const [nested, nestedValue] of flatten(value, path)) {
        out.set(nested, nestedValue);
      }
    }
  }
  return out;
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined)
    .sort();
}

const viFlat = flatten(vi as Tree);
const enFlat = flatten(en as Tree);

describe("i18n message files", () => {
  it("have the same set of keys", () => {
    const missingInEn = [...viFlat.keys()].filter((k) => !enFlat.has(k));
    const missingInVi = [...enFlat.keys()].filter((k) => !viFlat.has(k));

    expect({ missingInEn, missingInVi }).toEqual({
      missingInEn: [],
      missingInVi: [],
    });
  });

  it("have no empty values", () => {
    const empty = [...viFlat, ...enFlat]
      .filter(([, value]) => value.trim() === "")
      .map(([key]) => key);

    expect(empty).toEqual([]);
  });

  it("use the same placeholders in both locales", () => {
    const mismatched: string[] = [];
    for (const [key, viText] of viFlat) {
      const enText = enFlat.get(key);
      if (enText === undefined) continue;
      const viVars = placeholders(viText).join(",");
      const enVars = placeholders(enText).join(",");
      if (viVars !== enVars) {
        mismatched.push(`${key}: vi=[${viVars}] en=[${enVars}]`);
      }
    }

    expect(mismatched).toEqual([]);
  });
});
