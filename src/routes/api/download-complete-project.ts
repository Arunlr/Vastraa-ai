import { createFileRoute } from "@tanstack/react-router";
import fs from "fs";
import path from "path";
import JSZip from "jszip";

function walkDir(dir: string, baseDir: string, zip: JSZip) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const relativePath = path.relative(baseDir, fullPath);
    
    // Skip large generated folders, lockfiles during copy, cache directories, and reference backups
    if (
      file === "node_modules" ||
      file === ".git" ||
      file === ".output" ||
      file === ".vinxi" ||
      file === "dist" ||
      file === ".tanstack" ||
      file === ".nitro" ||
      file === "bun.lock" ||
      file === ".lovable" ||
      file === "remix-of-remix-of-remix-of-remix-of-remix-of-vastraai-your-indian-style-ai-main"
    ) {
      continue;
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, baseDir, zip);
    } else {
      const content = fs.readFileSync(fullPath);
      zip.file(relativePath.replace(/\\/g, "/"), content);
    }
  }
}

export const Route = createFileRoute("/api/download-complete-project")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const zip = new JSZip();
          walkDir(process.cwd(), process.cwd(), zip);
          
          const content = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
          
          return new Response(content, {
            status: 200,
            headers: {
              "Content-Type": "application/zip",
              "Content-Disposition": 'attachment; filename="vastraai-complete-source.zip"',
              "Cache-Control": "no-cache",
            },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: "Failed to generate ZIP", message: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }
  }
});
