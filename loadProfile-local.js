import * as $rdf from "./node_modules/rdflib/dist/rdflib.min.js";
import {authn,store} from "./node_modules/solid-logic/dist/solid-logic.min.js";
import {ns} from "./node_modules/solid-ui/dist/solid-ui.min.js";
window.UI = { store, authn, ns, rdf:$rdf };
