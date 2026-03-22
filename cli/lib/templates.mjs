import { readdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load all built-in templates from the templates/ directory.
 * Each template must have a template.yaml file.
 */
export async function loadBuiltinTemplates() {
  const templatesDir = resolve(__dirname, "../../templates");
  const entries = await readdir(templatesDir, { withFileTypes: true });
  const templates = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const yamlPath = resolve(templatesDir, entry.name, "template.yaml");
    try {
      const content = await readFile(yamlPath, "utf-8");
      // Simple YAML parsing for name, description, icon fields
      const template = parseSimpleYaml(content);
      template._dir = entry.name;
      template._path = resolve(templatesDir, entry.name);
      templates.push(template);
    } catch {
      // skip directories without template.yaml
    }
  }

  return templates;
}

/**
 * Load a template from an external source (npm, github, or local path).
 */
export async function loadExternalTemplate(spec) {
  // TODO: support npm / github / local path resolution
  throw new Error(`External templates not yet implemented: ${spec}`);
}

/**
 * Minimal YAML parser for template.yaml (handles flat key-value and simple arrays).
 * For production, use js-yaml.
 */
function parseSimpleYaml(content) {
  const result = {};
  for (const line of content.split("\n")) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      let value = match[2].trim();
      // Remove quotes
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      result[match[1]] = value;
    }
  }
  return result;
}
