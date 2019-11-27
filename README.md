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
./bin/s-put http://localhost:3030/dataset vocol/master/{filename.ttl} {filename.ttl with its path}
Example {./bin/s-put http://localhost:3030/dataset vocol/master/repoFolder2/Vehicle.ttl  ../../../../repoFolder2/Vehicle.ttl} 
```
