// window.onerror = function (error) {
//  alert('Uncaught error:', error);
// };

export async function loadProfile(webid,store){
  let loggedIn = authn.currentUser();
  let isOwner = loggedIn && loggedIn.value === (webid.value || webid);
  const webidNode = webid.value ?webid :$rdf.sym(webid);
  store ||= $rdf.graph();
  const fetcher = $rdf.fetcher(store);  
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
    catch(e){ console.log('fetch-error: ',webid,e); }

    /* PARSE WEBID DOC
    */
    if(response && response.responseText) {
      try {
        $rdf.parse(response.responseText,store,webid,'text/turtle');
      }
      catch(e){ console.log('parse-error: ',webid,response.responseText); }
    }
    const prefixes = response.responseText.split('\n').filter(
       line => line.startsWith('@prefix')).map(
         line => line.trim().replace('@prefix', '').replace(/</,'').replace(/>\s*\./,'').split(/\s/)
    );

    /* FETCH PREFERENCES FILE (if permissioned)
    */
      const prefs = store.each( webidNode, ns.space('preferencesFile') );
      for(let p of prefs){
        try { await fetcher.load(p);} catch(e){}
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
    "solid:TypeRegistration" : await fetchRegistrations(webidNode,'public',store),
    "owl:sameAs" : fetchPredicate( webidNode, ns.owl('sameAs'),store ),
    "foaf:primaryTopicOf" : fetchPredicate( webidNode, ns.foaf('primaryTopicOf'),store ),
    "interop:hasAuthorizationAgent" : fetchPredicate( webidNode, $rdf.sym('http://www.w3.org/ns/solid/interop#hasAuthorizationAgent'),store ),
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
    let key = getTerm(a.predicate.value);
    for(let p of prefixes){
      if(p[2]=='http://' || p[2]=='https://') continue;
      if(a.predicate.value.startsWith(p[2])){
        let regex = new RegExp( p[2]) ;
        key = a.predicate.value.replace(regex,p[1])
        break;
      }
    }
    if(key=="type") key = "rdf:type";
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
async function fetchRegistrations(webidNode,status,store){
  if(status=="public"){
    try {
      const pubIndex = store.any( webidNode, ns.solid('publicTypeIndex') );
      await store.fetcher.load(pubIndex);
    } catch(e){}
    return parseRegistrations(store);
  }
  else {
    const tmpStore=$rdf.graph();
    const tmpFetcher=$rdf.fetcher(tmpStore);
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
