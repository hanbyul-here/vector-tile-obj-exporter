/// Part from g0v/twgeojson
/// Graphic Engine and Geo Data Init Functions

function exportToObj () {
	var exporter = new THREE.OBJExporter ();
	var result = exporter.parse (scene);
	return result;
	//floatingDiv.style.display = 'block';
	//floatingDiv.innerHTML = result.split ('\n').join ('<br />');
}


var addGeoObject = function( group, svgObject ) {

	var i,j, len, len1;
	var path, mesh, color, material, amount, simpleShapes, simpleShape, shape3d, x, toAdd, results = [];
	var thePaths = svgObject.paths;
	var theAmounts = svgObject.amounts;
	var theColors = svgObject.colors;
	var theCenter = svgObject.center;

	len = thePaths.length;
	for (i = 0; i < len; ++i) {

		color = new THREE.Color("#5c5c5c");
		material = new THREE.MeshLambertMaterial({
			color: color,
			ambient: color,
			emissive: color,
		});
		amount = theAmounts[i];
		simpleShapes = thePaths[i];//path.toShapes(true);
		len1 = simpleShapes.length;

		for (j = 0; j < len1; ++j) {

			simpleShape = simpleShapes[j];
			shape3d = simpleShape.extrude({
				amount: amount,
				bevelEnabled: false
			});
			mesh = new THREE.Mesh(shape3d, material);

			//mesh.translateZ( - amount - 1);
			//mesh.translateX( theCenter.x*0.5);
			//mesh.translateY( -theCenter.y*0.5);
			mesh.rotation.x = -Math.PI*1/2;
			//mesh.rotation.x = Math.PI*1/2;
			//mesh.rotation.z = Math.PI/2;
			group.add(mesh);
		}
	}
};

var init3d = function(){

	/// Global : renderer
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0xb0b0b0 );
	renderer.setSize( 800, 500 );

	/// Global : scene
	scene = new THREE.Scene();

	/// Global : camera
	camera = new THREE.PerspectiveCamera( 20, window.innerWidth / window.innerHeight, 1, 1000000 );
	camera.position.set(2000, 1000, 1300 );
	camera.lookAt(new THREE.Vector3(0,0,0))


	/// Global : group
	group = new THREE.Group();
	scene.add( group );

	/// direct light
	var light = new THREE.DirectionalLight( 0xcecece );
	light.position.set( 0.55, 0.8, 1.0 ).normalize();
	scene.add( light );

	/// ambient light
	var ambientLight = new THREE.AmbientLight(0x404040);
	scene.add( ambientLight );

	// SKYDOME

	var hemiLight = new THREE.HemisphereLight( 0xcecece, 0xcecece, 1.1 );
	hemiLight.color.setHSL( 0.65, 0.7, 0.15 );
	hemiLight.groundColor.setHSL( 0.0, 0.0, 0.7 );
	hemiLight.position.y = 1500;
	scene.add( hemiLight );

	var vertexShader = document.getElementById( 'vertexShader' ).textContent;
	var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
	var uniforms = {
			topColor: 	 { type: "c", value: new THREE.Color( 0x0077ff ) },
			bottomColor: { type: "c", value: new THREE.Color( 0xffffff ) },
			offset:		 { type: "f", value: 400 },
			exponent:	 { type: "f", value: 0.6 }
	}
	uniforms.topColor.value.copy( hemiLight.color );

	//scene.fog.color.copy( uniforms.bottomColor.value );

	var skyGeo = new THREE.SphereGeometry( 4000, 32, 15 );
	var skyMat = new THREE.ShaderMaterial( {
		uniforms: uniforms,
		vertexShader: vertexShader,
		fragmentShader: fragmentShader,
		side: THREE.BackSide
	});

	var sky = new THREE.Mesh( skyGeo, skyMat );
//	group.add( sky );


	// GROUND

	var groundGeo = new THREE.PlaneBufferGeometry( 1000, 1000 );
	var groundMat = new THREE.MeshPhongMaterial( { ambient: 0xffffff, color: 0xffffff, specular: 0x050505 } );
	groundMat.color.setHSL( 0.095, 0.0, 0.75 );

	var ground = new THREE.Mesh( groundGeo, groundMat );
		ground.position.x = 500;

	ground.rotation.x = -Math.PI/2;
	ground.position.y = 0;

	group.add( ground );

	var buildings = [];
	var heights = [];

	//this is hard-coded. need better projection strategy.

	var width = 800,
    height = 500;

	// var projection = d3.geo.albersUsa()
 //                       .translate([-width*2869.5, height*591.3])
 //                       .scale([10000000]);


var projection = d3.geo.mercator()
    .center([-74.0059700, 40.7142700])
//    .translate([width/2, height/2])
    .scale([6000000])
    .precision(.0);


	var path = d3.geo.path().projection(projection);

	// this is the part converting d3 path to three shape

  var requestLon = long2tile(-74.0059700,  16);
  var requestLat = lat2tile(40.7142700 , 16);
  var key = "vector-tiles-xaDJOzg";
  //console.log(requestLon);
  //console.log(requestLon);

  var baseurl = "http://vector.mapzen.com/osm/all/16/"+requestLon + "/" + requestLat + ".json?api_key="+key;

	d3.json(baseurl, function(json) {
	  for(i = 0; i < json.buildings.features.length; i++){
	    var geoFeature = json.buildings.features[i];
	    var properties = geoFeature.properties;
	    var feature = path(geoFeature);
	    if(feature.indexOf('a') > 0) console.log('wooh there is dangerous command here');
	    else {
	    	var mesh = transformSVGPathExposed(feature);
				buildings.push(mesh);
				heights.push(geoFeature.properties["height"]);
	    }
	  }

	  	var obj = {};
	  	obj.paths = buildings;
	  	obj.amounts = heights;
	  	obj.center = {x:0, y:0};

		addGeoObject( group, obj );
	});

	//group.translateZ(400);
	//group.translateX(-100);

	}
