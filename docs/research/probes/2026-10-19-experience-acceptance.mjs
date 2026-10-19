/** Synthetic store/projection costs, not Host/UI/INP. No profile or network access. */
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import os from 'node:os'
import { memoryStore } from '../../../tests/memory-store.ts'
import { getSet } from '../../../src/ops.ts'
import { projectDeck } from '../../../src/client/deck-projection.ts'
import { formatSourceFacts } from '../../../src/client/source-presentation.ts'

const date = '2026-10-19T00:00:00.000Z'
const percentile = (values, fraction) => +[...values].sort((a,b) => a-b)[Math.ceil(values.length*fraction)-1].toFixed(3)
async function measure(operation) {
  for (let i=0;i<5;i++) await operation()
  const times=[]
  for(let i=0;i<30;i++){const start=performance.now();await operation();times.push(performance.now()-start)}
  return {samples:times.length,p50Ms:percentile(times,.5),p95Ms:percentile(times,.95)}
}
const matrix=[]
for (const totalSets of [1,100,1000]) for (const candidates of [6,24,200]) {
  const store=memoryStore()
  for(let s=0;s<totalSets;s++){
    await store.put('sets',`s${s}`,{sessionId:`session${s}`,origin:'user',status:'open',createdAt:date})
    for(let i=0;i<candidates;i++){
      await store.put('sources',`src${s}:${i}`,{title:`Fixture ${i}`,url:`https://example.invalid/${s}/${i}`,origin:'user',dedupeKey:`${s}:${i}`,createdAt:date,meta:{description:'Synthetic description',stars:12345,language:'TypeScript',license:'MIT',pushedAt:date,metadataFetchedAt:date}})
      await store.put('candidates',`c${s}:${i}`,{setId:`s${s}`,sourceId:`src${s}:${i}`,verdict:i%3===0?'kept':'pending',createdAt:date})
    }
  }
  const setId=`s${totalSets-1}`
  const view=await getSet(store,setId)
  assert.equal(view.candidates.length,candidates)
  const projected=projectDeck(view,'all','Fixture')
  assert.equal(projected.shown.length,candidates)
  matrix.push({totalSets,candidates,storeRead:await measure(()=>getSet(store,setId)),projectionAndFacts:await measure(()=>{
    projectDeck(view,'all','Fixture')
    for(const entry of view.candidates)formatSourceFacts(entry.source,'zh-CN')
  })})
}
console.log(JSON.stringify({measuredAtUtc:new Date().toISOString(),kind:'synthetic-in-memory-acceptance',node:process.version,cpu:os.cpus()[0].model,logicalCpus:os.cpus().length,limitations:'No disk, RPC, React, browser paint, Electron, native input or INP. This is not the actual Host history-size matrix.',matrix},null,2))
