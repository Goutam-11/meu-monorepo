#!/usr/bin/env node
// Static documentation only: never loads application modules, env files or credentials.
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const ts=createRequire(path.join(root,'meu_frontend/package.json'))('typescript');
const roots=['meu_frontend/src','meu/schedulerService/src','meu/notificationService/src','shared/trading'];
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){
 if(['generated','node_modules','tests','test','.next'].includes(entry.name))continue;
 const full=path.join(dir,entry.name);
 if(entry.isDirectory())walk(full);else if(/\.(?:ts|tsx)$/.test(entry.name)&&!entry.name.endsWith('.d.ts'))files.push(full);
}}
for(const dir of roots)walk(path.join(root,dir));
files.push(path.join(root,'meu/schedulerService/index.ts'));
const configs=new Map();
for(const project of ['meu_frontend','meu/schedulerService','meu/notificationService']){
 const name=path.join(root,project,'tsconfig.json'),loaded=ts.readConfigFile(name,ts.sys.readFile);
 if(loaded.error)throw new Error(`Cannot read ${project}/tsconfig.json`);
 const config=ts.parseJsonConfigFileContent(loaded.config,ts.sys,path.dirname(name));
 configs.set(project,config.options);
}
const relative=file=>path.relative(root,file).split(path.sep).join('/');
const anchor=file=>'file-'+createHash('sha1').update(relative(file)).digest('hex').slice(0,12);
const sourcePath=file=>relative(file).replaceAll('(', '%28').replaceAll(')', '%29');
const sourceLink=(file,line)=>`[${relative(file)}${line?':'+line:''}](../../${sourcePath(file)}${line?'#L'+line:''})`;
function options(file){for(const [project,config] of configs)if(file.startsWith(path.join(root,project)+path.sep))return config;return {};}
function resolve(spec,file){return ts.resolveModuleName(spec,file,options(file),ts.sys).resolvedModule?.resolvedFileName;}
const rows=files.sort().map(file=>{
 const source=ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
 const imports=new Map(),external=new Set(),functions=[];
 function imported(spec){const target=resolve(spec,file);if(target&&target.startsWith(root+path.sep)&&!target.includes('/node_modules/'))imports.set(spec,target);else external.add(spec);}
 function visit(node){
  if((ts.isImportDeclaration(node)||ts.isExportDeclaration(node))&&node.moduleSpecifier&&ts.isStringLiteral(node.moduleSpecifier))imported(node.moduleSpecifier.text);
  if(ts.isCallExpression(node)&&(node.expression.kind===ts.SyntaxKind.ImportKeyword||(ts.isIdentifier(node.expression)&&node.expression.text==='require'))&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0]))imported(node.arguments[0].text);
  let name;
  if(ts.isFunctionDeclaration(node)||ts.isMethodDeclaration(node))name=node.name?.getText(source)??(ts.isFunctionDeclaration(node)?'default':undefined);
  if((ts.isArrowFunction(node)||ts.isFunctionExpression(node))&&(ts.isVariableDeclaration(node.parent)||ts.isPropertyAssignment(node.parent)))name=node.parent.name?.getText(source);
  if(name){
   const calls=new Set();
   function called(child){if(child!==node&&(ts.isFunctionDeclaration(child)||ts.isArrowFunction(child)||ts.isFunctionExpression(child)||ts.isMethodDeclaration(child)))return;
    if(ts.isCallExpression(child)){const expression=child.expression.getText(source);if(/^[\w.$!?]+$/.test(expression))calls.add(expression);}
    ts.forEachChild(child,called);
   }
   called(node);
   functions.push({name,line:source.getLineAndCharacterOfPosition(node.getStart(source)).line+1,calls:[...calls].sort()});
  }
  ts.forEachChild(node,visit);
 }
 visit(source);
 return {file,imports,external,functions};
});
const known=new Set(files);
const importers=new Map();
for(const row of rows)for(const target of new Set(row.imports.values())){
 if(!importers.has(target))importers.set(target,[]);
 importers.get(target).push(row.file);
}
const lines=['# Generated source and function index','','Generated from repository source by `bun scripts/generate-code-map.mjs`. This generator reads TypeScript syntax; it never imports the application or reads environment files.','','## Scope and limits','','This index lists static imports, literal dynamic imports and named functions/methods for the four source areas. Direct call expressions are recorded per named function; nested named functions get separate rows. Anonymous callbacks, runtime provider/strategy registries, framework routing and database relationships cannot be inferred reliably from syntax. Calls such as `safety.executeOrder` or `prisma.agent.update` name an interface/member, not a proven implementation. Read the curated [module map](../MODULES.md) and [architecture flows](../ARCHITECTURE.md) for those boundaries. Generated clients, dependencies and tests are excluded. Stubs/experimental source are included; presence is not proof that an entry point invokes them.','','## File index','','| Source | Named functions | Local dependency files |','|---|---:|---:|'];
for(const row of rows)lines.push(`| [${relative(row.file)}](#${anchor(row.file)}) | ${row.functions.length} | ${row.imports.size} |`);
for(const row of rows){
 lines.push('',`<a id="${anchor(row.file)}"></a>`,'',`## ${relative(row.file)}`,'',sourceLink(row.file),'');
 if(row.imports.size){lines.push('### Internal dependencies','','| Import / re-export | Source target |','|---|---|');for(const [spec,target] of [...row.imports].sort())lines.push(`| \`${spec}\` | ${known.has(target)?`[${relative(target)}](#${anchor(target)})`:sourceLink(target)} |`);lines.push('');}
 if(importers.has(row.file))lines.push('### Imported by','',''+importers.get(row.file).map(file=>`- [${relative(file)}](#${anchor(file)})`).join('\n'),'');
 if(row.external.size)lines.push('External or unresolved imports: '+[...row.external].sort().map(s=>'`'+s+'`').join(', ')+'.','');
 if(row.functions.length){lines.push('### Named functions and direct calls','','| Function / method | Source line | Direct calls (syntax only) |','|---|---|---|');for(const fn of row.functions)lines.push(`| \`${fn.name}\` | [${fn.line}](../../${sourcePath(row.file)}#L${fn.line}) | ${fn.calls.map(call=>'`'+call+'`').join(', ')||'—'} |`);}
 else lines.push('No named function bodies in this file. Constants, schemas, types or framework-created handlers may still define its behavior.');
}
const output=path.join(root,'docs/reference/CODE_MAP.md');
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,lines.join('\n')+'\n');
console.log(`Wrote docs/reference/CODE_MAP.md: ${rows.length} source files, ${rows.reduce((n,r)=>n+r.functions.length,0)} named functions/methods.`);
