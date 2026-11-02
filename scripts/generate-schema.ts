import { writeFileSync } from "node:fs";
import { documentSchema } from "../packages/core/src/schema.js";

writeFileSync(
  new URL("../spec/schemas/document.schema.json", import.meta.url),
  `${JSON.stringify(documentSchema, null, 2)}\n`,
);
