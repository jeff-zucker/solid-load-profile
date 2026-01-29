export async function readJson(url,store){
  let r = await store.fetcher.webOperation('GET',url);
  return JSON.parse(r.responseText);
}
export async function writeJson(path,object,store){
  const body = JSON.stringify(object,null,4);
  let r = await PUT(path,body,'application/json',store);
  return r;
}
async function saveProfile(webid,profile,store){
  let name = profile['foaf:name'] || profile['vcard:fn'] || webid.replace(/http.:\/\//,'').replace(/\//g,'_');
  name = name.replace(/\s/g,"_");
  const path = `/s/solid-load-profile/data/${name}.json`;
  const contentType = 'application/json';
  const body = JSON.stringify(profile,null,4);
  try {
    const response = await store.fetcher.webOperation('PUT',path,{body,contentType});  
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    else {
      console.log(path," saved!");
    }
  } catch (error) {
    alert('PUT request failed: '+ error);
  }
}
