var express = require('express');
var bodyParser = require('body-parser');
var shell = require('shelljs');
var exec = require('child_process').exec;
var router = express.Router();
var fs = require('fs');
var jsonfile = require('jsonfile');
var http = require('http');
var path = require('path');
var spawn = require('child_process').spawn;
var request = require('request');
let endpoint = "http://localhost:"+ (process.argv[3] || 3030) +"/dataset/"

router.post('/:method', function (req, res) {

  if (req.params.method)
    if (req.params.method == 'update') {

      request.post({
        headers: {
          'Content-Type': ' application/x-www-form-urlencoded'
        },
        url: endpoint + "update?update=" + req.body.query
      }, function (error, response, body) {
        if (error) {
          console.log(error)
          res.json({
            errorThrown: error
          });
          console.warn(error);
        }
        if (!error && response.statusCode == 200) {
          res.json({
            action: 'is done'
          });
        }
      });

    }
  else if (req.params.method == 'get') {


    res.json({
      b: 1
    });

  } else if (req.params.method == 'query') {
    let queryStr = req.body.query;
    if (req.body.hasOwnProperty('default-graph-uri')) {
      let graphs = req.body['default-graph-uri'];
      if (graphs.isArray)
        for (let i in graphs) {
          queryStr += "&default-graph-uri=" + encodeURIComponent(graphs[i]);
        }
      else 
      queryStr += "&default-graph-uri=" + encodeURIComponent(graphs);

    }
    request.post({
      headers: {
        'Accept': 'application/sparql-results+json;charset=UTF-8',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      // data: req.body, 
      url: endpoint + 'query?query=' + queryStr
    }, function (error, response, body) {
      if (error) {
        console.log(error)
        res.json({
          textStatus: response.statusCode,
          errorThrown: error
        });
        console.warn(error);
      }
      if (!error && response.statusCode == 200) {
        res.send(body);
      }
    });
  } else if (req.params.method == 'construct') {
    
    console.log(req.originalUrl)
    let acceptHeader4SourceCode = req.originalUrl.split('?')[1];
    let queryStr = req.body.query;
    if (req.body.hasOwnProperty('default-graph-uri')) {
      let graphs = req.body['default-graph-uri'];
      if (graphs.isArray)
        for (let i in graphs) {
          queryStr += "&default-graph-uri=" + encodeURIComponent(graphs[i]);
        }
      else 
      queryStr += "&default-graph-uri=" + encodeURIComponent(graphs);

    }
    request.post({
      headers: {
        "Accept": acceptHeader4SourceCode,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
      },
      // data: req.body, 
      url: endpoint + 'query?query=' + queryStr
    }, function (error, response, body) {
      if (error) {
        console.log(error)
        res.json({
          textStatus: response.statusCode,
          errorThrown: error
        });
        console.warn(error);
      }
      if (!error && response.statusCode == 200) {
        res.send(body);
      }
    });
  }

});

// router.get('/:method', function (req, res) {
//     console.log(req.body)
//       // call to delete all GraphURIs for one instance
//       request.get({
//         headers: {
//             Accept: 'application/sparql-results+json;charset=UTF-8'
//         },
//         url: endpoint + req.body
//     }, function (error, response, body) {
//           if (error) {
//             console.log(error)
//             res.json({ textStatus: response.statusCode, errorThrown: error });
//             console.warn(error);
//           }
//           if (!error && response.statusCode == 200) {
//               res.send(body);
//           }
//         });


// })


router.get('/:method', function (req, res) {
  request.post({
    headers: {
      Accept: 'application/sparql-results+json;charset=UTF-8'
    },
    url: endpoint + 'query?query=' + req.query.query
  }, function (error, response, body) {
    if (error) {
      console.log(error)
      res.json({
        textStatus: response.statusCode,
        errorThrown: error
      });
      console.warn(error);
    }
    if (!error && response.statusCode == 200) {
      res.send(body);
    }
  });
})

module.exports = router;