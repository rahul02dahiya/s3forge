import fs from 'fs';
import path from 'path';
import { generateOpenApiDocument } from '../src/config/swagger.js';
import '../src/routes/index.js';

const spec = generateOpenApiDocument();
fs.writeFileSync(path.join(process.cwd(), 'openapi.json'), JSON.stringify(spec, null, 2));
console.log('Generated openapi.json successfully.');
