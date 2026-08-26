import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const sharp=require('sharp');

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const input=path.join(root,'bali-kelingking.jpg');
await Promise.all([
  sharp(input).resize({width:640,withoutEnlargement:true}).webp({quality:76}).toFile(path.join(root,'bali-kelingking-640.webp')),
  sharp(input).resize({width:1280,withoutEnlargement:true}).webp({quality:80}).toFile(path.join(root,'bali-kelingking-1280.webp')),
  sharp(input).resize({width:1280,withoutEnlargement:true}).jpeg({quality:78,mozjpeg:true}).toFile(path.join(root,'bali-kelingking-fallback.jpg'))
]);
console.log('Responsive cover images built');
