var express = require('express');
var app = express();
var router = express.Router();
var fs = require('fs');
var request = require('request');
var shell = require('shelljs');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
var jsonfile = require('jsonfile');
var http = require('http');
var path = require('path');
var url = require('url');
var spawn = require('child_process').spawn;
var request = require('request');
var querystring = require('querystring');
var escapeHtml = require('escape-html');
var endpoint = 'http:\//localhost:' + (process.argv[3] || 3030) +
  '/dataset/sparql';

////////////////////////////////////////////
////////////////////////////////////////////
// Waleed Code Starts
///////////////////////////////////////////

// Socket io
var server = require('http').createServer(app); 
var io = require('socket.io')(server); 


var editableOntologies = {};

// when a client connects, do this
io.on('connection', function(client) {  
  console.log('Client connected...');


  client.on('connectedToServer', function(data) {
    //send a message to ALL connected clients
    msg = 'A new Client is added'
    io.emit('servermessage', msg);
    io.emit('initialState',editableOntologies)
  });




  client.on('editClickedLockedClient', function(subject_value,predicate_value,obj_value,index_value,socket_id) {
    //send a message to ALL connected clients

    //time expiry adding 1 minute in current time
    time = Date.now()+ (1000*60); 
    console.log('element time'+time);
    var index = subject_value+index_value
    editableOntologies[index] = {'s':subject_value,'p':predicate_value,'o':obj_value,'index':index_value,'socket_id':socket_id,'time':time};
    console.log(editableOntologies);
    io.emit('editClickedLockedServer', subject_value,predicate_value,obj_value,index_value,editableOntologies);
  });





  client.on('cancelEditClciked', function(subject_value,predicate_value,obj_value,index_value,socket_id) {
    //send a message to ALL connected clients

    var index = subject_value+index_value
    length =  Object.keys(editableOntologies).length;

    if(length){
            delete editableOntologies[index];
    }
    console.log(editableOntologies);
    io.emit('cancelEditUnlocked', subject_value,predicate_value,obj_value,index_value,editableOntologies);
  });
  
});




io.listen(3060);


setInterval(function() {
  
  var time = Date.now();
  console.log('hello timer current time'+time);
  Object.keys(editableOntologies).forEach(function (item) {
    console.log(item); // key
    console.log(editableOntologies[item].time); // value
    if(time > editableOntologies[item].time ){
      console.log('Time expired for ontology delete this');
      delete editableOntologies[item];
      // io.emit('RemovedExpiredOntologies',editableOntologies);
    }
    else{
      console.log('time not expired for ontologies. Keep Storing it')
    }
  });

  }, 10000);
  


  function RemoveNode(id) {
    return editableOntologies.filter(function(emp) {
        if (emp.id == id) {
            return false;
        }
        return true;
    });
}

////////////////////////////////////////////
////////////////////////////////////////////
// Waleed Code Ends
///////////////////////////////////////////









// to re-write the namedgraph lists to be added to the query
var namedGraphsString4Qurery = "";
var RDFConceptsJson = [];
// query to get RDFS_Concepts
var RDFSConceptsQuery = function(namedGraphsString) {
  return ("PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
    " PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
    " PREFIX owl:  <http://www.w3.org/2002/07/owl#> " +
    " PREFIX foaf: <http://xmlns.com/foaf/0.1/> " +
    " PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#> " +
    " PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
    " SELECT DISTINCT ?concept ?RDFType ?g " +
    namedGraphsString +
    " WHERE {  GRAPH ?g { ?s ?p ?o }  GRAPH ?g { {" +
    " ?concept rdfs:subClassOf ?p" + "  OPTIONAL {?concept a ?RDFType.} " +
    "  FILTER(!isBlank(?concept)) Filter(!bound(?RDFType))" + "}" +
    "UNION{" +
    " ?concept a ?RDFType . " +
    "           OPTIONAL {?concept ?p ?o.}" +
    " FILTER (!contains(str(?RDFType), \"skos/core#\"))" +
    " FILTER (contains(str(?RDFType), \"owl#\")||contains(str(?RDFType), \"22-rdf-syntax-ns#\")||contains(str(?RDFType),\"rdf-schema#\" ))" +
    " MINUS{?concept a owl:NamedIndividual  ." +
    " }" +
    " MINUS{?concept a owl:Thing ." +
    " }}}}");
}

