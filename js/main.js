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
  enableDownloadLink();
}

function enableDownloadLink() {
  var buildingObj = exportToObj()

  var exportA = document.getElementById('exportA');
  exportA.className = "";
  exportA.download = 'tile.obj';

  var blob = new Blob([buildingObj], {type: 'text'});
  var url = URL.createObjectURL(blob);
  exportA.href = url;

  document.getElementById('loading-bar').style.display = "none";
}


function init3d() {

  /// Global : renderer
  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setClearColor( "0xb0b0b0" );
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
  var light = new THREE.DirectionalLight( 0xffffff );
  light.position.set( 0.55, 0.8, 1.0 ).normalize();
  scene.add( light );

  /// ambient light
  var ambientLight = new THREE.AmbientLight(0x404040);
  scene.add( ambientLight );
}

function fetchData(lon, lat) {
  document.getElementById('loading-bar').style.display = "block";
  var buildings = [];
  var heights = [];

  scene.remove(buildingGroup);

  var lon = parseFloat(lon);//-74.0059700;
  var lat = parseFloat(lat);//40.7142700;

  var projection = d3.geo.mercator()
    .center([lon, lat])
    .scale([6000000])
    .precision(.0);


  var path = d3.geo.path().projection(projection);

  // this is the part converting d3 path to three shape

  var requestLon = long2tile(lon,  16);
  var requestLat = lat2tile(lat , 16);
  var key = "vector-tiles-xaDJOzg";
  var dataKind = "earth,water,buildings"
  var zoomLevel = "16";

  var baseurl = "http://vector.mapzen.com/osm/"+dataKind+"/"+zoomLevel+"/"+requestLon + "/" + requestLat + ".json?api_key="+key;

  d3.json(baseurl, function(err,json) {
    if(err) console.log('err!');
    else {
      console.log(json);
      for(obj in json){
        for(j = 0; j< json[obj].features.length; j++) {
          var geoFeature = json[obj].features[j];
          var properties = geoFeature.properties;
          var feature = path(geoFeature);
          // 'a' command is not implemented in d3-three, skipiping for now.
          if(feature.indexOf('a') > 0) console.log('wooh there is dangerous command here');
          else {
            var mesh = transformSVGPathExposed(feature);
            buildings.push(mesh);
            var h = geoFeature.properties["height"] || 1;
            heights.push(h);
          }
        }
      }

      var obj = {};
      obj.paths = buildings;
      obj.amounts = heights;

      buildingGroup = new THREE.Group();
      scene.add( buildingGroup );
      addGeoObject( buildingGroup, obj );
    }
  });
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
    var inputLon = document.getElementById('lon').value;
    var inputLat = document.getElementById('lat').value;
    fetchData(inputLon, inputLat);
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

//shold check it will work
function tile2long(tileLon, zoom) {
  return (tile*360/Math.pow(2,zoom));
}

function tile2lat(tileLat, zoom) {
  return (360/Math.PI) * Math.atan(Math.pow( Math.E, (Math.PI - 2*Math.PI*tileLat/(Math.pow(2,zoom)))))-90
}

//L = (360 / PI) * atan(e^(PI - 2 * PI * Y / (2 ^ Z))) - 90
