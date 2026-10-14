import {build} from 'esbuild';
await build({entryPoints:['src/app.js'],bundle:true,format:'esm',outfile:'app/veil.js',minify:true,external:[],legalComments:'eof'});
