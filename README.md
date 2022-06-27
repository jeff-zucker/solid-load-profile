# loadProfile

loads a full Solid profile and provides methods to access it

## loadFullProfile()

Loads into the UI.store all of the required parts of a full Solid Profile that the current user and app have access to.  Returns a context array containing full information on the user's inbox, oidcIssuers, storages, type registrations, and locations of all profile documents.  The context array will look something like this:
```javascript
{
    "me": {
        "termType": "NamedNode",
        "classOrder": 5,
        "value": "https://jeff-zucker.solidcommunity.net/profile/card#me"
    },
    "publicProfile": {
        "termType": "NamedNode",
        "classOrder": 5,
        "value": "https://jeff-zucker.solidcommunity.net/profile/card"
    },
    "storages": [
        {
            "termType": "NamedNode",
            "classOrder": 5,
            "value": "https://jeff-zucker.solidcommunity.net:8443/"
        },
        {
            "termType": "NamedNode",
            "classOrder": 5,
            "value": "https://jeff-zucker.solidcommunity.net/"
        },
        {
            "termType": "NamedNode",
            "classOrder": 5,
            "value": "https://jeffzucker.inrupt.net/"
        }
    ]
    "extendedDocs": [
        {
            "termType": "NamedNode",
            "classOrder": 5,
            "value": "https://jeff-zucker.solidcommunity.net/profile/mySeeAlso.ttl"
        }
    ],
    "registrations": {
        "http://schema.org/DataFeed": {
            "instances": [
                {
                    "termType": "NamedNode",
                    "classOrder": 5,
                    "value": "https://jeff-zucker.solidcommunity.net/4cd1be50-2fab-11ec-a679-67f8e0446a98.ttl"
                }
            ]
        }
    }
    // etc with other predicates
}
```

## profile.structure

The default context returned from profile.loadFullProfile() is an object containing named nodes. In some cases the app may want URL strings instead of named nodes.  After profile.loadFullProfile() is called profile.structure will return the same context object but with strings instead of named nodes.

## getProperty()

Once the full profile is loaded, the getProperty() method can be called to retrieve specific information not contained in the context returned from the loadFullProfile() method.  For example:
```javascript
  alert( profile.getProperty('foaf:name') );
  alert( profile.getProperty('http://xmlns.com/foaf/0.1/name') );
```
Note : You can use a curie (prefix:term) if the prefix is a common one, known to solid-namespaces. You can use a full URI for any predicate.

## Calling in a script

The only prerequisite is solid-ui.  
```html
<script src="./node_modules/solid-ui/dist/main.js"></script>
<script type="module">

import {LoadProfile} from './src/loadProfile.js';

async function showInfrastructure(webid){
  let profile = new LoadProfile();
  let context = await profile.loadFullProfile(webid);
  context = "<pre>"+ JSON.stringify(context,null,4)+"</pre>";
  let name = profile.getProperty('foaf:name');
  document.getElementById('results').innerHTML = name + context;
}

// ...
```

