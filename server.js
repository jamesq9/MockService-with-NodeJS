var express = require('express');
var app = express();
var fs = require("fs");
var bodyParser = require('body-parser');
var xml2js = require('xml2js');
var parser = new xml2js.Parser();

var server;
var makeChanges = true;
var services = [];
var servicesMetaData = [];
var db;
var dbLocation = 'db/db.json';

app.use(bodyParser.raw({inflate: true,limit: '300mb',type:'*/*'}));
app.use(bodyParser.urlencoded({limit: '300mb', extended: true}));


app.use(express.static('public'));
 


function getUpdateDB() {
	services = [];
	servicesMetaData = []; 
	db = {};
	try {
		db = JSON.parse(fs.readFileSync(dbLocation,'utf8'));
	} catch(e) {
		fs.copyFile(dbLocation, 'db/db_'+new Date().getTime()+'.json', (err) => { if (err) throw err; console.log('copyDone'); });
		db = {};
		db["services"] = [];
		db["serviceDetails"] = {};
		fs.writeFileSync(dbLocation, JSON.stringify(db));
	}
	var k;
	for(k in db["services"]) {
		var name = db["services"][k];
		services.push(name);
		var obj = {};
		obj["n"] = name;
		try {
			obj["d"] = db["serviceDetails"][name]["desc"];
		} catch(e) {
			obj["d"] = "";
			console.log('#getUpdateDB');
			console.log(e);
		} 
		servicesMetaData.push(obj);
	}
}


function logAll() {
	console.log(db);
	console.log(services);
	console.log(servicesMetaData);
}

function updateDB() {
	fs.writeFileSync(dbLocation, JSON.stringify(db));
	getUpdateDB();
}


app.all('/api/getService', function(req,res) {
	var name = JSON.parse(req.body).name;
	var returnData = {};	
	if(name != '' && services.indexOf(name) != -1) {
		returnData = db.serviceDetails[name];
	}
	res.end(JSON.stringify(returnData));
});

app.all('/api/addService', function(req,res) {
	
	var returnData = {};
	
	
	if(makeChanges) {
		makeChanges = false;
	} else {
		returnData.tryAgain = true;
		res.end(JSON.stringify(returnData));
		makeChanges = true;
		return;
	}
	try {
		
		var serviceName = JSON.parse(req.body).name;
		
		if( serviceName.length == 3 && serviceName.startsWith('api')) {
			returnData["rc"] = false;
			returnData["message"] = 'Service Name can not start with api';
			res.end(JSON.stringify(returnData));
			makeChanges = true;
			return;
		} 
		
		if( serviceName.length == 0) {
			returnData["rc"] = false;
			returnData["message"] = 'Service Name Lenght should be greater than 0';
			res.end(JSON.stringify(returnData));
			makeChanges = true;
			return;
		}
		
		if( services.indexOf(serviceName) != -1) {
			returnData["rc"] = false;
			returnData["message"] = 'Service Already Exists';
			res.end(JSON.stringify(returnData));	
			makeChanges = true;
			return;
		}
		
		var details = {};
		logAll();
		db.services.push(serviceName);
		details["version"] = 0;
		details["name"] = serviceName;
		details["desc"] = "Service Yet to be Configured.";
		details["requestType"] = 'raw';
		details["responseType"] = 'raw';
		details["resposeBody"] = [{
					"loadCondition":"true",
					"responseStatus":"200",
					"bodyTemplate": "$P(1)",
					"params": {"$P(1)":"mock service"}
		}];
		
		
		db.serviceDetails[serviceName] = details;
		updateDB();
		returnData["rc"] = true;
		returnData.msg = 'Service added Successfully';
	
	} catch(e) {
		console.log('#/api/addService');
		console.log(e);
	}
	makeChanges = true;
	res.end(JSON.stringify(returnData));
});

