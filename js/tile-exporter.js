var TileExporter = (function() {

  var renderer;
  var scene, camera, controls, buildingGroup, exporter;

  var tileLon, tileLat;

  var config = {
    baseURL: "http://vector.mapzen.com/osm",
    dataKind: "earth,water,buildings",
    vectorTileKey: "vector-tiles-xaDJOzg",
    fileFormat: "json",
    zoomLevel: "16"
  }

  function initScene() {

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


    /// direct light
    var light = new THREE.DirectionalLight( 0xffffff );
    light.position.set( 0.55, 0.8, 1.0 ).normalize();
    scene.add( light );

    /// ambient light
    var ambientLight = new THREE.AmbientLight(0x404040);
    scene.add( ambientLight );

    //obj exporter
    exporter = new THREE.OBJExporter ();

    //orbit control
    controls = new THREE.OrbitControls( camera, renderer.domElement );
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.enableZoom = false;

    //attach renderer to DOM
    document.body.appendChild( renderer.domElement );
    //initiating animate of rendere at the same time
    animate();
  }


  function animate() {
    requestAnimationFrame( animate );
    controls.update();
    renderer.render( scene, camera );
  }

  function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
  }

  function attachEvents() {
    var exportBtn = document.getElementById('exportBtn');

    exportBtn.addEventListener( 'click', function() {
      var inputLon = document.getElementById('lon').value;
      var inputLat = document.getElementById('lat').value;
      fetchTheTile(buildQueryURL(inputLon, inputLat));
    });

    var upBtn = document.getElementById('go-up');
    var downBtn = document.getElementById('go-down');
    var leftBtn = document.getElementById('go-left');
    var rightBtn = document.getElementById('go-right');

    upBtn.addEventListener('click', function() {
      navigateTile('ver',-1)
    });
    downBtn.addEventListener('click', function() {
      navigateTile('ver',1)
    });

    leftBtn.addEventListener('click', function() {
      navigateTile('hoz',-1)
    });
    rightBtn.addEventListener('click', function() {
      navigateTile('hoz',1)
    });

    window.addEventListener( 'resize', onWindowResize, false );

    //check query string
    checkQueries();
  }

  function checkQueries() {
    var lon = getParameterByName('lon');
    var lat = getParameterByName('lat');
    if(lon !== null && lat !== null) {
      fetchTheTile(buildQueryURL(lon,lat));
      document.getElementById('lat').value = lat;
      document.getElementById('lon').value = lon;
    }
  }

  function navigateTile(direction, directionNum) {

    if(direction === 'hoz') {
      tileLon += directionNum;
    } else {
      tileLat += directionNum;
    }
    var callURL =  config.baseURL + '/' + config.dataKind + '/' + config.zoomLevel + '/' + tileLon + '/' + tileLat + '.' + config.fileFormat + '?api_key=' + config.vectorTileKey;

    fetchTheTile(callURL);

    var centerLon = tile2Lon(tileLon, config.zoomLevel);
    var centerLat = tile2Lat(tileLat, config.zoomLevel);

    updateQueryString({
      'lon': centerLon,
      'lat': centerLat
    })

    document.getElementById('lat').value = centerLat;
    document.getElementById('lon').value = centerLon;

  }

  function buildQueryURL(lon, lat) {

    var inputLon = parseFloat(lon);//-74.0059700;
    var inputLat = parseFloat(lat);//40.7142700;

    updateQueryString({
      'lon': inputLon,
      'lat': inputLat
    });

    //falttening geocode by converting them to mercator tile nums
    tileLon = long2tile(inputLon, config.zoomLevel);
    tileLat = lat2tile(inputLat , config.zoomLevel);

    var callURL =  config.baseURL + '/' + config.dataKind + '/' + config.zoomLevel + '/' + tileLon + '/' + tileLat + '.' + config.fileFormat + '?api_key=' + config.vectorTileKey;
    return callURL;
  }

  function fetchTheTile(callURL) {

    setLoadingBar(true);

    var buildings = [];
    var heights = [];

    //get rid of current Tile from scene if there is any
    scene.remove(buildingGroup);


    //get lon/lat for mercator tile num
    var centerLon = tile2Lon(tileLon, config.zoomLevel);
    var centerLat = tile2Lat(tileLat, config.zoomLevel);


    var projection = d3.geo.mercator()
      .center([centerLon, centerLat])
      .scale([6000000])
      .precision(.0);


    var path = d3.geo.path().projection(projection);

    // converting d3 path(svg) to three shape
    //converting geocode to mercator tile nums

    d3.json(callURL, function(err,json) {
      if(err) console.log('err!');
      else {
        for(obj in json) {
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
        buildingGroup.translateX(-window.innerWidth);
        buildingGroup.translateY(-window.innerHeight/2);
        scene.add( buildingGroup );
        addGeoObject(obj);
      }
      setLoadingBar(false);
    });
  }

  function addGeoObject(svgObject) {

    var path, material, amount, simpleShapes, simpleShape, shape3d, toAdd, results = [];

    var thePaths = svgObject.paths;
    var theAmounts = svgObject.amounts;


    var color = new THREE.Color("#5c5c5c");

    material = new THREE.MeshLambertMaterial({
      color: color,
      ambient: color,
      emissive: color,
    });

    var i,j;

    for (i = 0; i < thePaths.length; i++) {
      amount = theAmounts[i];
      simpleShapes = thePaths[i];//path.toShapes(true);
      len1 = simpleShapes.length;

      //adding all the buildings to the group!
      for (j = 0; j < len1; ++j) {

        simpleShape = simpleShapes[j];
        shape3d = simpleShape.extrude({
          amount: amount,
          bevelEnabled: false
        });

        var mesh = new THREE.Mesh(shape3d, material);
        mesh.rotation.x = - Math.PI*1/2;
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
  }

  function exportToObj () {
    var exporter = new THREE.OBJExporter ();
    var result = exporter.parse (scene);
    return result;
  }


  function updateQueryString(paramObj) {
    var url = window.location.origin + window.location.pathname;
    var newUrl = url + '?';
    var params = [];
    for(key in paramObj) {
      params.push(encodeURIComponent(key) + "=" + encodeURIComponent(paramObj[key]));
    }
    newUrl += params.join("&");
    window.history.replaceState({},'',newUrl);
  }

  function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
  }

  function setLoadingBar(on) {
    if(on) document.getElementById('loading-bar').style.display = 'block';
    else document.getElementById('loading-bar').style.display = 'none';
  }

  initScene();
  attachEvents();

})();

////here all maps spells are!
//convert lat/lon to mercator style number
function long2tile(lon,zoom) {
  return (Math.floor((lon+180)/360*Math.pow(2,zoom)));
}
function lat2tile(lat,zoom)  {
  return (Math.floor((1-Math.log(Math.tan(lat*Math.PI/180) + 1/Math.cos(lat*Math.PI/180))/Math.PI)/2 *Math.pow(2,zoom)));
}

//shold check it will work
function tile2Lon(tileLon, zoom) {
  return (tileLon*360/Math.pow(2,zoom)-180);
}

function tile2Lat(tileLat, zoom) {
  return ((360/Math.PI) * Math.atan(Math.pow( Math.E, (Math.PI - 2*Math.PI*tileLat/(Math.pow(2,zoom)))))-90);
}

//L = (360 / PI) * atan(e^(PI - 2 * PI * Y / (2 ^ Z))) - 90