/*
	d3.json("another.json",function(json){

	  for(i = 0; i < json.features.length; i++){
	    var geoFeature = json.features[i];
	    var properties = geoFeature.properties;
	    var feature = path(geoFeature);
	    if(feature.indexOf('a') > 0) console.log('wooh there is dangerous command here');
	    else {
	    	var mesh = transformSVGPathExposed(feature);
				buildings.push(mesh);
				heights.push(json.features[i].properties["height"]);
	    }

	  }

	  	var obj = {};
	  	obj.paths = buildings;
	  	obj.amounts = heights;
	  	obj.center = {x:800, y:500};

		addGeoObject( group, obj );
	});

	group.translateZ(400);
	group.translateX(-100);


	//addGeoObject( group, obj );

};
*/

	/// Events from extrude shapes example

	function onWindowResize() {

		windowHalfX = window.innerWidth / 2;
		windowHalfY = window.innerHeight / 2;

		camera.aspect = window.innerWidth / window.innerHeight;
		camera.updateProjectionMatrix();

		renderer.setSize( window.innerWidth, window.innerHeight );
	};

	function onDocumentMouseDown( event ) {

		event.preventDefault();

		document.addEventListener( 'mousemove', onDocumentMouseMove, false );
		document.addEventListener( 'mouseup', onDocumentMouseUp, false );
		document.addEventListener( 'mouseout', onDocumentMouseOut, false );

		mouseXOnMouseDown = event.clientX - windowHalfX;
		targetRotationOnMouseDown = targetRotation;
	};

	function onDocumentMouseMove( event ) {

		mouseX = event.clientX - windowHalfX;

		 targetRotation = targetRotationOnMouseDown + ( mouseX - mouseXOnMouseDown ) * 0.02;

	};

	function onDocumentMouseUp( event ) {

		document.removeEventListener( 'mousemove', onDocumentMouseMove, false );
		document.removeEventListener( 'mouseup', onDocumentMouseUp, false );
		document.removeEventListener( 'mouseout', onDocumentMouseOut, false );
	};

	function onDocumentMouseOut( event ) {

		document.removeEventListener( 'mousemove', onDocumentMouseMove, false );
		document.removeEventListener( 'mouseup', onDocumentMouseUp, false );
		document.removeEventListener( 'mouseout', onDocumentMouseOut, false );
	};

	function onDocumentTouchStart( event ) {

		if ( event.touches.length == 1 ) {

			event.preventDefault();

			mouseXOnMouseDown = event.touches[ 0 ].pageX - windowHalfX;
			targetRotationOnMouseDown = targetRotation;
		}
	};

	function onDocumentTouchMove( event ) {

		if ( event.touches.length == 1 ) {

			event.preventDefault();

			mouseX = event.touches[ 0 ].pageX - windowHalfX;
			targetRotation = targetRotationOnMouseDown + ( mouseX - mouseXOnMouseDown ) * 0.05;
		}
	};

	function animate() {

		/// compatibility : http://caniuse.com/requestanimationframe
		requestAnimationFrame( animate );
		controls.update();
		render();

	};

	function render() {

		group.rotation.y += ( targetRotation - group.rotation.y ) * 0.01;
		renderer.render( scene, camera );
	};

	/// Main

	var renderer, stats;
	var scene, camera, group;

	var targetRotation = 0;
	var targetRotationOnMouseDown = 0;

	var mouseX = 0;
	var mouseXOnMouseDown = 0;

	var windowHalfX = window.innerWidth / 2;
	var windowHalfY = window.innerHeight / 2;

	var container = document.createElement( 'div' );
	document.body.appendChild( container );

	init3d();

	container.appendChild( renderer.domElement );

	var controls = new THREE.OrbitControls( camera, renderer.domElement );
	//controls.addEventListener( 'change', render ); // add this only if there is no animation loop (requestAnimationFrame)
	controls.enableDamping = true;
	controls.dampingFactor = 0.25;
	controls.enableZoom = false;

	//document.addEventListener( 'mousedown', onDocumentMouseDown, false );
	//document.addEventListener( 'touchstart', onDocumentTouchStart, false );
	//document.addEventListener( 'touchmove', onDocumentTouchMove, false );
	window.addEventListener( 'resize', onWindowResize, false );

	animate();


window.onload = function() {

	var exportBtn = document.getElementById('exportBtn');
	var buildingObj;
	exportBtn.addEventListener( 'click', function() { buildingObj = exportToObj ();
		var exportA = document.getElementById('exportA');
	exportA.download = 'test.obj';

  var blob = new Blob([buildingObj], {type: 'text'});
  var url = URL.createObjectURL(blob);
  exportA.href = url;});
}

 function long2tile(lon,zoom) {
  return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
}
 function lat2tile(lat,zoom)  {
  return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
}
