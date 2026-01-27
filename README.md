# solid-load-profile

-- loads a full Solid profile into a simple Javascript array

Check it out online at http://localhost:3000/s/solid-load-profile/.

## loadProfile()

Loads all of the required parts of a full Solid Profile that the current user and app have access to.  Returns a Javascript object containing full information on the user's inbox, oidcIssuers, storages, type registrations, locations of all profile documents, and all other information in the full profile.
```
  import './loadProfile-cdn.js';                    // or loadProfile-local.js if running locally
  import {loadProfile} from './src/loadProfile.js';
  loadProfile().then( (profile) => {
    // access the Javascript array e.g. console.log(profile.inbox);
  });
```

The object will look something like this:
```javascript
{
    "webid": "https://jeff-zucker.solidcommunity.net/profile/card#me",
    "pim:storage": [
        "https://jeff-zucker.solidcommunity.net:8443/",
        "https://jeff-zucker.solidcommunity.net/",
        "https://jeffzucker.inrupt.net/",
    ]
    "rdfs:seAlso": [
       "https://jeff-zucker.solidcommunity.net/profile/mySeeAlso1.ttl"
       "https://jeff-zucker.solidcommunity.net/profile/mySeeAlso2.ttl"
    ],
    // etc with other predicates
}
```

## What gets lodaded

A full Solid Profile includes all triples in the WebID document and extended profile documents it points to.

This library loads all triples from these documents:
* the WebID document
* the preferences file   (if logged in and with permission)
* all documents pointed from the WebID document using rdfs:seeAlso or foaf:primaryTopicOf
* all documents pointed to from any of the above documents using rdfs:seeAlso
* the public type index
* the private type index (if logged in and with permission)

This method of loading should accomodate situations in which 
* the WebID document is or is not located on a Solid Server
* the WebID document and social profile are or are not two different documents
* first level seeAlso documents contain seeAlso links to other seeAlso documents

Note: the last mentioned case is to accomodate the use of rdfs:seeAlso in a WebID document 
not located on a Solid server, in which case the only place an app can write a seeAlso is in a seeAlso.
This library looks for two levels of seeAlsos to handle this, but does not recurse further.

## Calling in a script

```html
<body> <div id="results"></div>

<script type="module">
    import './loadProfile-cdn.js';  // or loadProfile-local.js if running locally
    import {loadProfile} from './src/loadProfile.js';

    async function showProfile(webid){
        let profile = await loadProfile();
        let name = profile.name;
        const profileString = "<pre>"+ JSON.stringify(profile,null,4)+"</pre>";
        document.getElementById('results').innerHTML = name + profileString;
    }
	showProfile(<ANY-WEBID-HERE>);
</script>
```

(c) Jeff Zucker, 2022-2026, may be freely used with an MIT or Apache license
