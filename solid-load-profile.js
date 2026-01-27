import {sym,parse,graph} from "https://esm.sh/rdflib";
import {authn,store} from "https://esm.sh/solid-logic";
import {ns} from "https://esm.sh/solid-ui";
const fetcher = store.fetcher;

export async function loadProfile(webid){
  let loggedIn = authn.currentUser();
  let isOwner = loggedIn && loggedIn.value === (webid.value || webid);
  const webidNode = webid.value ?webid :sym(webid);
  const profile = {};
  let response;

    /* FETCH WEBID DOC
         we use webOperation + parse since this may not be on a Solid Server
    */
    try {
      response = await fetcher.webOperation( 'GET',webid,{ 
        headers: {accept:'text/turtle,application/ld+json',withCredentials:false},
        withCredentials:false,
      } );
    }
    catch(e){ console.log('fetch-error: ',webid,e); return null; }
    let prefixes = [];

    /* PARSE WEBID DOC
    */
    if(response && response.responseText) {
      try {
        parse(response.responseText,store,webid,'text/turtle');
        prefixes = response.responseText.split('\n').filter(
         line => line.startsWith('@prefix')).map(
           line => line.trim().replace('@prefix', '').replace(/</,'').replace(/>\s*\./,'').split(/\s/)
        );
      }
      catch(e){ console.log('parse-error: ',webid,response.responseText); return null; }
    }
    else return null;

    /* FETCH PREFERENCES FILE (if permissioned)
    */
    if(isOwner){
      const prefs = store.each( webidNode, ns.space('preferencesFile') );
      for(let p of prefs){
        try { await fetcher.load(p);} catch(e){}
      }
    }

    /* FETCH SEE-ALSOs & PRIMARY-TOPIC-OF
    */
    const primaryTopic = store.each( webidNode, ns.foaf('primaryTopicOf') );
    let extended = store.each( webidNode, ns.rdfs('seeAlso') );
    extended = extended.concat(primaryTopic);
    for(let e of extended){
      await fetcher.load(e);
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
    "solid:TypeRegistration" : await fetchRegistrations(webidNode,'public',isOwner,store),
    "owl:sameAs" : fetchPredicate( webidNode, ns.owl('sameAs'),store ),
    "foaf:primaryTopicOf" : fetchPredicate( webidNode, ns.foaf('primaryTopicOf'),store ),
    "interop:hasAuthorizationAgent" : fetchPredicate( webidNode, sym('http://www.w3.org/ns/solid/interop#hasAuthorizationAgent'),store ),
  }
  if(isOwner){
    profileObj.privateTypeRegistrations = await fetchRegistrations(webidNode,'private',store);
  }
  let visited = {};
  for(let k of Object.keys(profileObj)){
    visited[k]=true;
  }
  const all = store.match(webidNode);
  for(let a of all){
    const these = store.each(webidNode,a.predicate);
    let key = a.predicate.value;
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
/*
    else if(key.startsWith('')){
       key="space:"+key.replace('','');
    } 
*/
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
          value.push( {[v.predicate.value]:v.object.value} );
        }
         
      }
      else if(t.termType=="Collection"){
         value = [];
         for(let e of t.elements){
           let triple = store.match(e);
           for(let tr of triple)
             value.push( {[tr.predicate.value]:tr.object.value} );
         }
      }
      if(profileObj[key].push && value ) profileObj[key].push( value );
    }
    if(profileObj[key].length==1 ) profileObj[key] = profileObj[key][0] 
  }
  return(profileObj);
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
  if(status=="public"){
    try {
      const pubIndex = store.any( webidNode, ns.solid('publicTypeIndex') );
      await store.fetcher.load(pubIndex);
    } catch(e){}
    return parseRegistrations(store);
  }
  else if(isOwner){
    const tmpStore=graph();
    const tmpFetcher=fetcher(tmpStore);
    const privIndex = tmpStore.any( webidNode, ns.solid('privateTypeIndex') );
    try {
      try { await tmpFetcher.load(privIndex);} catch(e){}
      try { await store.fetcher.load(privIndex);} catch(e){}
    } catch(e){}
    return parseRegistrations(tmpStore);
  }
}
function parseRegistrations(store) {
  let registrations = {};
  let classes = store.match(null,UI.ns.solid('forClass'));
  for(let c of classes){
    let forClass = c.object.value
    let forClassDisplay = forClass.replace(/.*\//,'').replace(/.*#/,'');
    registrations[forClassDisplay]||=[];
    for(let o of store.match(c.subject,UI.ns.solid('instance'))){
      registrations[forClassDisplay].push( o.object.value );
    }
    for(let container of store.match(c.subject,ns.solid('instanceContainer'))){
      registrations[forClassDisplay].push( container.object.value );
    }
  }
  return registrations;
}
