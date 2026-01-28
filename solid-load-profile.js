import {sym,parse,graph} from "https://esm.sh/rdflib";
import {authn,store} from "https://esm.sh/solid-logic";
import {ns} from "https://esm.sh/solid-ui";
const fetcher = store.fetcher;

export {store};

async function doLoad(url,fetcher){
  fetcher ||= store.fetcher;
  try {
    await fetcher.load( url, {
      headers: {accept:'text/turtle,application/ld+json'},
      withCredentials:false,
    });
    return true;
  }
  catch(e){ console.log('fetch-error: ',url,e); return false; }
}
export async function loadProfile(webid){
  let loggedIn = authn.currentUser();
  let isOwner = loggedIn && loggedIn.value === (webid.value || webid);
  const webidNode = webid.value ?webid :sym(webid);
  const profile = {};
  /* LOAD WEBID-DOCUMENT
  */
    let response = await doLoad(webid);
    if(!response) return null;
  /* LOAD PREFERENCES FILE (if permissioned)
  */
    if(isOwner){
      const prefs = store.each( webidNode, ns.space('preferencesFile') );
      for(let p of prefs){
        try { await doLoad(p) } catch(e){}
      }
    }

  /* FETCH SEE-ALSOs & PRIMARY-TOPIC-OF
  */
    const primaryTopic = store.each( webidNode, ns.foaf('primaryTopicOf') );
    let extended = store.each( webidNode, ns.rdfs('seeAlso') );
    extended = extended.concat(primaryTopic);
    for(let e of extended){
      try { await doLoad(e) } catch(e) { console.log(e) }
    }

    /* CREATE A SUMMARY OBJECT & RETURN IT
    */
  const profileObj = {
    webid,
    "solid:oidcIssuer"  : fetchPredicate( webidNode, ns.solid('oidcIssuer'),store ),
    "space:storage" : fetchPredicate( webidNode, ns.space('storage'),store ),
    "ldp:inbox" : fetchPredicate( webidNode, ns.ldp('inbox'),store ),
    "space:preferencesFile" : fetchPredicate( webidNode, ns.space('preferencesFile'),store ),
    "solid:publicTypeIndex" : fetchPredicate( webidNode, ns.solid('publicTypeIndex'),store ),
    "solid:privateTypeIndex" : fetchPredicate( webidNode, ns.solid('privateTypeIndex'),store ),
    "rdfs:seeAlso" : fetchPredicate( webidNode, ns.rdfs('seeAlso'),store ),
    "solid:typeRegistration" : await fetchRegistrations(webidNode,'public',isOwner,store),
    "owl:sameAs" : fetchPredicate( webidNode, ns.owl('sameAs'),store ),
    "foaf:primaryTopicOf" : fetchPredicate( webidNode, ns.foaf('primaryTopicOf'),store ),
    "interop:hasAuthorizationAgent" : fetchPredicate( webidNode, sym('http://www.w3.org/ns/solid/interop#hasAuthorizationAgent'),store ),
  }
  if(isOwner){
    profileObj.privateTypeRegistrations = await fetchRegistrations(webidNode,'private',store);
  }
  let visited = {};
  for(let k of Object.keys(profileObj)){
    if(profileObj[k] && profileObj[k].length==0 ) {
      delete profileObj[k];
    }
    visited[k]=true;
  }
  const all = store.match(webidNode);
  for(let a of all){
    if(a.graph.value=="chrome://TheCurrentSession") continue;
    let key = getCurie(a.predicate.value);
    const these = store.each(webidNode,a.predicate);
    profileObj[key] ||= new Array();
    if(visited[key]) continue;
    visited[key] = true;
    for(let t of these){
      let value = t.value;
      if(key=="acl:trustedApp"){
        let stmts = store.each(t,ns.acl('origin'));
        for(let s of stmts){
          value = s.value ;
        }
      }
      else if(t.termType=="BlankNode"){
        value = [];
        for(let v of store.match(t)){
          let pred = getCurie(v.predicate.value);
          value.push( {[pred]:v.object.value} );
        }
       
      }
      else if(t.termType=="Collection"){
         value = [];
         for(let e of t.elements){
           let triple = store.match(e);
           for(let tr of triple){
             let pred = getCurie(tr.predicate.value);
             value.push({ [pred] : tr.object.value });
           }
         }
      }
      if(profileObj[key].push && value && value.length) profileObj[key].push( value );
    }
    if(profileObj[key].length==1 ) profileObj[key] = profileObj[key][0] 
  }
  return(profileObj);
}

