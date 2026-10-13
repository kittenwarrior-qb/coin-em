// Opt-in synthetic shell regression, network-disabled owned Ubuntu container.
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtemp, mkdir, writeFile, copyFile, readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { strict as assert } from 'node:assert'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..')
const owned=await mkdtemp(path.join(os.tmpdir(),'emcoin-web-update-qa-'))
const old='1'.repeat(40),next='2'.repeat(40)
const cases=['success','occupied','race','storage-unavailable','backend-change','config-change','bad-checksum','https-failure']
const results=[]
for(const scenario of cases) {
 const fixture=path.join(owned,scenario),app=path.join(fixture,'app'),stubs=path.join(fixture,'stubs'),archive=path.join(fixture,'archive')
 for(const folder of [stubs,path.join(app,'shared'),path.join(app,'test-state'),path.join(app,'releases',old,'deploy/emcoin'),path.join(app,'incoming',next),path.join(archive,'deploy/emcoin')])await mkdir(folder,{recursive:true})
 await writeFile(path.join(app,'shared/.deploy-ready'),'synthetic approval\n')
 await writeFile(path.join(app,'shared/.env'),'EMCOIN_DOMAIN=synthetic.invalid\n',{mode:0o600})
 await writeFile(path.join(app,'test-state/data-sentinel'),'catalog-and-room-data-unchanged')
 for(const file of ['runtime.yml','Caddyfile']) {
  await copyFile(path.join(root,'deploy/emcoin',file),path.join(app,'releases',old,'deploy/emcoin',file))
  await copyFile(path.join(root,'deploy/emcoin',file),path.join(archive,'deploy/emcoin',file))
 }
 if(scenario==='config-change')await writeFile(path.join(archive,'deploy/emcoin/Caddyfile'),'different-config\n')
 for(const command of ['docker','curl','sleep'])await copyFile(path.join(root,'be/tests/fixtures',`web-update-${command}.sh`),path.join(stubs,command))
 const incoming=path.join(app,'incoming',next)
 execFileSync('tar',['-czf',path.join(incoming,'release-config.tar.gz'),'-C',archive,'deploy'],{windowsHide:true})
 await writeFile(path.join(incoming,'release-images.tar.gz'),'synthetic image archive; Docker is mocked')
 const sums=[];for(const file of ['release-config.tar.gz','release-images.tar.gz'])sums.push(`${createHash('sha256').update(await readFile(path.join(incoming,file))).digest('hex')}  ${file}`)
 await writeFile(path.join(incoming,'SHA256SUMS'),sums.join('\n')+'\n')
 if(scenario==='bad-checksum')await writeFile(path.join(incoming,'release-images.tar.gz'),'corrupted owned fixture')
 const args=['run','--rm','--network','none','--read-only','--label','emcoin.qa=web-update','-e',`TEST_CASE=${scenario}`,'--mount',`type=bind,source=${app},target=/opt/emcoin`,'--mount',`type=bind,source=${stubs},target=/stubs,readonly`,'--mount',`type=bind,source=${path.join(root,'deploy/emcoin/deploy-web-update.sh')},target=/tested-update.sh,readonly`,'ubuntu:24.04','bash','-c',`chmod 600 /opt/emcoin/shared/.env; ln -s /opt/emcoin/releases/${old} /opt/emcoin/current; PATH=/stubs:$PATH bash /tested-update.sh ${next}; result=$?; printf '\nQA_POINTER=%s\n' "$(readlink /opt/emcoin/current)"; exit "$result"`]
 // Stubs are immutable mounted scripts; permissions are set through Docker's
 // filesystem view before switching the root readonly path to those tools.
 const prepare=spawnSync('docker',['run','--rm','--network','none','--label','emcoin.qa=web-update-stub','--mount',`type=bind,source=${stubs},target=/stubs`,'ubuntu:24.04','chmod','755','/stubs/docker','/stubs/curl','/stubs/sleep'],{encoding:'utf8',windowsHide:true})
 assert.equal(prepare.status,0,prepare.stderr)
 const run=spawnSync('docker',args,{encoding:'utf8',windowsHide:true})
 assert.equal(run.status,scenario==='success'?0:1,`${scenario}: ${run.stderr}\n${run.stdout}`)
 assert.equal(await readFile(path.join(app,'test-state/data-sentinel'),'utf8'),'catalog-and-room-data-unchanged')
 // Read Linux symlinks inside their owning filesystem, not Windows Node's
 // readlink against a Docker Desktop bind-mount representation.
 assert.ok(run.stdout.includes(`QA_POINTER=/opt/emcoin/releases/${scenario==='success'?next:old}`))
 const events=await readFile(path.join(app,'test-state/events'),'utf8').catch(()=> '')
 const rollback=scenario==='race'||scenario==='https-failure'
 if(rollback)assert.ok(events.includes(`up-emcoin/web:${old}`))
 if(scenario==='success')assert.ok(events.includes(`up-emcoin/web:${next}`))
 if(['occupied','storage-unavailable','backend-change','config-change','bad-checksum'].includes(scenario))assert.ok(!events.includes('stop-web'))
 results.push({scenario,result:'passed',frozen:events.includes('stop-web'),restored:rollback})
}
await writeFile(path.join(owned,'report.json'),JSON.stringify({results,scope:'Network-disabled owned container; Docker/curl/sleep mocked; not live Redis, admission concurrency, TLS or timing certification'},null,2))
console.log(JSON.stringify({results,evidence:owned}))
