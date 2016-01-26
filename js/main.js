/// Part from g0v/twgeojson
/// Graphic Engine and Geo Data Init Functions

function exportToObj () {
	var exporter = new THREE.OBJExporter ();
	var result = exporter.parse (scene);
	console.log(result);
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

			mesh.translateZ( - amount - 1);
			mesh.translateX( theCenter.x*0.5);
			mesh.translateY( -theCenter.y*0.5);
			mesh.rotation.x = Math.PI*3/2;
			mesh.rotation.z = Math.PI/2;
			group.add(mesh);
		}
	}
};

var init3d = function(){

	/// Global : renderer
	renderer = new THREE.WebGLRenderer( { antialias: true } );
	renderer.setClearColor( 0xb0b0b0 );
	renderer.setSize( window.innerWidth, window.innerHeight );

	/// Global : scene
	scene = new THREE.Scene();

	/// Global : camera
	camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.set( 0, -100, 300 );


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

	var groundGeo = new THREE.PlaneBufferGeometry( 10000, 10000 );
	var groundMat = new THREE.MeshPhongMaterial( { ambient: 0xffffff, color: 0xffffff, specular: 0x050505 } );
	groundMat.color.setHSL( 0.095, 0.0, 0.75 );

	var ground = new THREE.Mesh( groundGeo, groundMat );
	ground.rotation.x = -Math.PI/2;
	ground.position.y = -350;
	group.add( ground );

	var buildings = [];
	var heights = [];

	//this is hard-coded. need better projection strategy.

	var width = 1024,
    height = 1160;

	var projection = d3.geo.albersUsa()
                       .translate([-width*2869.5, height*591.3])
                       .scale([10000000]);

	var path = d3.geo.path().projection(projection);

	// this is the part converting d3 path to three shape

	d3.json("total_.json",function(json){

	  for(i = 0; i < json.features.length; i++){
	    var geoFeature = json.features[i];
	    var properties = geoFeature.properties;
	    var feature = path(geoFeature);

		var mesh = transformSVGPathExposed(feature);
		buildings.push(mesh);
		heights.push(json.features[i].properties["height"]);

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

	var info = document.createElement( 'div' );
	info.style.position = 'absolute';
	info.style.top = '10px';
	info.style.width = '100%';
	info.style.textAlign = 'center';
	container.appendChild( info );

	init3d();

	container.appendChild( renderer.domElement );


	document.addEventListener( 'mousedown', onDocumentMouseDown, false );
	document.addEventListener( 'touchstart', onDocumentTouchStart, false );
	document.addEventListener( 'touchmove', onDocumentTouchMove, false );
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