function getCurie(key){
    if(key.startsWith('http://www.w3.org/ns/solid/terms#')){
       key="solid:"+key.replace('http://www.w3.org/ns/solid/terms#','');
    }
    else if(key.startsWith('http://www.w3.org/ns/pim/space#')){
       key="space:"+key.replace('http://www.w3.org/ns/pim/space#','');
    } 
    else if(key.startsWith('http://www.w3.org/2006/vcard/ns#')){
       key="vcard:"+key.replace('http://www.w3.org/2006/vcard/ns#','');
    } 
    else if(key.startsWith('http://xmlns.com/foaf/0.1/')){
       key="foaf:"+key.replace('http://xmlns.com/foaf/0.1/','');
    } 
    else if(key.startsWith('http://www.w3.org/1999/02/22-rdf-syntax-ns#')){
       key="rdf:"+key.replace('http://www.w3.org/1999/02/22-rdf-syntax-ns#','');
    } 
    else if(key.startsWith('http://www.w3.org/ns/ldp#')){
       key="ldp:"+key.replace('http://www.w3.org/ns/ldp#','');
    } 
    else if(key.startsWith('http://www.w3.org/ns/auth/acl#')){
       key="acl:"+key.replace('http://www.w3.org/ns/auth/acl#','');
    } 
    else if(key.startsWith('https://www.w3.org/ns/activitystreams#')){
       key="activitystreams:"+key.replace('https://www.w3.org/ns/activitystreams#','');
    } 
    else if(key.startsWith('http://www.w3.org/2000/01/rdf-schema#')){
       key="rdfs:"+key.replace('http://www.w3.org/2000/01/rdf-schema#','');
    } 
    else if(key.startsWith('http://schema.org/')){
       key="schema:"+key.replace('http://schema.org/','');
    } 
    else if(key.startsWith('http://www.w3.org/2002/07/owl#')){
       key="owl:"+key.replace('http://www.w3.org/2002/07/owl#','');
    } 
    else if(key.startsWith('http://www.w3.org/ns/auth/cert#')){
       key="cert:"+key.replace('http://www.w3.org/ns/auth/cert#','');
    } 
    else if(key.startsWith('http://dbpedia.org/ontology/')){
       key="dbpedia:"+key.replace('http://dbpedia.org/ontology/','');
    } 
    else if(key.startsWith('http://purl.org/dc/terms/')){
       key="dct:"+key.replace('http://purl.org/dc/terms/','');
    } 
    else if(key.startsWith('http://www.w3.org/ns/solid/interop#')){
       key="interop:"+key.replace('http://www.w3.org/ns/solid/interop#','');
    } 
    else if(key.startsWith('http://www.w3.org/2005/01/wf/flow#')){
       key="flow:"+key.replace('http://www.w3.org/2005/01/wf/flow#','');
    } 
    else if(key.startsWith('http://www.w3.org/ns/pim/meeting#')){
       key="meeting:"+key.replace('http://www.w3.org/ns/pim/meeting#','');
    } 
    else if(key.startsWith('http://www.w3.org/ns/pim/pad#')){
       key="pad:"+key.replace('http://www.w3.org/ns/pim/pad#','');
    } 
    else if(key.startsWith('http://activitypods.org/ns/core#')){
       key="activitypods"+key.replace('http://activitypods.org/ns/core#','');
    } 
/*
    else if(key.startsWith('')){
       key="space:"+key.replace('','');
    } 
*/
    return key;
}

function getTerm(url){
  return url.replace(/.*\//,'').replace(/.*\#/,'')
}
function fetchPredicate(webidNode,predicate,store){
  let record = [];
  let objects = store.each( webidNode, predicate );
  for(let o of objects){
    record.push(o.value);
  }
  if(record.length==1) record = record[0];
  if(record.length>0)  return record;
}
async function fetchRegistrations(webidNode,status,isOwner,store){
  const privIndex = store.any( webidNode, ns.solid('privateTypeIndex') );
  const pubIndex = store.any( webidNode, ns.solid('publicTypeIndex') );
  if(status=="public"){
    if(pubIndex) try {
      await doLoad(pubIndex);
    } catch(e){}
    return parseRegistrations(store,pubIndex);
  }
  else if(privIndex && isOwner){
    const tmpStore=graph();
    const tmpFetcher=fetcher(tmpStore);
    try {
      try { await doLoad(privIndex,tmpFetcher);} catch(e){}
      try { await doLoad(privIndex);} catch(e){}
    } catch(e){}
    return parseRegistrations(tmpStore,privIndex);
  }
}
function parseRegistrations(store,node) {
  let registrations = [];
  let classes = store.match(null,ns.solid('forClass'),null,node);
  for(let c of classes){
    let forClass = c.object.value
    let forClassDisplay = getCurie(forClass);
    registrations[forClassDisplay]||=[];
    for(let o of store.match(c.subject,UI.ns.solid('instance'))){
      registrations.push( {[forClassDisplay]:o.object.value} );
      // registrations[forClassDisplay].push( o.object.value );
    }
    for(let container of store.match(c.subject,ns.solid('instanceContainer'))){
      registrations.push( {[forClassDisplay]:container.object.value} );
      // registrations[forClassDisplay].push( container.object.value );
    }
  }
  return registrations;
}
