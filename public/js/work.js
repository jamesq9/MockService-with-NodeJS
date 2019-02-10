$(document).ready(function() {

	var app = new Vue({
		el: '#myApp',
		data: {
			"message": 'Hello world!!!',
			"editMode": false,
			"quickAdd": '' ,
			"searchService": '',
			"inputs": ["json","xml","text"],
			"services": ["test10","test9","test8","test7","test6"],
			"servicesMetaData" : [   
									{   "n":"test10" , "d":"No Description1No Description1No Description1No Description1No Description1No Description1No Description1No Description1No Description1"},
									{   "n":"test9" , "d":"No Description2"},
									{  "n":"test8" , "d":"No Description3"},
									{  "n":"test7" , "d":"No Description4"},
									{  "n":"test6" , "d":"No Description5"}
								 ],
			"serviceData": {
				"version": "0",
				"name": "test1",
				"desc": "No Description",
				"requestType": "json",
				"responseType": "json",
				"resposeBody": [{
					"loadCondition":"",
					"responseStatus":"200",
					"bodyTemplate": "",
					"params": {"name1":"value1","name2":"value2"}
				}]	
			},
		},
		methods: {
			addService: function() {
				var serviceName = this.quickAdd.trim().toLowerCase();
				//console.log(serviceName,serviceName.length,this.services.indexOf(serviceName),serviceName.localeCompare('api'))
				if(serviceName.length > 0 && this.services.indexOf(serviceName) == -1 && serviceName.localeCompare('api') != 0 ) {
					alertify.warning('Saving...');
					var data = {};
					data["name"]=serviceName;
					axios.post('/api/addService', data)
						 .then( res => {
							 //console.log(res.data);
							 if(res.data.tryAgain) {
								 setTimeout(this.addService, Math.floor((Math.random()*10000)%2000));
								 return;
							 } else {
								 alertify.success("Success!! Service '"+serviceName+"' has been added.");
								 this.updateMetaData();
							 }
						 }).catch(function (error) {
								console.log(error);
						 });
					
				} else {
					if(serviceName.length <= 0)
						alertify.error('Error!! Service Name is empty ');
					else 
						alertify.error("Error!! Service '"+serviceName+"' already exists");
				}
			},
			deleteService: function(name) {
				//console.log(name);
				if(this.services.indexOf(name) != -1) {
					
					alertify.confirm("Are you sure you want to Delete '"+name+"' Service ?",
					  () => {
						alertify.warning('Deleting...');
						data = {};
						data["name"] = name;
						axios.post('/api/deleteService', data)
							 .then( res => {
								 //console.log(res.data);
								 if(res.data.tryAgain) {
									 setTimeout(this.deleteService(name), Math.floor((Math.random()*10000)%2000));
									 return;
								 } else {
									 
									 alertify.success("Success!! Service '"+name+"' has been deleted.");
									 this.updateMetaData();
								 }
							 }).catch(function (error) {
									console.log(error);
							 });
					  },
					  function(){
						alertify.error("Operation Canceled :( , Oh well, if you still need '"+name+"' Service");
					});
					
					
					
				} else {
					alertify.error("Service '"+name+"' Not Found!");
				}
				
			},
			editService: function(name) {
				//console.log(name);
				if(this.services.indexOf(name) != -1) {
					alertify.warning('Going to Edit Mode...');
					data = {};
					data["name"] = name;
					axios.post('/api/getService', data)
						 .then( res => {
							 //console.log(res.data);
							 if(res.data.tryAgain) {
								 setTimeout(this.deleteService(name), Math.floor((Math.random()*10000)%2000));
								 return;
							 } else {
								 this.serviceData = res.data;
								 
								 alertify.success("Service '"+name+"' is in Edit Mode!!");
								 this.editMode = true;
							 }
						 }).catch(function (error) {
								console.log(error);
						 });
				} else {
					alertify.error("Service '"+name+"' Not Found!");
				}
				
			},
			UpdateService: function() {
					alertify.warning('Saving Sevice...');
					axios.post('/api/UpdateService', this.serviceData)
						 .then( res => {
							 //console.log(res.data);
							 if(res.data.tryAgain) {
								 setTimeout(this.UpdateService(), Math.floor((Math.random()*10000)%2000));
								 return;
							 } else if(res.data.rc) {
								 this.serviceData.version += 1;
								 
								 alertify.success(res.data.msg);
							 } else {
								 alertify.error(res.data.msg);
							 }
						 }).catch(function (error) {
								console.log(error);
						 });
			},
			populateParams: function(data) {
				var myArray = this.serviceData.resposeBody[data];
				var myText = myArray["bodyTemplate"];
				var myParamList = myArray["params"];
				
				var startingIndex = 0;
				var endingIndex = 1;
				var param = '';
				
				var myNewParamList = {};
				
				while(  (startingIndex != -1) && (startingIndex = myText.indexOf('$P(',startingIndex)) != -1  ) {
					
					endingIndex = myText.indexOf(')', startingIndex);
					param = myText.substring(startingIndex,endingIndex+1);
					
					if(myParamList[param] === undefined) {
						myNewParamList[param] = '';
					} else {
						myNewParamList[param] = myParamList[param];
					}
					
					startingIndex = endingIndex;
					
				}
				this.serviceData.resposeBody[data]["params"] = myNewParamList;
				
			},
			addTemplate: function() {
				var k = {};
				k["loadCondition"] = "true";
				k["responseStatus"] = "200",
				k["bodyTemplate"] = "$P(1)",
				k["params"] = {"$P(1)":"{}"}
				this.serviceData.resposeBody.push(k);
				//console.log(this.serviceData);
			},
			turnOffEdit: function() {
				this.editMode = false;
			},
			removeTemplate: function(index) {
				this.serviceData.resposeBody.splice(index,1);
			},
			updateMetaData: function() {
				axios.get('/api/getMetaData')
						  .then((res) => {
							  this.services = res.data.services;
							  this.servicesMetaData = res.data.servicesMetaData;
						  });
			}
		},
		computed: {
			filteredServiceMDList() {
				return this.servicesMetaData.filter(val => { return (val.n+' '+val.d).includes( this.searchService); });
			} // end filteredServiceMDList
		} // end computed
	});
	app.updateMetaData();
	$('body').show();

});