var RDFSObjectsQuery = function(namedGraphsString) {
  return ("PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> " +
    "PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#> " +
    "PREFIX owl:  <http://www.w3.org/2002/07/owl#>  " +
    "PREFIX foaf: <http://xmlns.com/foaf/0.1/>  " +
    "PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>  " +
    "PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
    "SELECT Distinct ?o ?g " +
    namedGraphsString +
    " WHERE { GRAPH ?g { ?s ?p ?o }  GRAPH ?g {" +
    "?s ?p ?o. FILTER (!isLiteral(?o))   FILTER(!isBlank(?o))" + "MINUS " +
    "  { ?s ?p ?o. FILTER (!isLiteral(?o))   FILTER(!isBlank(?o)) FILTER(regex(str(?p), \"skos/core#\" )) }" +
    "}}");

}

var individualsQuery = function(namedGraphsString) {
  return ("PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>" +
    " PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
    " PREFIX owl:  <http://www.w3.org/2002/07/owl#>" +
    " PREFIX skos: <http://www.w3.org/2004/02/skos/core#>" +
    " SELECT DISTINCT ?s ?RDFType ?g  " +
    namedGraphsString +
    " WHERE {  GRAPH ?g { ?s ?p ?o }  GRAPH ?g { {" +
    " ?s a ?RDFType ; ?p ?o." +
    " FILTER (!contains(str(?RDFType), \"owl#\"))" +
    " FILTER (!contains(str(?RDFType), \"rdf-schema#\"))" +
    " FILTER (!contains(str(?RDFType), \"22-rdf-syntax-ns#\"))" +
    " FILTER (!contains(str(?RDFType), \"skos/core#\"))" +
    " FILTER (!contains(str(?p), \"subClassOf\"))" +
    " FILTER (!contains(str(?p), \"subPropertyOf\"))" +
    " }" +
    " UNION{?s a ?RDFType ." +
    "  FILTER (contains(str(?RDFType), \"owl#NamedIndividual\"))" +
    " }" +
    " UNION{?s a ?RDFType ." +
    "     FILTER (contains(str(?RDFType), \"owl#Thing\"))" +
    " }}}");
}

var childParentRelationQuery = function(namedGraphsString) {
  return ("PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>  " +
    " SELECT  ?classChild ?classParent   " + namedGraphsString +
    "  WHERE {" +
    " ?classChild rdfs:subClassOf  ?classParent . " +
    " FILTER(!isBlank(?classParent)) " +
    " FILTER(!isBlank(?classChild))" +
    " }");
}


var SKOSConceptsQuery1 = function(namedGraphsString) {
  return ("  PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
    "  SELECT  distinct ?subject ?oBroader ?RDFType  ?g  " +
    namedGraphsString + "  WHERE { " +
    "  GRAPH ?g { ?s ?p ?o }  GRAPH ?g { { ?subject a ?RDFType . " +
    "  OPTIONAL{?subject skos:broader ?oBroader .} " +
    "  FILTER (contains(str(?RDFType), \"skos/core#\"))}}} ");
}
var SKOSConceptsQuery2 = function(namedGraphsString) {
  return ("  PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
    "  SELECT  distinct ?subject  ?RDFType ?oNarrower ?g   " +
    namedGraphsString + "  WHERE { " +
    "  GRAPH ?g { ?s ?p ?o }  GRAPH ?g { { ?subject a ?RDFType  .  " +
    "  OPTIONAL{?subject skos:narrower ?oNarrower .} " +
    "  FILTER (contains(str(?RDFType), \"skos/core#\"))}}} ");
}

var SKOSObjectsQuery = function(namedGraphsString) {
  return ("  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>  " +
    "  PREFIX rdf:  <http://www.w3.org/1999/02/22-rdf-syntax-ns#>" +
    "  PREFIX owl:  <http://www.w3.org/2002/07/owl#>  " +
    "PREFIX foaf: <http://xmlns.com/foaf/0.1/>  " +
    "  PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>  " +
    "  PREFIX skos: <http://www.w3.org/2004/02/skos/core#> " +
    "  SELECT Distinct ?o  " + namedGraphsString +
    "  WHERE {  GRAPH ?g { ?s ?p ?o }  GRAPH ?g { { ?s1 ?p ?o1. ?s1 ?p1 ?o  FILTER (!isLiteral(?o))   FILTER(!isBlank(?o)) FILTER(regex(str(?p), \"skos/core#\" ))   " +
    "  MINUS {?o a owl:NamedIndividual }}}}");
}

