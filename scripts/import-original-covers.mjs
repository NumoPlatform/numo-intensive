import {execFileSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,mkdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const dir=mkdtempSync(join(tmpdir(),'numo-covers-'));
try {
 const zip=join(dir,'covers.zip');
 execFileSync('curl',['--fail','--location','--retry','3','--max-time','90','-o',zip,'https://d2ol7oe51mr4n9.cloudfront.net/user_387CgECRaZUrXUVQQOH52f4rZ37/f985197c-ebb6-4b19-92ed-1e12d4e880cd.zip']);
 if(createHash('sha256').update(readFileSync(zip)).digest('hex')!=='46002f4c4f7b9bcb9021774f964486523d830812552de106b7d20057431a6406') throw Error('Cover archive checksum mismatch');
 mkdirSync('public/covers',{recursive:true});
 for(const code of ['gr101','gr111','gr112','gr118','ar111','ar112']){
 const path='public/covers/'+code+'-2026.webp';
 const bytes=execFileSync('unzip',['-p',zip,path]);
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WEBP') throw Error('Invalid cover '+code);
 writeFileSync(path,bytes);
 }
} finally {rmSync(dir,{recursive:true,force:true});}
