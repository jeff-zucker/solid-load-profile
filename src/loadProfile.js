/*
 * loadFullProfile
 *   if !owner - load webid doc & public index & public seeAlsos
 *   if owner && !isFixerApp - load webid doc, prefs, indexes, seeAlsos
 *   if owner && isFixerApp - same but create missing infrastructure
 * note : always succeeds, always returns maximum user/app has access to
*/
export class LoadProfile {

  loadFullProfile = async function(webid){
    let loggedIn = UI.authn.currentUser();
    let isOwner = loggedIn && loggedIn.value === webid.value || webid;
    let context = {me:UI.rdf.sym(webid)};
    this.webid = webid = context.me;
    context.publicProfile = webid.doc();
    await this.tryLoad(context.publicProfile);
    context.index = {};
    context.index.public = this.getProperty('solid:publicTypeIndex');
    await this.tryLoad(context.index.public);
    if(isOwner){
      context.preferencesFile= this.getProperty('space:preferencesFile');
      await this.tryLoad(context.preferencesFile);
      context.index.private = this.getProperty('solid:privateTypeIndex');
      await this.tryLoad(context.index.private);
    }
    context.extendedDocs = this.getProperties('rdfs:seeAlso');
    for(let doc of context.extendedDocs) { await this.tryLoad(doc); }
    context.registrations = this.registrations();
    context.inbox = this.inbox();
    context.issuers = this.issuers();
    context.storages = this.storages();
    return context;
  }

  async tryLoad(url){
    if(!url) return;
    try {
      await UI.store.fetcher.load(url);
      return true;
    }
    catch(e){} // if we don't have access to it, ignore it
  }
  getProperty(curie){
    let [vocab,predicate] = curie.split(/:/);
    return UI.store.any(this.webid,UI.ns[vocab](predicate)) || "";
  }
  getProperties(curie){
    let [vocab,predicate] = curie.split(/:/);
    return UI.store.each(this.webid,UI.ns[vocab](predicate))  || "";
  }
  getValues(curie){
    let all = [];
    let some = this.getProperties(curie) || [];
    for(let one of some){
      all.push(one.value);
    }
    return all;
  }
  storages = function(webid){
    return this.getProperties('space:storage'); 
  }
  issuers = function(){
    return this.getProperties('solid:oidcIssuer');
  }
  inbox = function(){
    return this.getProperty('ldp:inbox');
  }
  registrations = function(){
    let registrations = {};
    let isa = UI.ns.rdf('type');
    let reg = UI.ns.solid('TypeRegistration');
    for(let s of UI.store.match(null,isa,reg)){
      let forClass = UI.store.match(s.subject,UI.ns.solid('forClass'));
      forClass = forClass[0].object.value
      registrations[forClass]||={};
      for(let o of UI.store.match(s.subject,UI.ns.solid('instance'))){
        registrations[forClass]['instances'] ||= [];
        registrations[forClass]['instances'].push( o.object );
      }
      for(let c of UI.store.match(s.subject,UI.ns.solid('instanceContainer'))){
        registrations[forClass]['containers'] ||= [];
        registrations[forClass]['containers'].push( c.object );
      }
    }
    return registrations;
  }
}
