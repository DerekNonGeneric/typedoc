import { ok } from "assert";
import { ReflectionKind } from "../../lib/models/index.js";
import { getEnumKeys } from "#utils";

describe("Enum utils", () => {
    it("Should be able to get enum keys", () => {
        const keys = getEnumKeys(ReflectionKind);
        ok(keys.includes("Project"));
        ok(!keys.includes("SignatureContainer"));
    });
});