// query to find all the named graphs in SPARQL-endpoint
var allNamedGraphsQuery = 'SELECT DISTINCT ?g ' +
  'WHERE {' +
  '  GRAPH ?g { ?s ?p ?o }' +
  '}';

function execQuery(currentQueryString, caller, other) {
  return new Promise(function(resolve, reject) {
    request.get({
      headers: {
        'Accept': 'application/sparql-results+json;charset=UTF-8'
      },
      url: endpoint + '?query=' + querystring.escape(currentQueryString)
    }, function(error, response, data) {
      if (!error && response.statusCode == 200) {
        // Show the HTML for the Google homepage.
        if (data != null) {
          data = JSON.parse(data)
          // callback to the caller function to deliver the result after coming of response
          if (caller == "RDFObjects") {
            if (data.results.bindings) {
              var JSONRDFObjectArrary = [];
              for (var k in data.results.bindings) {
                var JSONRDFObject = {
                  "object": replaceWithRDFType(data.results.bindings[
                    k]["o"]
                    .value),
                  "URI": data.results.bindings[k]["o"].value
                };
                JSONRDFObjectArrary.push(JSONRDFObject);
              }
              resolve(JSONRDFObjectArrary);
            }
          } else if (caller == "RDFConcepts") {
            if (data.results.bindings) {
              if (data.results.bindings[0] != null) {
                var JSONRDFObjectArrary = [];
                for (var k in data.results.bindings) {
                  var nodeParnet = "";
                  // find perant of child if exists
                  if (other) {
                    other.forEach(function(element) {
                      if (JSON.stringify(element['child']).includes(
                          JSON.stringify(data.results.bindings[
                            k]["concept"].value))) {
                        nodeParnet = replaceWithRDFType(element[
                          'parent']);
                      }
                    })
                  }
                  var JSONRDFObject = {
                    "parent": nodeParnet,
                    "concept": trimInstance(data.results.bindings[k][
                      "concept"
                    ].value),
                    "URI": data.results.bindings[k]["concept"].value,
                    "RDFType": replaceWithRDFType(data.results.bindings[
                      k]["RDFType"]
                      .value),
                    "fileName": data.results.bindings[k]["g"].value.substring(
                      data.results.bindings[
                        k]["g"].value.lastIndexOf(
                        '/') + 1, data.results.bindings[k]["g"].value[
                        data.results.bindings[k][
                          "g"
                        ].value.length])
                  };
                  if (JSONRDFObject.concept != "") {
                    JSONRDFObjectArrary.push(JSONRDFObject);
                  }
                }
                resolve(JSONRDFObjectArrary);
              }
            }
          } else if (caller == "Individuals") {
            if (data.results.bindings) {
              if (data.results.bindings[0] != null) {
                var JSONRDFObjectArrary = [];
                for (var k in data.results.bindings) {
                  var JSONRDFObject = {
                    "subject": trimInstance(data.results.bindings[k][
                      "s"
                    ].value),
                    "subjectURI": data.results.bindings[k]["s"].value,
                    "RDFType": replaceWithRDFType(data.results.bindings[
                      k]["RDFType"].value),
                    "fileName": data.results.bindings[k]["g"].value.substring(
                      data.results.bindings[k]["g"].value.lastIndexOf(
                        '/') + 1, data.results.bindings[k]["g"].value[
                        data.results.bindings[k]["g"].value.length]
                    )
                  };
                  JSONRDFObjectArrary.push(JSONRDFObject);
                }
                resolve(JSONRDFObjectArrary);
              }
            }
          } else if (caller == "childParent") {
            if (data.results.bindings) {
              var JSONRDFObjectArrary = [];
              for (var k in data.results.bindings) {
                var JSONRDFObject = {
                  "parent": data.results.bindings[k]["classParent"].value,
                  "child": data.results.bindings[k]["classChild"].value
                };
                JSONRDFObjectArrary.push(JSONRDFObject);
              }
              resolve(JSONRDFObjectArrary);
            }
          } else if (caller == "SKOSBroaders") {
            if (data.results.bindings) {
              if (data.results.bindings[0] != null) {
                var JSONRDFObjectArrary = [];
                for (var k in data.results.bindings) {

                  if (data.results.bindings[k]["subject"] != null) {
                    var JSONRDFObject = {
                      "concept": trim(data.results.bindings[k][
                        "subject"
                      ].value),
                      "URI": data.results.bindings[k]["subject"].value,
                      "fileName": data.results.bindings[k]["g"].value
                        .substring(
                          data.results.bindings[k]["g"].value.lastIndexOf(
                            '/') + 1, data.results.bindings[k]["g"]
                            .value[
                            data.results.bindings[k]["g"].value.length
                            ])
                    };
                    if (data.results.bindings[k]["oBroader"] !=
                      null) {
                      JSONRDFObject.childURI = data.results.bindings[
                        k]["subject"].value;
                      JSONRDFObject.parentURI = data.results.bindings[
                        k]["oBroader"].value;
                      JSONRDFObject.child = trim(data.results.bindings[
                        k]["subject"].value);
                      JSONRDFObject.parent = trim(data.results.bindings[
                        k]["oBroader"].value);
                    } else {
                      JSONRDFObject.child = "";
                      JSONRDFObject.parent = ""
                    }
                    if (data.results.bindings[k]["RDFType"].value !=
                      null) {
                      JSONRDFObject.RDFType = replaceWithRDFType(
                        data.results
                          .bindings[k]["RDFType"].value);

                    }
                    JSONRDFObjectArrary.push(JSONRDFObject);
                  }
                }
                resolve(JSONRDFObjectArrary);
              }
            }
          } else if (caller == "SKOSNarrowers") {
            if (data.results.bindings) {
              if (data.results.bindings[0] != null) {
                var JSONRDFObjectArrary = [];
                for (var k in data.results.bindings) {
                  var isDuplicateData = false;
                  if (other) {
                    for (var i in other) {
                      if (JSON.stringify(other[i]['parent']).includes(
                          JSON.stringify(trim(data.results.bindings[
                            k]["subject"].value))) && JSON.stringify(
                          other[i]['child'])
                          .includes(
                            JSON.stringify(trim(data.results.bindings[
                              k]["oNarrower"].value)))) {
                        console.log(JSON.stringify(other[i]['parent']));
                        console
                          .log(JSON.stringify(trim(data.results.bindings[
                            k]["subject"].value)));
                        isDuplicateData = true;
                        break;
                      }
                    }
                  }
                  if (!isDuplicateData) {
                    if (data.results.bindings[k]["subject"] != null) {
                      var JSONRDFObject = {
                        "concept": trim(data.results.bindings[k][
                          "subject"
                        ].value),

                        "URI": data.results.bindings[k][
                          "subject"
                        ].value,
                        "fileName": data.results.bindings[k][
                          "g"
                        ].value.substring(
                          data.results.bindings[k]["g"].value.lastIndexOf(
                            '/') + 1, data.results.bindings[k][
                            "g"
                          ].value[
                            data.results.bindings[k]["g"].value
                              .length]
                        )
                      };
                      if (data.results.bindings[k]["oNarrower"] !=
                        null) {
                        JSONRDFObject.parentURI = data.results.bindings[
                          k]["subject"].value;
                        JSONRDFObject.childURI = data.results.bindings[
                          k]["oNarrower"].value;
                        JSONRDFObject.parent = trim(data.results.bindings[
                          k]["subject"].value);
                        JSONRDFObject.child = trim(data.results.bindings[
                          k]["oNarrower"].value);
                      } else {
                        JSONRDFObject.child = "";
                        JSONRDFObject.parent = ""
                      }
                      if (data.results.bindings[k]["RDFType"].value !=
                        null) {
                        JSONRDFObject.RDFType = replaceWithRDFType(
                          data.results.bindings[k]["RDFType"].value
                        );
                      }
                      JSONRDFObjectArrary.push(JSONRDFObject);
                    }
                  }
                }
                console.log(JSONRDFObjectArrary);
                resolve(JSONRDFObjectArrary);
              }
            }
          } else if (caller == "SKOSObjects") {
            if (data.results.bindings) {
              var JSONRDFObjectArrary = [];
              for (var k in data.results.bindings) {
                var JSONRDFObject = {
                  "object": replaceWithRDFType(data.results.bindings[
                    k]["o"]
                    .value),
                  "URI": data.results.bindings[k]["o"].value
                };
                JSONRDFObjectArrary.push(JSONRDFObject);
              }
              resolve(JSONRDFObjectArrary);
            }

          }
        }
      } else {
        console.log(response.statusCode)
        console.warn(error);
        reject(error);
      }
    });
  });

}