app.all('/api/UpdateService', function(req,res) {
	
	var returnData = {};
	
	
	if(makeChanges) {
		makeChanges = false;
	} else {
		returnData.tryAgain = true;
		res.end(JSON.stringify(returnData));
		return;
	}
	try {
		var serviceDetails = JSON.parse(req.body);
		//console.log(serviceDetails);
		var serviceName = serviceDetails.name;
		
		//console.log(db.serviceDetails[serviceName].version, serviceDetails.version);
		if(db.serviceDetails[serviceName].version == serviceDetails.version) {
			db.serviceDetails[serviceName] = serviceDetails;
			db.serviceDetails[serviceName].version += 1;
			updateDB();
			returnData.rc = true;
			returnData.msg = 'Service Updated Successfully';
		} else {
			returnData.rc = false;
			returnData.msg = 'Version Mismatch, refresh and update again!!';
			makeChanges = true;
			return;
		}
	} catch(e) {
		console.log('#/api/addService');
		console.log(e);
	}
	makeChanges = true;
	res.end(JSON.stringify(returnData));
});

app.all('/api/deleteService',function(req,res) {
	var returnData = {};
	var name = JSON.parse(req.body).name;
	//console.log(req.body);
	if(makeChanges) {
		makeChanges = false;
	} else {
		returnData.tryAgain = true;
		res.end(JSON.stringify(returnData));
		return;
	}
	
	if(services.indexOf(name) == -1) {
		returnData.rc = false;
		returnData.msg = "Service '"+name+"' Not Found!!";
		res.end(returnData);
		makeChanges = true;
		return;
	}
	
	
	db["services"].splice(db["services"].indexOf(name), 1);
	delete db["serviceDetails"][name];
	updateDB();
	
	returnData.rc = true;
	returnData.msg = "Service '"+name+"' Deleted!!";
	
	makeChanges = true;
	res.end(JSON.stringify(returnData));
});

app.all('/api/getMetaData',function(req,res) {
	
	var returnData = {};
	returnData["services"] = services;
	returnData["servicesMetaData"] = servicesMetaData;
	res.end(JSON.stringify(returnData));
});

app.all('/ms/:service',function(req,res) {
	var sname = req.params.service;
	if(!db["serviceDetails"][sname]) {
		res.status(500);
		res.end();
		return;
	} 
	
	var $rb = req.body;
	var $rp = req.query;
	var $respBody = '';
	
	//console.log($rb, $rp);
	
	var requestType = db["serviceDetails"][sname]["requestType"];
	
	if(requestType === "json") {
		$rb = JSON.parse($rb);
	}
	
	if(requestType === "xml") {
		$rb = parser.toJson($rb)
	}
	
	if(requestType === "raw") {
		$rb = $rb.toString();
	}
	
	var foundTemplate = false;
	
	var templatesLength = db["serviceDetails"][sname]["resposeBody"].length;
	var myTemplates = db["serviceDetails"][sname]["resposeBody"];
	
	var i = 0 ;
	
	for(i=0; i<templatesLength && !foundTemplate ; i++ ) {
		
		var loadCondition = myTemplates[i]["loadCondition"];
		//console.log(loadCondition);
		var condition = false; 
		try {
			condition = eval(loadCondition);
		} catch(e) {
			console.log(e);
			console.log('#/ms/'+sname);
			console.log('loadCondition: ' + loadCondition);
		}
		
		if(condition) {
			foundTemplate = true;
			$respBody = myTemplates[i]["bodyTemplate"];
			//console.log(myTemplates[i]["params"]);
			for(key in myTemplates[i]["params"]) {
				var value = myTemplates[i]["params"][key];
				try {
					value = eval(value);
				} catch(e) {
					value = myTemplates[i]["params"][key];
				}
				//console.log(key,value,$respBody.includes(key));
				while($respBody.includes(key)) {
					$respBody = $respBody.replace(key,value);
				}
			}
		}
		
		
	} // end-for
	
	
	var responseType = db["serviceDetails"][sname]["responseType"];
	
	if(responseType === "json") {
		 res.contentType('application/json');
	}
	
	if(responseType === "xml") {
		res.contentType('application/xml');
	}
	
	
	
	res.end($respBody);
	return;
	
});

server = app.listen(8089, function () {
	getUpdateDB();
	var host = server.address().address;
	var port = server.address().port;
	console.log("Example app listening at http://%s:%s", host, port)
});

