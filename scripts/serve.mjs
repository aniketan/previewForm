import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const contentTypes = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".map": "application/json" };

createServer((request, response) => {
  const requested = request.url === "/" ? "/index.html" : request.url.split("?")[0];
  const file = normalize(join(root, requested));
  if (!file.startsWith(root) || !statSync(file, { throwIfNoEntry: false })) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }
  response.writeHead(200, { "Content-Type": contentTypes[extname(file)] || "application/octet-stream" });
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1", () => console.log(`PreviewForm demo listening on ${port}`));
