const esbuild=require('esbuild');
esbuild.buildSync({entryPoints:['main.js'],bundle:true,minify:true,format:'iife',target:'es2020',outfile:'../app.js',legalComments:'eof'});