function trim(URI) {
  var conceptArray = [];
  var conceptTrimmed = "";
  if (URI.includes("/")) {
    conceptArray = URI.split("/");
    if (conceptArray != null && conceptArray.length > 0) {
      conceptTrimmed = conceptArray[conceptArray.length - 1];
    }
  }
  if (conceptTrimmed.includes("#")) {
    conceptArray = URI.split("#");
    if (conceptArray != null && conceptArray.length > 0) {
      conceptTrimmed = conceptArray[conceptArray.length - 1];
    }
  }
  return conceptTrimmed;
}

function trimInstance(URI) {
  var conceptArray = [];
  var conceptTrimmed = "";
  if (URI.endsWith("/"))
    URI = URI.substring(0, URI.length - 1);
  if (URI.includes("/")) {
    conceptArray = URI.split("/");
    if (conceptArray != null && conceptArray.length > 0) {
      conceptTrimmed = conceptArray[conceptArray.length - 1];
    }
  }
  if (conceptTrimmed.includes("#")) {
    conceptArray = URI.split("#");
    if (conceptArray != null && conceptArray.length > 0) {
      conceptTrimmed = conceptArray[conceptArray.length - 1];
    }
  }
  return conceptTrimmed;
}

function replaceWithRDFType(RDFType) {
  var conceptArray = [];
  var RDFTypeTrimmed = "";
  if (RDFType.includes("skos/core#")) {
    conceptArray = RDFType.split("#");
    if (conceptArray != null && conceptArray.length > 0) {
      RDFTypeTrimmed = conceptArray[conceptArray.length - 1];
      return "skos:" + RDFTypeTrimmed.substring(RDFTypeTrimmed.lastIndexOf(
            '#') +
          1);
    }
  } else if (RDFType.includes("/")) {
    conceptArray = RDFType.split("/");
    if (conceptArray != null && conceptArray.length > 0) {
      RDFTypeTrimmed = conceptArray[conceptArray.length - 1];
    }
  }
  if (RDFTypeTrimmed.indexOf("Class") >= 0 && RDFTypeTrimmed.indexOf(
      "owl") >=
    0)
    return "owl:Class";
  else if (RDFTypeTrimmed.indexOf("Class") >= 0 && RDFTypeTrimmed.indexOf(
      "rdf-schema") >= 0)
    return "rdfs:Class";
  else if (RDFTypeTrimmed.indexOf("owl") >= 0)
    return "owl:" + RDFTypeTrimmed.substring(RDFTypeTrimmed.lastIndexOf(
          '#') +
        1);
  else if (RDFTypeTrimmed.indexOf("rdf-schema") >= 0)
    return "rdfs:" + RDFTypeTrimmed.substring(RDFTypeTrimmed.lastIndexOf(
          '#') +
        1);
  else if (RDFTypeTrimmed.indexOf("22-rdf-syntax-ns") >= 0)
    return "rdf:" + RDFTypeTrimmed.substring(RDFTypeTrimmed.lastIndexOf(
          '#') +
        1);
  else if (RDFType.includes("foaf"))
    return "foaf:" + trim(RDFType);
  else
    return trim(RDFType);
}


