import * as $rdf from "https://esm.sh/rdflib";
import {authn,store} from "https://esm.sh/solid-logic";
import {ns} from "https://esm.sh/solid-ui";
window.store = store
window.$rdf =$rdf ;
window.ns = ns;
window.authn = authn;
window.UI = { store, authn, ns, rdf:$rdf };
