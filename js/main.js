/// Part from g0v/twgeojson
/// Graphic Engine and Geo Data Init Functions

var addGeoObject = function( bg, svgObject ) {

  var i,j, len, len1;

  var path, mesh, color, material, amount, simpleShapes, simpleShape, shape3d, x, toAdd, results = [];
  var thePaths = svgObject.paths;
  var theAmounts = svgObject.amounts;
  var theColors = svgObject.colors;

  len = thePaths.length;

  color = new THREE.Color("#5c5c5c");
  material = new THREE.MeshLambertMaterial({
    color: color,
    ambient: color,
    emissive: color,
  });

  for (i = 0; i < len; ++i) {
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
      mesh.rotation.x = -Math.PI*1/2;
      buildingGroup.add(mesh);
    }
  }
};

function init3d() {

  /// Global : renderer
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setClearColor( 0xb0b0b0 );
  renderer.setSize( window.innerWidth, window.innerHeight );

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

  //var vertexShader = document.getElementById( 'vertexShader' ).textContent;
  var fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
  var uniforms = {
      topColor:    { type: "c", value: new THREE.Color( 0x0077ff ) },
      bottomColor: { type: "c", value: new THREE.Color( 0xffffff ) },
      offset:    { type: "f", value: 400 },
      exponent:  { type: "f", value: 0.6 }
  }
  uniforms.topColor.value.copy( hemiLight.color );

  // GROUND

  var groundGeo = new THREE.PlaneBufferGeometry( 1000, 1000 );
  var groundMat = new THREE.MeshPhongMaterial( { ambient: 0xffffff, color: 0xffffff, specular: 0x050505 } );
  groundMat.color.setHSL( 0.095, 0.0, 0.75 );

  var ground = new THREE.Mesh( groundGeo, groundMat );
    ground.position.x = 500;

  ground.rotation.x = -Math.PI/2;
  ground.position.y = 0;

  group.add( ground );
}

function fetchData(l, lo) {
  var buildings = [];
  var heights = [];

  console.log(l);
  console.log(lo);


  scene.remove(buildingGroup);


  var lat = parseFloat(l);//-74.0059700;
  var lon = parseFloat(lo);//40.7142700;

  var projection = d3.geo.mercator()
    .center([lat, lon])
    .scale([6000000])
    .precision(.0);


  var path = d3.geo.path().projection(projection);

  // this is the part converting d3 path to three shape

  var requestLat = long2tile(lat,  16);
  var requestLon = lat2tile(lon , 16);
  var key = "vector-tiles-xaDJOzg";

  var baseurl = "http://vector.mapzen.com/osm/buildings/16/"+requestLat + "/" + requestLon + ".json?api_key="+key;

  d3.json(baseurl, function(json) {
    console.log(json);
    for(j = 0; j< json.features.length; j++) {
      var geoFeature = json.features[j];
      var properties = geoFeature.properties;
      var feature = path(geoFeature);
      // 'a' command is not implemented in d3-three, skipiping for now.
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

    buildingGroup = new THREE.Group();
    scene.add( buildingGroup );
    addGeoObject( buildingGroup, obj );
  });


  // var buildingObj = exportToObj()

  // var exportA = document.getElementById('exportA');
  // exportA.download = 'test.obj';

  // var blob = new Blob([buildingObj], {type: 'text'});
  // var url = URL.createObjectURL(blob);
  // exportA.href = url;
}


function onWindowResize() {

  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize( window.innerWidth, window.innerHeight );
};



  function animate() {

    requestAnimationFrame( animate );
    controls.update();
    renderer.render( scene, camera );

  };

  /// Main

  var renderer;
  var scene, camera, group, buildingGroup;

  var container = document.createElement( 'div' );
  document.body.appendChild( container );

  init3d();

  container.appendChild( renderer.domElement );

  var controls = new THREE.OrbitControls( camera, renderer.domElement );
  //controls.addEventListener( 'change', render ); // add this only if there is no animation loop (requestAnimationFrame)
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;
  controls.enableZoom = false;

  animate();

function exportToObj () {
  var exporter = new THREE.OBJExporter ();
  var result = exporter.parse (scene);
  return result;
}

window.onload = function() {

  var exportBtn = document.getElementById('exportBtn');

  exportBtn.addEventListener( 'click', function() {

    var inputLat = document.getElementById('lat').value;
    var inputLon = document.getElementById('lon').value;
    fetchData(inputLat, inputLon);
  });


  window.addEventListener( 'resize', onWindowResize, false );
}

//convert lat/lon to mercator style number
function long2tile(lon,zoom) {
  return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
}
 function lat2tile(lat,zoom)  {
  return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
}
