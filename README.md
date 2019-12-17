## VoColDoco

**[To run web server]**
```
npm start 
```

**[To run Sparql Endpoint]**
```
cd helper/tools/apache-jena-fuseki/
./fuseki-server --loc=db --update /dataset
```
**[To insert data to Sparql Endpoint (Simple way)]**
```
cd helper/tools/apache-jena-fuseki/
./bin/s-put http://localhost:3030/dataset ((vocol/master/{filename.ttl})==> it is the graph name) {filename.ttl with its path}
As an example, check this {./bin/s-put http://localhost:3030/dataset vocol/master/repoFolder2/Vehicle.ttl  ../../../../repoFolder2/Vehicle.ttl} 
```
**[To delete data to Sparql Endpoint (Simple way)]**
```
./bin/s-delete http://localhost:3030/dataset {graph name}
An example from the previous command:
{./bin/s-delete http://localhost:3030/dataset http://localhost:3030/dataset/vocol/master/repoFolder2/Vehicle.ttl}
```