function uniquefileNames(array) {
  var out = [];
  var sl = array;

  for (var i = 0, l = sl.length; i < l; i++) {
    var unique = true;
    for (var j = 0, k = out.length; j < k; j++) {
      if (sl[i] !== undefined)
        if (sl[i].toLowerCase() === out[j].toLowerCase()) {
          unique = false;
      }
    }
    if (unique) {
      out.push(sl[i]);
    }
  }
  return out;
}

// sort name of files
function SortFiles(x, y) {
  return ((x.toLowerCase() == y.toLowerCase()) ? 0 : ((x.toLowerCase() >
  y.toLowerCase()) ? 1 : -1));
}


var treeData = [];
// loop to find the classes
function SortConcepts(x, y) {
  return ((x.concept.toLowerCase() == y.concept.toLowerCase()) ?
    0 : ((x.concept.toLowerCase() > y.concept.toLowerCase()) ?
      1 : -1));
}


// filter external classes
function filterExternalConcept(RDFObjects) {
  var out = [];
  var data = [];
  for (var i = 0, j = 0, l = RDFObjects.length; i < l; i++) {
    if (typeof (RDFObjects[i].object) != "undefined") {
      data[j] = RDFObjects[i].object;
      j++;
    }
  }
  for (var i = 0, l = data.length; i < l; i++) {
    var unique = true;
    for (var j = 0, k = out.length; j < k; j++) {
      if (data[i] === out[j])
        unique = false;
    }
    if (unique) {
      out.push(data[i]);
    }
  }
  return out;
}

