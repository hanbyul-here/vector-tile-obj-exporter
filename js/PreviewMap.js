var PreviewMap = (function(_projection) {

  var width,height;
  var svg;


  function init() {

    width = 42;
    height = 42;

    svg = d3.select('#svg-preview-map')
            .append('svg')
            .attr('width',width)
            .attr('height',height);
  }

  function drawData(feature) {

    svg.append('path')
      .attr('class','preview-path')
      .attr('d', feature);
  }

  function destroy() {
    svg.selectAll('*').remove();
  }

  init();

  return {
    drawData: drawData,
    destroy: destroy
  }
})();