// translation of concept to URI
function findURI(array, item) {
  var i = 0;
  while (array[i].concept != item) {
    i++;
  }
  return array[i].URI;
}


router.get(['/', '/:instanceID/:branchName'], function(req, res) {
  if (!req.session.isAuthenticated && req.app.locals.authRequired)
    res.render('login', {
      title: 'login'
    });
  else {
    var RDFObjectsPlusURI = [],
      appdata = [],
      OWLIndividuals = [],
      filesArray = [],
      SKOSConcepts = [],
      SKOSObjectsPlusURI = [];
    console.log(
      "|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||"
    );
    console.log(req.originalUrl);
    console.log(req.params.instanceID);
    console.log(req.params.branchName);
    console.log(
      "|||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||||"
    );

    //////////////////////////////////////////////////////////
    ////  Start working for namedGraphsString4Qurery
    //////////////////////////////////////////////////////////
    // query to fuseki to getAllNamedGraphs
    request.get({
      headers: {
        'Accept': 'application/sparql-results+json;charset=UTF-8'
      },
      url: endpoint + '?query=' + allNamedGraphsQuery
    }, function(error, response, data) {
      if (!error && response.statusCode == 200) {
        var list = [],
          namedGraphsString4Qurery = "";
        // Show the HTML for the Google homepage.
        if (data != null) {
          data = JSON.parse(data)

          var graphs = data.results.bindings;
          //console.log(graphs);
          if (graphs[0] != null) {
            for (var i = 0; i < graphs.length; i++) {
              list.push(graphs[i]["g"].value);
            }
            var namedGraphsList4Qurery = [];
            for (var i in list) {
              console.log(list[i] + "\n");
              // filter with the current ontology name and branchName
              if (list[i].includes('vocol/master/')) {
                namedGraphsString4Qurery += "from named <" + list[i] +
                  ">\n";
                filesArray.push(list[i].split('vocol/master/')[
                  1])
              }
            }
            filesArray.sort(SortFiles);
            filesArray = uniquefileNames(
              filesArray);
          }
        }
      }
      res.render(
        'documentation', {
          title: 'Documentation',
          data: '[]',
          fileNames: filesArray,
          allRDFObjects: '[]',
          allSKOSObjects: '[]',
          SKOSData: '[]',
          RDFObjectsPlusURI: '[]',
          SKOSObjectsPlusURI: '[]',
          OWLIndividuals: '[]',
          fromNamedGraphs: namedGraphsString4Qurery,
          emptyData: false
        });
    })
    //
    // execQuery(childParentRelationQuery(
    //   namedGraphsString4Qurery
    //     .replace(
    //       /named/g, '')), "childParent")
    //   .then(function(childParentData) {
    //     console.log('1')
    //     execQuery(RDFSConceptsQuery(
    //       namedGraphsString4Qurery), "RDFConcepts",
    //       childParentData)
    //       .then(function(data) {
    //         appdata = data;
    //         appdata.sort(SortConcepts);
    //         appdata = appdata.filter((li, idx, self) => self.map(itm => itm.concept).indexOf(li
    //             .concept) ===
    //           idx)
    //         console.log('2')
    //         execQuery(RDFSObjectsQuery(
    //           namedGraphsString4Qurery),
    //           "RDFObjects")
    //           .then(function(data) {
    //             RDFObjectsPlusURI = data;
    //             console.log('3')
    //             execQuery(individualsQuery(
    //               namedGraphsString4Qurery),
    //               "Individuals")
    //               .then(function(data) {
    //                 OWLIndividuals = data;
    //                 console.log('4')
    //                 execQuery(SKOSConceptsQuery1(
    //                   namedGraphsString4Qurery),
    //                   "SKOSBroaders")
    //                   .then(function(data) {
    //                     SKOSConcepts = data;
    //                     console.log('5')
    //                     execQuery(
    //                       SKOSConceptsQuery2(
    //                         namedGraphsString4Qurery
    //                       ),
    //                       "SKOSNarrowers",
    //                       SKOSConcepts)
    //                       .then(function(data) {
    //                         SKOSConcepts = data
    //                           .concat(
    //                             SKOSConcepts);
    //                         console.log('6')
    //                         execQuery(
    //                           SKOSObjectsQuery(
    //                             namedGraphsString4Qurery
    //                           ),
    //                           "SKOSObjects")
    //                           .then(function(
    //                             data) {
    //                             SKOSObjectsPlusURI = data;
    //                             console.log(
    //                               '7')

    //var allRDFObjects = filterExternalConcept(
    //  RDFObjectsPlusURI);
    // var allSKOSObjects = filterExternalConcept(
    // SKOSObjectsPlusURI);

    //                         })
    //
    //                     })
    //                 })
    //             })
    //         })
    //     })
    // })
    //   .catch(function(reason) {
    //     console.log('reason for rejection', reason)
    //   });
    // }

  // var filePath = 'jsonDataFiles/RDFSConcepts.json'
  // fs.exists(filePath, function(exists) {
  //   if (exists) {
  //     (function clearRequireCache() {
  //       Object.keys(require.cache).forEach(
  //         function(key) {
  //           delete require.cache[key];
  //         })
  //     })();
  //
  //
  //     // console.log("RDFConceptsJson");
  //     // console.log(RDFConceptsJson);
  //     // var appdata = JSON.stringify(getInput(
  //     //   namedGraphsString4Qurery, generateRDFConcepts
  //     // ));
  //     // console.log("appdata");
  //     // console.log(appdata);
  //     // var RDFObjectsPlusURI =
  //     // //generateRDFObjects(
  //     // //  namedGraphsString4Qurery);
  //     // require(
  //     //   '../jsonDataFiles/RDFSObjects.json');
  //     // var OWLIndividuals = //generateIndividuals(
  //     // //namedGraphsString4Qurery);
  //     // require(
  //     //   '../jsonDataFiles/OWLIndividuals.json');
  //     // //TODO:do for skos
  //     // var SKOSData = require(
  //     //   '../jsonDataFiles/SKOSConcepts.json');
  //     // var SKOSObjectsPlusURI = require(
  //     //   '../jsonDataFiles/SKOSObjects.json');
  //     //
  //     //
  //     // console.log(appdata);
  //     // // Call Sort By Name
  //     // appdata.sort(SortConcepts);
  //     // appdata = uniqueConcepts(appdata);
  //     // appdata.forEach(function(item) {
  //     //   treeData = treeData.concat(item);
  //     // });
  //     //
  //     // var concepts = [];
  //     // var allRDFObjects = filterExternalConcept(
  //     //   RDFObjectsPlusURI);
  //     // var allSKOSObjects = filterExternalConcept(
  //     //   SKOSObjectsPlusURI);
  //
  //   // res.render('documentation', {
  //   //   title: 'Documentation',
  //   //   data: treeData,
  //   //   fileNames: filesArray,
  //   //   allRDFObjects: allRDFObjects,
  //   //   allSKOSObjects: allSKOSObjects,
  //   //   SKOSData: SKOSData,
  //   //   RDFObjectsPlusURI: RDFObjectsPlusURI,
  //   //   SKOSObjectsPlusURI: SKOSObjectsPlusURI,
  //   //   OWLIndividuals: OWLIndividuals,
  //   //   emptyData: false
  //   // });
  //   } else {
  //     res.render('documentation', {
  //       title: 'Documentation',
  //       data: null,
  //       fileNames: null,
  //       allRDFObjects: null,
  //       allSKOSObjects: null,
  //       SKOSData: null,
  //       RDFObjectsPlusURI: null,
  //       SKOSObjectsPlusURI: null,
  //       OWLIndividuals: null,
  //       emptyData: true
  //     });
  //   }
  //       });
  //   }
  // } else {
  //   console.log(response.statusCode)
  //   console.warn(error);
  //   return null;
  //   }
  // });
  }
});


module.exports = router;
